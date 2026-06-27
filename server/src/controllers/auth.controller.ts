import { Request, Response } from "express";
import { requestOtp, verifyOtpAndIssueToken } from "../services/supabaseAuth.service";

// POST /api/auth/request-otp { phone }
export async function requestOtpHandler(req: Request, res: Response) {
  const { phone } = req.body as { phone: string };
  if (!phone) return res.status(400).json({ error: "phone is required" });

  requestOtp(phone);
  // In MVP, OTP is always "123456" and is also logged server-side for demo purposes.
  return res.json({ status: "sent", hint: "Use 123456 in this MVP" });
}

// POST /api/auth/verify-otp { phone, otp }
export async function verifyOtpHandler(req: Request, res: Response) {
  const { phone, otp } = req.body as { phone: string; otp: string };
  if (!phone || !otp) return res.status(400).json({ error: "phone and otp are required" });

  try {
    const { token, user } = await verifyOtpAndIssueToken(phone, otp);
    return res.json({
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
        tenantId: user.tenantId,
      },
    });
  } catch (err: any) {
    return res.status(401).json({ error: err.message || "Login failed" });
  }
}
