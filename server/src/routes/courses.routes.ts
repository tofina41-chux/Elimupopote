import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { tenantScope } from "../middleware/tenantScope";
import {
  listInstructorCourses,
  listLearnerCourses,
  getCourseDetail,
  enrollLearner,
} from "../controllers/courses.controller";
import {
  generateCourseDraft,
  saveDraftCourse,
  publishCourse,
} from "../controllers/aiCourseGenerator.controller";

const router = Router();

router.use(authenticate, tenantScope);

// AI generation + persistence — instructor only.
router.post("/generate", requireRole("INSTRUCTOR"), generateCourseDraft);
router.post("/", requireRole("INSTRUCTOR"), saveDraftCourse);
router.patch("/:id/publish", requireRole("INSTRUCTOR"), publishCourse);

// Listing — role-specific views.
router.get("/", requireRole("INSTRUCTOR"), listInstructorCourses);
router.get("/published", requireRole("LEARNER"), listLearnerCourses);
router.get("/:id", getCourseDetail); // any authenticated tenant member can fetch detail they're scoped to

// Enrollment — tenant admin assigns learners to courses.
router.post("/:id/enroll", requireRole("TENANT_ADMIN"), enrollLearner);

export default router;
