import { Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";
import { verifyJwt } from "../services/supabaseAuth.service";
import { prisma } from "../services/prisma";

// ============================================================================
// authenticate
// ----------------------------------------------------------------------------
// Reads `Authorization: Bearer <jwt>`, verifies it (mock Supabase JWT verify
// in MVP — see services/supabaseAuth.service.ts), then loads the local User
// row and attaches it to req.user. Every protected route depends on this
// running first.
// ============================================================================
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing Authorization header" });
  }

  try {
    const payload = verifyJwt(header.slice("Bearer ".length));
    const user = await prisma.user.findUnique({ where: { authUserId: payload.sub } });
    if (!user) return res.status(401).json({ error: "User not found" });

    req.user = {
      id: user.id,
      authUserId: user.authUserId,
      tenantId: user.tenantId,
      role: user.role,
      phone: user.phone,
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// ============================================================================
// requireRole
// ----------------------------------------------------------------------------
// Usage: router.get("/x", authenticate, requireRole("TENANT_ADMIN"), handler)
// ============================================================================
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden: insufficient role" });
    }
    next();
  };
}
