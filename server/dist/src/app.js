"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const tenants_routes_1 = __importDefault(require("./routes/tenants.routes"));
const courses_routes_1 = __importDefault(require("./routes/courses.routes"));
const analytics_routes_1 = __importDefault(require("./routes/analytics.routes"));
const payment_routes_1 = __importDefault(require("./routes/payment.routes"));
const sync_routes_1 = __importDefault(require("./routes/sync.routes"));
// ============================================================================
// ElimuPopote API — Express app
// ----------------------------------------------------------------------------
// Route mounting overview (see each routes/*.ts file for per-endpoint auth):
//   /api/auth        — phone OTP login (public, mocked)
//   /api/tenants     — SUPERADMIN only: create/disable tenants, seat limits
//   /api/courses     — INSTRUCTOR (AI generation + authoring) & LEARNER (read)
//   /api/analytics   — TENANT_ADMIN only: overview + at-risk learners
//   /api/payment     — SUPERADMIN only: mock M-Pesa seat top-up
//   /api/sync        — LEARNER: offline progress queue replay
//
// Every protected route runs `authenticate` (verifies the mock Supabase JWT
// and loads req.user) then `tenantScope` (resolves req.tenantId) before
// hitting a controller. See middleware/auth.ts and middleware/tenantScope.ts.
//
// GET requests under /api are also what the client's PWA service worker
// caches for offline use (see client/vite.config.ts workbox runtimeCaching
// rules) — so keep all reads as GET and all writes as POST/PATCH to keep
// that caching strategy correct.
// ============================================================================
function createApp() {
    const app = (0, express_1.default)();
    app.use((0, cors_1.default)()); // MVP: allow all origins. Restrict to the PWA's domain in production.
    app.use(express_1.default.json({ limit: "2mb" })); // generous limit: AI-generated course payloads can be sizable
    app.use((0, morgan_1.default)("dev"));
    app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "elimupopote-api" }));
    app.use("/api/auth", auth_routes_1.default);
    app.use("/api/tenants", tenants_routes_1.default);
    app.use("/api/courses", courses_routes_1.default);
    app.use("/api/analytics", analytics_routes_1.default);
    app.use("/api/payment", payment_routes_1.default);
    app.use("/api/sync", sync_routes_1.default);
    // Centralized error handler — catches anything a controller forgot to
    // try/catch, so the API never crashes the process on a bad request.
    app.use((err, _req, res, _next) => {
        console.error("[unhandled-error]", err);
        res.status(500).json({ error: "Internal server error" });
    });
    return app;
}
