import { Request, Response } from "express";
import { loginWithPhone } from "../services/supabaseAuth.service";

// POST /api/auth/login { phone }
export async function loginHandler(req: Request, res: Response) {
  const { phone } = req.body as { phone: string };
  if (!phone) return res.status(400).json({ error: "phone is required" });

  try {
    const { token, user } = await loginWithPhone(phone.trim());
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
