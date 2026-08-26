import { Request, Response } from "express";
import type { Prisma } from "@prisma/client";
import { prisma } from "../services/prisma";
import { generateCourse, detectLanguage } from "../services/openai.service";

// ============================================================================
// POST /api/courses/generate
// ----------------------------------------------------------------------------
// Instructor-only. Takes a free-text prompt (English or Swahili), sends it
// to the AI service (real OpenAI call or local mock — see
// services/openai.service.ts), and returns a draft course shape that the
// Instructor screen renders as an editable form. Nothing is persisted
// here — persistence happens in saveDraftCourse() below, once the instructor
// has reviewed/edited the AI output. This separation lets instructors
// regenerate freely without creating orphan DB rows.
// ============================================================================
export async function generateCourseDraft(req: Request, res: Response) {
  try {
    const { prompt } = req.body as { prompt?: string };
    if (!prompt || prompt.trim().length < 3) {
      return res.status(400).json({ error: "Please describe the course you want to create." });
    }

    const language = detectLanguage(prompt);
    const draft = await generateCourse(prompt);

    return res.status(200).json({ language, draft });
  } catch (err) {
    console.error("[ai-course-generate] failed:", err);
    return res.status(502).json({ error: "AI course generation failed. Please try again." });
  }
}

// ============================================================================
// POST /api/courses
// ----------------------------------------------------------------------------
// Persists an (AI-generated-then-edited, or fully manual) course as DRAFT.
// Body shape matches GeneratedCourse from openai.service.ts, plus tenantId
// (injected by tenantScope middleware) and instructorId (req.user.id).
//
// Multi-tenancy note: tenantId is taken from req.tenantId (set by
// tenantScope middleware from the authenticated instructor's own User row)
// — NEVER from the request body — so an instructor can never write a
// course into another tenant by tampering with the payload.
// ============================================================================
export async function saveDraftCourse(req: Request, res: Response) {
  const { title, description, learningObjectives, lessons, language } = req.body as {
    title: string;
    description: string;
    learningObjectives: string[];
    language?: string;
    lessons: {
      title: string;
      content: string;
      quiz: { question: string; options: string[]; correctIndex: number }[];
    }[];
  };

  const tenantId = req.tenantId!;
  const instructorId = req.user!.id;

  try {
    const course = await prisma.course.create({
      data: {
        tenantId,
        instructorId,
        title,
        description,
        language: language || "en",
        learningObjectives,
        status: "DRAFT",
        lessons: {
          create: lessons.map((lesson, lessonIndex) => ({
            tenantId,
            title: lesson.title,
            content: lesson.content,
            order: lessonIndex,
            quiz: lesson.quiz?.length
              ? {
                  create: {
                    tenantId,
                    questions: {
                      create: lesson.quiz.map((q, qIndex) => ({
                        tenantId,
                        question: q.question,
                        correctIndex: q.correctIndex,
                        order: qIndex,
                        options: {
                          create: q.options.map((text, oIndex) => ({
                            tenantId,
                            text,
                            order: oIndex,
                          })),
                        },
                      })),
                    },
                  },
                }
              : undefined,
          })),
        },
      },
      include: { lessons: { include: { quiz: { include: { questions: { include: { options: true } } } } } } },
    });

    return res.status(201).json(course);
  } catch (err) {
    console.error("[save-draft-course] failed:", err);
    return res.status(500).json({ error: "Failed to save course" });
  }
}

// ============================================================================
// PATCH /api/courses/:id
// ----------------------------------------------------------------------------
// Full-replace update of a course's own fields plus its lessons/quizzes.
// Only the instructor who created the course may edit it. Editing a
// PUBLISHED course is allowed (e.g. fixing a typo post-launch) — the status
// itself is untouched here; use PATCH /:id/publish to change status.
//
// Lesson replacement strategy: rather than diffing incoming lessons against
// existing ones (fiddly to get right with nested quiz/question/option rows
// and offers little benefit for an MVP-sized course), we delete all existing
// lessons for the course and recreate them from the payload in one
// transaction. `onDelete: Cascade` on Lesson -> Quiz -> QuizQuestion ->
// QuizOption means this cleanly removes the old nested tree.
// ============================================================================
export async function updateCourse(req: Request, res: Response) {
  const { id } = req.params;
  const tenantId = req.tenantId!;
  const instructorId = req.user!.id;

  const { title, description, learningObjectives, lessons, language } = req.body as {
    title: string;
    description: string;
    learningObjectives: string[];
    language?: string;
    lessons: {
      title: string;
      content: string;
      quiz: { question: string; options: string[]; correctIndex: number }[];
    }[];
  };

  const existing = await prisma.course.findFirst({ where: { id, tenantId } });
  if (!existing) return res.status(404).json({ error: "Course not found" });
  if (existing.instructorId !== instructorId) {
    return res.status(403).json({ error: "You can only edit your own courses" });
  }

  try {
    const course = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.lesson.deleteMany({ where: { courseId: id } });

      return tx.course.update({
        where: { id },
        data: {
          title,
          description,
          language: language || existing.language,
          learningObjectives,
          lessons: {
            create: lessons.map((lesson, lessonIndex) => ({
              tenantId,
              title: lesson.title,
              content: lesson.content,
              order: lessonIndex,
              quiz: lesson.quiz?.length
                ? {
                    create: {
                      tenantId,
                      questions: {
                        create: lesson.quiz.map((q, qIndex) => ({
                          tenantId,
                          question: q.question,
                          correctIndex: q.correctIndex,
                          order: qIndex,
                          options: {
                            create: q.options.map((text, oIndex) => ({
                              tenantId,
                              text,
                              order: oIndex,
                            })),
                          },
                        })),
                      },
                    },
                  }
                : undefined,
            })),
          },
        },
        include: {
          lessons: { include: { quiz: { include: { questions: { include: { options: true } } } } } },
        },
      });
    });

    return res.json(course);
  } catch (err) {
    console.error("[update-course] failed:", err);
    return res.status(500).json({ error: "Failed to update course" });
  }
}

// ============================================================================
// PATCH /api/courses/:id/publish
// Flips a course from DRAFT to PUBLISHED. Only published courses are
// visible to learners (enforced both in courses.controller.ts list queries
// and, as a backstop, can be enforced via RLS — see migration comments).
// ============================================================================
export async function publishCourse(req: Request, res: Response) {
  const { id } = req.params;
  const tenantId = req.tenantId!;

  const course = await prisma.course.findFirst({ where: { id, tenantId } });
  if (!course) return res.status(404).json({ error: "Course not found" });

  const updated = await prisma.course.update({
    where: { id },
    data: { status: "PUBLISHED" },
  });

  return res.json(updated);
}
