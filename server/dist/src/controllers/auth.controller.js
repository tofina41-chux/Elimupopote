"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestOtpHandler = requestOtpHandler;
exports.verifyOtpHandler = verifyOtpHandler;
const supabaseAuth_service_1 = require("../services/supabaseAuth.service");
// POST /api/auth/request-otp { phone }
async function requestOtpHandler(req, res) {
    const { phone } = req.body;
    if (!phone)
        return res.status(400).json({ error: "phone is required" });
    (0, supabaseAuth_service_1.requestOtp)(phone);
    // In MVP, OTP is always "123456" and is also logged server-side for demo purposes.
    return res.json({ status: "sent", hint: "Use 123456 in this MVP" });
}
// POST /api/auth/verify-otp { phone, otp }
async function verifyOtpHandler(req, res) {
    const { phone, otp } = req.body;
    if (!phone || !otp)
        return res.status(400).json({ error: "phone and otp are required" });
    try {
        const { token, user } = await (0, supabaseAuth_service_1.verifyOtpAndIssueToken)(phone, otp);
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
