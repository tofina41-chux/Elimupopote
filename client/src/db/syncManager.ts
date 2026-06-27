// ============================================================================
// syncManager — drains the Dexie `syncQueue` to the server whenever the
// device is online, and re-arms itself on the `online` browser event.
// ----------------------------------------------------------------------------
// Usage: call `startSyncManager()` once at app startup (see App.tsx). It:
//   1) Tries an immediate sync (covers "app reopened while already online").
//   2) Subscribes to window 'online' events to sync the moment connectivity
//      returns.
//   3) Also runs on a periodic interval as a safety net, in case the
//      browser's online/offline events are unreliable on the device (common
//      on some Android WebViews).
//
// BATCHING: we send the ENTIRE current queue in one POST /api/sync/progress
// call (the server processes each item independently and reports per-item
// status — see server/src/controllers/sync.controller.ts). Only entries the
// server confirms as "applied" or "skipped_stale" (meaning the server
// already had a newer value — also fine to drop) are removed from the local
// queue; anything reported as "error" stays queued for the next attempt.
// ============================================================================
import { apiClient } from "../api/client";
import { db } from "./db";

let syncInFlight = false;

export async function drainSyncQueue(): Promise<{ synced: number; remaining: number }> {
  if (syncInFlight) return { synced: 0, remaining: await db.syncQueue.count() };
  if (!navigator.onLine) return { synced: 0, remaining: await db.syncQueue.count() };

  const queueEntries = await db.syncQueue.toArray();
  if (queueEntries.length === 0) return { synced: 0, remaining: 0 };

  syncInFlight = true;
  try {
    const { data } = await apiClient.post("/api/sync/progress", {
      items: queueEntries.map((e) => ({
        lessonId: e.lessonId,
        completed: e.completed,
        score: e.score,
        clientUpdatedAt: e.clientUpdatedAt,
      })),
    });

    const resultsByLessonId = new Map<string, string>(
      data.results.map((r: { lessonId: string; status: string }) => [r.lessonId, r.status])
    );

    let synced = 0;
    await db.transaction("rw", db.syncQueue, db.progress, async () => {
      for (const entry of queueEntries) {
        const status = resultsByLessonId.get(entry.lessonId);
        if (status === "applied" || status === "skipped_stale") {
          if (entry.id !== undefined) await db.syncQueue.delete(entry.id);
          await db.progress.update(entry.lessonId, { synced: true });
          synced += 1;
        } else {
          // bump attempts for visibility/backoff; leave entry queued for retry
          if (entry.id !== undefined) {
            await db.syncQueue.update(entry.id, { attempts: entry.attempts + 1 });
          }
        }
      }
    });

    const remaining = await db.syncQueue.count();
    return { synced, remaining };
  } catch (err) {
    console.warn("[syncManager] sync attempt failed, will retry later:", err);
    return { synced: 0, remaining: queueEntries.length };
  } finally {
    syncInFlight = false;
  }
}

let intervalHandle: ReturnType<typeof setInterval> | undefined;

export function startSyncManager() {
  // 1) Try immediately in case we're already online.
  drainSyncQueue();

  // 2) Sync the instant connectivity returns.
  window.addEventListener("online", () => drainSyncQueue());

  // 3) Safety-net polling every 30s, for devices with flaky online/offline events.
  if (!intervalHandle) {
    intervalHandle = setInterval(() => drainSyncQueue(), 30_000);
  }
}

export function stopSyncManager() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = undefined;
  }
}
