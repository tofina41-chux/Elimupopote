"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCourseDraft = generateCourseDraft;
exports.saveDraftCourse = saveDraftCourse;
exports.publishCourse = publishCourse;
const prisma_1 = require("../services/prisma");
const openai_service_1 = require("../services/openai.service");
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
async function generateCourseDraft(req, res) {
    try {
        const { prompt } = req.body;
        if (!prompt || prompt.trim().length < 3) {
            return res.status(400).json({ error: "Please describe the course you want to create." });
        }
        const language = (0, openai_service_1.detectLanguage)(prompt);
        const draft = await (0, openai_service_1.generateCourse)(prompt);
        return res.status(200).json({ language, draft });
    }
    catch (err) {
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
async function saveDraftCourse(req, res) {
    const { title, description, learningObjectives, lessons, language } = req.body;
    const tenantId = req.tenantId;
    const instructorId = req.user.id;
    try {
        const course = await prisma_1.prisma.course.create({
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
    }
    catch (err) {
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
async function publishCourse(req, res) {
    const { id } = req.params;
    const tenantId = req.tenantId;
    const course = await prisma_1.prisma.course.findFirst({ where: { id, tenantId } });
    if (!course)
        return res.status(404).json({ error: "Course not found" });
    const updated = await prisma_1.prisma.course.update({
        where: { id },
        data: { status: "PUBLISHED" },
    });
    return res.json(updated);
}
