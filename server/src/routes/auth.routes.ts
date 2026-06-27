import { Router } from "express";
import { requestOtpHandler, verifyOtpHandler } from "../controllers/auth.controller";

const router = Router();

router.post("/request-otp", requestOtpHandler);
router.post("/verify-otp", verifyOtpHandler);

export default router;
