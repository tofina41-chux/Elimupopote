"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOverview = getOverview;
exports.getAtRiskLearners = getAtRiskLearners;
exports.sendAtRiskAlert = sendAtRiskAlert;
const prisma_1 = require("../services/prisma");
// ============================================================================
// GET /api/analytics/overview?tenantId=...
// Tenant-admin dashboard summary: total learners, total courses, average
// completion %.
// ============================================================================
async function getOverview(req, res) {
    const tenantId = req.tenantId;
    const [totalLearners, totalCourses, progressRows] = await Promise.all([
        prisma_1.prisma.user.count({ where: { tenantId, role: "LEARNER" } }),
        prisma_1.prisma.course.count({ where: { tenantId } }),
        prisma_1.prisma.progress.findMany({ where: { tenantId }, select: { completed: true } }),
    ]);
    const avgCompletionPct = progressRows.length === 0
        ? 0
        : Math.round((progressRows.filter((p) => p.completed).length / progressRows.length) * 100);
    return res.json({ totalLearners, totalCourses, avgCompletionPct });
}
// ============================================================================
// GET /api/analytics/at-risk?tenantId=...
// ----------------------------------------------------------------------------
// "At risk" = a LEARNER in this tenant who has NOT completed any lesson in
// the last 7 days. This includes:
//   (a) learners with progress rows, but the most recent one is > 7 days old
//   (b) learners with an enrollment but ZERO progress rows at all (never
//       started) — these are arguably the highest-risk group, so we union
//       them in explicitly rather than relying on a single SQL join, which
//       would silently miss them.
//
// We use a raw SQL query for (a) because Prisma's query builder can't
// express "max(date) per user, then filter on that aggregate" as cleanly as
// a GROUP BY + HAVING, and we use Prisma's findMany for (b) for type safety
// since it's a simpler "not exists" shape. Results are merged in JS.
//
// All raw SQL here is parameterized (tenantId passed as a bound param, not
// string-interpolated) to avoid SQL injection.
// ============================================================================
async function getAtRiskLearners(req, res) {
    const tenantId = req.tenantId;
    // (a) Learners whose most recent progress update is older than 7 days.
    const staleLearners = await prisma_1.prisma.$queryRaw `
    SELECT u.id, u."fullName", u.phone, MAX(p."updatedAt") AS "lastActivity"
    FROM users u
    INNER JOIN progress p ON p."userId" = u.id
    WHERE u."tenantId" = ${tenantId}
      AND u.role = 'LEARNER'
    GROUP BY u.id, u."fullName", u.phone
    HAVING MAX(p."updatedAt") < NOW() - INTERVAL '7 days'
    ORDER BY "lastActivity" ASC
  `;
    // (b) Enrolled learners who have never produced a single progress row.
    const neverStarted = await prisma_1.prisma.user.findMany({
        where: {
            tenantId,
            role: "LEARNER",
            enrollments: { some: {} },
            progress: { none: {} },
        },
        select: { id: true, fullName: true, phone: true },
    });
    const atRisk = [
        ...staleLearners.map((l) => ({
            id: l.id,
            fullName: l.fullName,
            phone: l.phone,
            lastActivity: l.lastActivity,
            reason: "inactive_7_days",
        })),
        ...neverStarted.map((l) => ({
            id: l.id,
            fullName: l.fullName,
            phone: l.phone,
            lastActivity: null,
            reason: "never_started",
        })),
    ];
    return res.json({ count: atRisk.length, atRisk });
}
// ============================================================================
// POST /api/analytics/at-risk/:userId/alert
// Placeholder for a future SMS nudge (Africa's Talking / Twilio). For the
// MVP this just logs and returns 202 so the frontend "Send Alert" button has
// something real to call.
// ============================================================================
async function sendAtRiskAlert(req, res) {
    const { userId } = req.params;
    console.log(`[mock-sms] Sending re-engagement nudge to learner ${userId}`);
    return res.status(202).json({ status: "queued" });
}
