// ============================================================================
// Mock Supabase-style phone login.
// ----------------------------------------------------------------------------
// In this MVP we simply verify the phone number exists and mint a locally-signed
// JWT containing the same app_metadata fields the rest of the app expects.
// Swap loginWithPhone()/verifyJwt() for real `@supabase/supabase-js`
// `supabase.auth.signInWithPassword()` / `supabase.auth.verifyJwt()` once you
// wire up a real Supabase project and a real login mechanism.
// ============================================================================
import jwt from "jsonwebtoken";
import { prisma } from "./prisma";

const JWT_SECRET = process.env.JWT_SECRET || "dev-only-secret-change-me";

export async function loginWithPhone(phone: string) {
  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) {
    throw new Error("No account found for this phone number");
  }

  const token = jwt.sign(
    {
      sub: user.authUserId,
      phone: user.phone,
      app_metadata: {
        tenant_id: user.tenantId,
        role: user.role,
      },
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  return { token, user };
}

export function verifyJwt(token: string) {
  return jwt.verify(token, JWT_SECRET) as {
    sub: string;
    phone: string;
    app_metadata: { tenant_id: string | null; role: string };
  };
}
