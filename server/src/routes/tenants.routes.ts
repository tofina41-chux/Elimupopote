import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { listTenants, createTenant, updateTenant } from "../controllers/tenants.controller";

const router = Router();

// Tenant management is SUPERADMIN-only.
router.use(authenticate, requireRole("SUPERADMIN"));

router.get("/", listTenants);
router.post("/", createTenant);
router.patch("/:id", updateTenant);

export default router;
