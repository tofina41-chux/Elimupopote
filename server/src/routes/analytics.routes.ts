import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { tenantScope } from "../middleware/tenantScope";
import { getOverview, getAtRiskLearners, sendAtRiskAlert } from "../controllers/analytics.controller";

const router = Router();

router.use(authenticate, tenantScope, requireRole("TENANT_ADMIN"));

router.get("/overview", getOverview);
router.get("/at-risk", getAtRiskLearners);
router.post("/at-risk/:userId/alert", sendAtRiskAlert);

export default router;
