import { useEffect, useState } from "react";
import { Badge, Group, Loader } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { db } from "../db/db";
import { drainSyncQueue } from "../db/syncManager";

// Small pill shown in the app header. Polls the local Dexie syncQueue count
// every few seconds (cheap — it's just an IndexedDB count, not a network
// call) so the learner always has an honest signal of whether their
// progress has actually reached the server yet.
export function SyncStatusIndicator() {
  const { t } = useTranslation();
  const online = useOnlineStatus();
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const tick = async () => setPending(await db.syncQueue.count());
    tick();
    const interval = setInterval(tick, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (online && pending > 0) {
      setSyncing(true);
      drainSyncQueue().finally(() => setSyncing(false));
    }
  }, [online, pending]);

  if (!online) {
    return (
      <Badge color="orange" variant="filled">
        {t("sync.offline")}
        {pending > 0 ? ` (${t("sync.pendingItems", { count: pending })})` : ""}
      </Badge>
    );
  }

  if (syncing || pending > 0) {
    return (
      <Group gap={6}>
        <Loader size="xs" />
        <Badge color="blue" variant="light">
          {t("sync.syncing")}
        </Badge>
      </Group>
    );
  }

  return (
    <Badge color="green" variant="light">
      {t("sync.online")}
    </Badge>
  );
}
