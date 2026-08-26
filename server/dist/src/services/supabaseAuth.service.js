"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginWithPhone = loginWithPhone;
exports.verifyJwt = verifyJwt;
// ============================================================================
// Mock Supabase-style phone login.
// ----------------------------------------------------------------------------
// In this MVP we simply verify the phone number exists and mint a locally-signed
// JWT containing the same app_metadata fields the rest of the app expects.
// Swap loginWithPhone()/verifyJwt() for real `@supabase/supabase-js`
// `supabase.auth.signInWithPassword()` / `supabase.auth.verifyJwt()` once you
// wire up a real Supabase project and a real login mechanism.
// ============================================================================
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("./prisma");
const JWT_SECRET = process.env.JWT_SECRET || "dev-only-secret-change-me";
async function loginWithPhone(phone) {
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
