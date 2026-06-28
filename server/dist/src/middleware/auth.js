"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.requireRole = requireRole;
const supabaseAuth_service_1 = require("../services/supabaseAuth.service");
const prisma_1 = require("../services/prisma");
// ============================================================================
// authenticate
// ----------------------------------------------------------------------------
// Reads `Authorization: Bearer <jwt>`, verifies it (mock Supabase JWT verify
// in MVP — see services/supabaseAuth.service.ts), then loads the local User
// row and attaches it to req.user. Every protected route depends on this
// running first.
// ============================================================================
async function authenticate(req, res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Missing Authorization header" });
    }
    try {
        const payload = (0, supabaseAuth_service_1.verifyJwt)(header.slice("Bearer ".length));
        const user = await prisma_1.prisma.user.findUnique({ where: { authUserId: payload.sub } });
        if (!user)
            return res.status(401).json({ error: "User not found" });
        req.user = {
            id: user.id,
            authUserId: user.authUserId,
            tenantId: user.tenantId,
            role: user.role,
            phone: user.phone,
        };
        next();
    }
    catch (err) {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
}
// ============================================================================
// requireRole
// ----------------------------------------------------------------------------
// Usage: router.get("/x", authenticate, requireRole("TENANT_ADMIN"), handler)
// ============================================================================
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: "Forbidden: insufficient role" });
        }
        next();
    };
}
