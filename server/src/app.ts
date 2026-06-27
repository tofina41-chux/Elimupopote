import express from "express";
import cors from "cors";
import morgan from "morgan";

import authRoutes from "./routes/auth.routes";
import tenantsRoutes from "./routes/tenants.routes";
import coursesRoutes from "./routes/courses.routes";
import analyticsRoutes from "./routes/analytics.routes";
import paymentRoutes from "./routes/payment.routes";
import syncRoutes from "./routes/sync.routes";

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

export function createApp() {
  const app = express();

  app.use(cors()); // MVP: allow all origins. Restrict to the PWA's domain in production.
  app.use(express.json({ limit: "2mb" })); // generous limit: AI-generated course payloads can be sizable
  app.use(morgan("dev"));

  app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "elimupopote-api" }));

  app.use("/api/auth", authRoutes);
  app.use("/api/tenants", tenantsRoutes);
  app.use("/api/courses", coursesRoutes);
  app.use("/api/analytics", analyticsRoutes);
  app.use("/api/payment", paymentRoutes);
  app.use("/api/sync", syncRoutes);

  // Centralized error handler — catches anything a controller forgot to
  // try/catch, so the API never crashes the process on a bad request.
  app.use(
    (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error("[unhandled-error]", err);
      res.status(500).json({ error: "Internal server error" });
    }
  );

  return app;
}
