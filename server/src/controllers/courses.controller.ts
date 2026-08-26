import { Request, Response } from "express";
import { prisma } from "../services/prisma";

const fullCourseInclude = {
  lessons: {
    orderBy: { order: "asc" as const },
    include: {
      quiz: {
        include: {
          questions: {
            orderBy: { order: "asc" as const },
            include: { options: { orderBy: { order: "asc" as const } } },
          },
        },
      },
    },
  },
  liveSessions: true,
};

// GET /api/courses  (instructor: their own courses, any status)
export async function listInstructorCourses(req: Request, res: Response) {
  const courses = await prisma.course.findMany({
    where: { tenantId: req.tenantId!, instructorId: req.user!.id },
    orderBy: { createdAt: "desc" },
  });
  return res.json(courses);
}

// GET /api/courses/published  (learner: only PUBLISHED courses they're enrolled in)
export async function listLearnerCourses(req: Request, res: Response) {
  const courses = await prisma.course.findMany({
    where: {
      tenantId: req.tenantId!,
      status: "PUBLISHED",
      enrollments: { some: { userId: req.user!.id } },
    },
    orderBy: { createdAt: "desc" },
  });
  return res.json(courses);
}

// GET /api/courses/:id  (full nested detail — used to hydrate Dexie offline cache)
export async function getCourseDetail(req: Request, res: Response) {
  const { id } = req.params;
  const course = await prisma.course.findFirst({
    where: { id, tenantId: req.tenantId! },
    include: fullCourseInclude,
  });
  if (!course) return res.status(404).json({ error: "Course not found" });
  return res.json(course);
}

// POST /api/courses/:id/enroll { userId }  (tenant admin enrolls a learner)
export async function enrollLearner(req: Request, res: Response) {
  const { id: courseId } = req.params;
  const { userId } = req.body as { userId: string };
  const tenantId = req.tenantId!;

  const enrollment = await prisma.enrollment.upsert({
    where: { userId_courseId: { userId, courseId } },
    create: { tenantId, userId, courseId },
    update: {},
  });
  return res.status(201).json(enrollment);
}
