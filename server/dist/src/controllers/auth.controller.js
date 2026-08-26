"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginHandler = loginHandler;
const supabaseAuth_service_1 = require("../services/supabaseAuth.service");
// POST /api/auth/login { phone }
async function loginHandler(req, res) {
    const { phone } = req.body;
    if (!phone)
        return res.status(400).json({ error: "phone is required" });
    try {
        const { token, user } = await (0, supabaseAuth_service_1.loginWithPhone)(phone.trim());
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
    }
    catch (err) {
        return res.status(401).json({ error: err.message || "Login failed" });
    }
}
