import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { mockMpesaPayment } from "../controllers/payment.controller";

const router = Router();

// Superadmin triggers/confirms seat top-ups on behalf of a tenant.
router.post("/mock-mpesa", authenticate, requireRole("SUPERADMIN"), mockMpesaPayment);

export default router;
