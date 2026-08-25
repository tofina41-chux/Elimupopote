import { useState } from "react";
import { Button, Card, Center, Stack, Text, TextInput, Title } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../api/client";
import { useAuthContext } from "../context/AuthContext";

export function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuthContext();

  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    setError(null);
    setLoading(true);
    try {
      const { data } = await apiClient.post("/api/auth/login", { phone: phone.trim() });
      login(data.token, data.user);
      navigate("/");
    } catch (error: any) {
      setError(error?.response?.data?.error || t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Center h="100vh" bg="gray.0">
      <Card withBorder shadow="sm" padding="xl" radius="md" w={360}>
        <Stack gap="md">
          <Title order={2} ta="center">
            {t("app.name")}
          </Title>
          <Text c="dimmed" ta="center" size="sm">
            {t("app.tagline")}
          </Text>

          <TextInput
            label={t("login.phoneLabel")}
            placeholder={t("login.phonePlaceholder")}
            value={phone}
            onChange={(e) => setPhone(e.currentTarget.value)}
          />
          <Button onClick={handleSignIn} loading={loading} disabled={!phone}>
            {t("login.submit")}
          </Button>

          {error && (
            <Text c="red" size="sm">
              {error}
            </Text>
          )}
        </Stack>
      </Card>
    </Center>
  );
}
