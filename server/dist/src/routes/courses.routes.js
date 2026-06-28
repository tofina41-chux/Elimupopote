"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const tenantScope_1 = require("../middleware/tenantScope");
const courses_controller_1 = require("../controllers/courses.controller");
const aiCourseGenerator_controller_1 = require("../controllers/aiCourseGenerator.controller");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate, tenantScope_1.tenantScope);
// AI generation + persistence — instructor only.
router.post("/generate", (0, auth_1.requireRole)("INSTRUCTOR"), aiCourseGenerator_controller_1.generateCourseDraft);
router.post("/", (0, auth_1.requireRole)("INSTRUCTOR"), aiCourseGenerator_controller_1.saveDraftCourse);
router.patch("/:id/publish", (0, auth_1.requireRole)("INSTRUCTOR"), aiCourseGenerator_controller_1.publishCourse);
// Listing — role-specific views.
router.get("/", (0, auth_1.requireRole)("INSTRUCTOR"), courses_controller_1.listInstructorCourses);
router.get("/published", (0, auth_1.requireRole)("LEARNER"), courses_controller_1.listLearnerCourses);
router.get("/:id", courses_controller_1.getCourseDetail); // any authenticated tenant member can fetch detail they're scoped to
// Enrollment — tenant admin assigns learners to courses.
router.post("/:id/enroll", (0, auth_1.requireRole)("TENANT_ADMIN"), courses_controller_1.enrollLearner);
exports.default = router;
