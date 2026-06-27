import { useEffect, useState } from "react";
import { Button, Card, Grid, Group, NumberInput, Stack, Text, Title } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { apiClient } from "../api/client";
import { useAuthContext } from "../context/AuthContext";

interface Overview {
  totalLearners: number;
  totalCourses: number;
  avgCompletionPct: number;
}

// Tenant Admin landing page: headline metrics, plus (for SUPERADMIN acting
// on a tenant) a mock M-Pesa seat top-up form. The same screen serves both
// roles since the data shapes are simple — a real product would likely
// split these, but for the MVP one screen keeps the demo flow tight.
export function AdminDashboard() {
  const { t } = useTranslation();
  const { user } = useAuthContext();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [amount, setAmount] = useState<number | "">(500);
  const [payStatus, setPayStatus] = useState<string | null>(null);

  useEffect(() => {
    apiClient.get("/api/analytics/overview").then((res) => setOverview(res.data));
  }, []);

  async function handleTopUp() {
    if (!amount || !user?.tenantId) return;
    setPayStatus(null);
    try {
      const { data } = await apiClient.post("/api/payment/mock-mpesa", {
        tenantId: user.tenantId,
        amount,
      });
      setPayStatus(`+${data.seatsPurchased} seats — new limit: ${data.newSeatsLimit}`);
    } catch {
      setPayStatus(t("common.error"));
    }
  }

  return (
    <Stack p="md">
      <Title order={2}>{t("admin.title")}</Title>

      <Grid>
        <Grid.Col span={4}>
          <Card withBorder padding="lg">
            <Text c="dimmed" size="sm">
              {t("admin.totalLearners")}
            </Text>
            <Title order={3}>{overview?.totalLearners ?? "—"}</Title>
          </Card>
        </Grid.Col>
        <Grid.Col span={4}>
          <Card withBorder padding="lg">
            <Text c="dimmed" size="sm">
              {t("admin.totalCourses")}
            </Text>
            <Title order={3}>{overview?.totalCourses ?? "—"}</Title>
          </Card>
        </Grid.Col>
        <Grid.Col span={4}>
          <Card withBorder padding="lg">
            <Text c="dimmed" size="sm">
              {t("admin.avgCompletion")}
            </Text>
            <Title order={3}>{overview ? `${overview.avgCompletionPct}%` : "—"}</Title>
          </Card>
        </Grid.Col>
      </Grid>

      {user?.role === "SUPERADMIN" && (
        <Card withBorder padding="lg" maw={420}>
          <Title order={4} mb="sm">
            {t("payment.title")}
          </Title>
          <Group align="flex-end">
            <NumberInput
              label={t("payment.amountLabel")}
              value={amount}
              onChange={(v) => setAmount(v as number)}
              min={500}
              step={500}
            />
            <Button onClick={handleTopUp}>{t("payment.submit")}</Button>
          </Group>
          {payStatus && <Text mt="sm">{payStatus}</Text>}
        </Card>
      )}
    </Stack>
  );
}
