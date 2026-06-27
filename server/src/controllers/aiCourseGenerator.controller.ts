import { Request, Response } from "express";
import { prisma } from "../services/prisma";
import { generateCourse, detectLanguage } from "../services/openai.service";

// ============================================================================
// POST /api/courses/generate
// ----------------------------------------------------------------------------
// Instructor-only. Takes a free-text prompt (English or Swahili), sends it
// to the AI service (real OpenAI call or local mock — see
// services/openai.service.ts), and returns a draft course shape that the
// CourseBuilder screen renders as an editable form. Nothing is persisted
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
