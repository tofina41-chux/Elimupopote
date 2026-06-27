import { useEffect, useState } from "react";
import { Badge, Button, Table, Text, Title, Stack } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { apiClient } from "../api/client";

interface AtRiskLearner {
  id: string;
  fullName: string;
  phone: string;
  lastActivity: string | null;
  reason: "inactive_7_days" | "never_started";
}

// Renders GET /api/analytics/at-risk as a red-highlighted table, with a
// "Send Alert" button per row wired to the (currently mocked) SMS nudge
// endpoint. See server/src/controllers/analytics.controller.ts for the
// underlying SQL/Prisma query and the definition of "at risk".
export function AnalyticsDashboard() {
  const { t } = useTranslation();
  const [learners, setLearners] = useState<AtRiskLearner[]>([]);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    apiClient.get("/api/analytics/at-risk").then((res) => setLearners(res.data.atRisk));
  }, []);

  async function sendAlert(userId: string) {
    await apiClient.post(`/api/analytics/at-risk/${userId}/alert`);
    setSentIds((prev) => new Set(prev).add(userId));
  }

  return (
    <Stack p="md">
      <Title order={2}>{t("analytics.atRiskTitle")}</Title>

      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Name</Table.Th>
            <Table.Th>Phone</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th></Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {learners.map((l) => (
            <Table.Tr key={l.id} bg="red.0">
              <Table.Td>{l.fullName}</Table.Td>
              <Table.Td>{l.phone}</Table.Td>
              <Table.Td>
                <Badge color="red">
                  {l.reason === "never_started" ? t("analytics.neverStarted") : t("analytics.inactiveDays")}
                </Badge>
              </Table.Td>
              <Table.Td>
                <Button size="xs" disabled={sentIds.has(l.id)} onClick={() => sendAlert(l.id)}>
                  {sentIds.has(l.id) ? "✓" : t("analytics.sendAlert")}
                </Button>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      {learners.length === 0 && <Text c="dimmed">No at-risk learners 🎉</Text>}
    </Stack>
  );
}
