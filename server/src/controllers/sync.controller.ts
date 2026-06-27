import { Request, Response } from "express";
import { prisma } from "../services/prisma";

// ============================================================================
// POST /api/sync/progress
// ----------------------------------------------------------------------------
// Receives a BATCH of queued progress updates from a learner's device once
// it regains connectivity (see client/src/db/syncManager.ts). Body shape:
//   { items: [ { lessonId, completed, score, clientUpdatedAt }, ... ] }
//
// CONFLICT RESOLUTION: last-write-wins, compared on `clientUpdatedAt` (the
// timestamp set ON THE DEVICE at the moment of the quiz attempt) — NOT on
// server arrival time. This matters because a learner can complete lessons
// offline for hours before syncing; we don't want a late sync of an OLDER
// attempt to clobber a newer one that already synced from another session
// (e.g. they also used a tablet).
//
// We process each item independently and report per-item success/failure so
// the client can safely drop only the ones that succeeded from its local
// sync queue and retry the rest.
// ============================================================================
type SyncItem = {
  lessonId: string;
  completed: boolean;
  score: number | null;
  clientUpdatedAt: string; // ISO timestamp from the device
};

export async function syncProgress(req: Request, res: Response) {
  const { items } = req.body as { items: SyncItem[] };
  const userId = req.user!.id;
  const tenantId = req.tenantId!;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "items array is required" });
  }

  const results = await Promise.all(
    items.map(async (item) => {
      try {
        const existing = await prisma.progress.findUnique({
          where: { userId_lessonId: { userId, lessonId: item.lessonId } },
        });

        const incomingTimestamp = new Date(item.clientUpdatedAt);

        // Last-write-wins: only apply the incoming update if there is no
        // existing row, or the incoming clientUpdatedAt is newer than what
        // we already have stored.
        if (existing && existing.clientUpdatedAt >= incomingTimestamp) {
          return { lessonId: item.lessonId, status: "skipped_stale" as const };
        }

        await prisma.progress.upsert({
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

        return { lessonId: item.lessonId, status: "applied" as const };
      } catch (err) {
        console.error(`[sync-progress] failed for lesson ${item.lessonId}:`, err);
        return { lessonId: item.lessonId, status: "error" as const };
      }
    })
  );

  return res.json({ results });
}
