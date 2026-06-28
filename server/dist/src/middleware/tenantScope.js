"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantScope = tenantScope;
function tenantScope(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: "Unauthenticated" });
    }
    if (req.user.role === "SUPERADMIN") {
        const requested = req.query.tenantId || req.body?.tenantId;
        req.tenantId = requested || undefined;
    }
    else {
        if (!req.user.tenantId) {
            return res.status(403).json({ error: "User has no associated tenant" });
        }
        req.tenantId = req.user.tenantId;
    }
    next();
}
