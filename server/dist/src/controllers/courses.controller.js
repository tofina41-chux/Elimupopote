"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listInstructorCourses = listInstructorCourses;
exports.listLearnerCourses = listLearnerCourses;
exports.getCourseDetail = getCourseDetail;
exports.enrollLearner = enrollLearner;
const prisma_1 = require("../services/prisma");
const fullCourseInclude = {
    lessons: {
        orderBy: { order: "asc" },
        include: {
            quiz: {
                include: {
                    questions: {
                        orderBy: { order: "asc" },
                        include: { options: { orderBy: { order: "asc" } } },
                    },
                },
            },
        },
    },
    liveSessions: true,
};
// GET /api/courses  (instructor: their own courses, any status)
async function listInstructorCourses(req, res) {
    const courses = await prisma_1.prisma.course.findMany({
        where: { tenantId: req.tenantId, instructorId: req.user.id },
        orderBy: { createdAt: "desc" },
    });
    return res.json(courses);
}
// GET /api/courses/published  (learner: only PUBLISHED courses they're enrolled in)
async function listLearnerCourses(req, res) {
    const courses = await prisma_1.prisma.course.findMany({
        where: {
            tenantId: req.tenantId,
            status: "PUBLISHED",
            enrollments: { some: { userId: req.user.id } },
        },
        orderBy: { createdAt: "desc" },
    });
    return res.json(courses);
}
// GET /api/courses/:id  (full nested detail — used to hydrate Dexie offline cache)
async function getCourseDetail(req, res) {
    const { id } = req.params;
    const course = await prisma_1.prisma.course.findFirst({
        where: { id, tenantId: req.tenantId },
        include: fullCourseInclude,
    });
    if (!course)
        return res.status(404).json({ error: "Course not found" });
    return res.json(course);
}
// POST /api/courses/:id/enroll { userId }  (tenant admin enrolls a learner)
async function enrollLearner(req, res) {
    const { id: courseId } = req.params;
    const { userId } = req.body;
    const tenantId = req.tenantId;
    const enrollment = await prisma_1.prisma.enrollment.upsert({
        where: { userId_courseId: { userId, courseId } },
        create: { tenantId, userId, courseId },
        update: {},
    });
    return res.status(201).json(enrollment);
}
