import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { tenantScope } from "../middleware/tenantScope";
import { syncProgress } from "../controllers/sync.controller";

const router = Router();

// Any authenticated learner can sync their own queued progress.
router.post("/progress", authenticate, tenantScope, syncProgress);

export default router;
