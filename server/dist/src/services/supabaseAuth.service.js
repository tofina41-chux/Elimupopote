"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestOtp = requestOtp;
exports.verifyOtpAndIssueToken = verifyOtpAndIssueToken;
exports.verifyJwt = verifyJwt;
// ============================================================================
// Mock Supabase phone-OTP auth.
// ----------------------------------------------------------------------------
// In a real deployment, Supabase Auth issues the JWT after the user verifies
// an SMS OTP, and we'd verify the JWT signature against Supabase's JWKS.
// For the MVP we MOCK both ends:
//   1) requestOtp()  — "sends" an OTP (just logs it to the console).
//   2) verifyOtp()   — accepts ANY 6-digit code and mints a locally-signed
//                       JWT with the same SHAPE Supabase would produce
//                       (including app_metadata.tenant_id / role, which the
//                       RLS policies in 0001_init_rls.sql depend on).
//
// Swap verifyOtpAndIssueToken()/verifyJwt() for real `@supabase/supabase-js`
// `supabase.auth.verifyOtp()` + JWKS verification once you wire up a real
// Supabase project and Africa's Talking / Twilio for SMS delivery.
// ============================================================================
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("./prisma");
const JWT_SECRET = process.env.JWT_SECRET || "dev-only-secret-change-me";
const otpStore = new Map(); // phone -> otp (in-memory, MVP only)
function requestOtp(phone) {
    const otp = "123456"; // deterministic mock OTP — always "123456" in MVP
    otpStore.set(phone, otp);
    console.log(`[mock-sms] OTP for ${phone}: ${otp}`);
    return otp;
}
async function verifyOtpAndIssueToken(phone, otp) {
    const expected = otpStore.get(phone) ?? "123456"; // fallback so demo always works
    if (otp !== expected) {
        throw new Error("Invalid OTP");
    }
    const user = await prisma_1.prisma.user.findUnique({ where: { phone } });
    if (!user) {
        throw new Error("No account found for this phone number");
    }
    const token = jsonwebtoken_1.default.sign({
        sub: user.authUserId,
        phone: user.phone,
        app_metadata: {
            tenant_id: user.tenantId,
            role: user.role,
        },
    }, JWT_SECRET, { expiresIn: "7d" });
    return { token, user };
}
function verifyJwt(token) {
    return jsonwebtoken_1.default.verify(token, JWT_SECRET);
}
