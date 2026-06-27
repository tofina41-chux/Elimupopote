import { Request, Response, NextFunction } from "express";

// ============================================================================
// tenantScope
// ----------------------------------------------------------------------------
// First layer of multi-tenant isolation (the second layer is Postgres RLS,
// see supabase/migrations/0001_init_rls.sql).
//
// This middleware does NOT touch the database itself — instead it resolves
// the effective tenantId for the request and stores it on `req.tenantId` so
// every controller can do:
//
//     prisma.course.findMany({ where: { tenantId: req.tenantId, ...rest } })
//
// without re-deriving tenant context in every handler.
//
// Resolution order:
//   - SUPERADMIN: tenantId comes from a query param / body (?tenantId=...),
//     because superadmin acts ON BEHALF of a tenant rather than belonging
//     to one. If absent, req.tenantId is left undefined (route must handle
//     "list across tenants" cases itself, e.g. GET /api/tenants).
//   - Everyone else: tenantId is whatever is on their User row — a learner,
//     instructor, or tenant admin can NEVER override this via a request
//     param, even if they pass a different tenantId in the query string.
// ============================================================================
declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
    }
  }
}

export function tenantScope(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthenticated" });
  }

  if (req.user.role === "SUPERADMIN") {
    const requested = (req.query.tenantId as string) || req.body?.tenantId;
    req.tenantId = requested || undefined;
  } else {
    if (!req.user.tenantId) {
      return res.status(403).json({ error: "User has no associated tenant" });
    }
    req.tenantId = req.user.tenantId;
  }

  next();
}
