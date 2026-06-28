"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncProgress = syncProgress;
const prisma_1 = require("../services/prisma");
async function syncProgress(req, res) {
    const { items } = req.body;
    const userId = req.user.id;
    const tenantId = req.tenantId;
    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "items array is required" });
    }
    const results = await Promise.all(items.map(async (item) => {
        try {
            const existing = await prisma_1.prisma.progress.findUnique({
                where: { userId_lessonId: { userId, lessonId: item.lessonId } },
            });
            const incomingTimestamp = new Date(item.clientUpdatedAt);
            // Last-write-wins: only apply the incoming update if there is no
            // existing row, or the incoming clientUpdatedAt is newer than what
            // we already have stored.
            if (existing && existing.clientUpdatedAt >= incomingTimestamp) {
                return { lessonId: item.lessonId, status: "skipped_stale" };
            }
            await prisma_1.prisma.progress.upsert({
                where: { userId_lessonId: { userId, lessonId: item.lessonId } },
                create: {
                    tenantId,
                    userId,
                    lessonId: item.lessonId,
                    completed: item.completed,
                    score: item.score,
                    clientUpdatedAt: incomingTimestamp,
                },
                update: {
                    completed: item.completed,
                    score: item.score,
                    clientUpdatedAt: incomingTimestamp,
                },
            });
            return { lessonId: item.lessonId, status: "applied" };
        }
        catch (err) {
            console.error(`[sync-progress] failed for lesson ${item.lessonId}:`, err);
            return { lessonId: item.lessonId, status: "error" };
        }
    }));
    return res.json({ results });
}
