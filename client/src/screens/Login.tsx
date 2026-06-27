import { useState } from "react";
import { Button, Card, Center, Stack, Text, TextInput, Title } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../api/client";
import { useAuthContext } from "../context/AuthContext";

// Two-step phone OTP login. In this MVP the OTP is always "123456" (see
// server/src/services/supabaseAuth.service.ts) so the demo never depends on
// a real SMS provider being configured.
export function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuthContext();

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSendOtp() {
    setError(null);
    setLoading(true);
    try {
      await apiClient.post("/api/auth/request-otp", { phone });
      setStep("otp");
    } catch {
      setError(t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    setError(null);
    setLoading(true);
    try {
      const { data } = await apiClient.post("/api/auth/verify-otp", { phone, otp });
      login(data.token, data.user);
      navigate("/");
    } catch {
      setError(t("common.error"));
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

          {step === "phone" ? (
            <>
              <TextInput
                label={t("login.phoneLabel")}
                placeholder={t("login.phonePlaceholder")}
                value={phone}
                onChange={(e) => setPhone(e.currentTarget.value)}
              />
              <Button onClick={handleSendOtp} loading={loading} disabled={!phone}>
                {t("login.sendOtp")}
              </Button>
            </>
          ) : (
            <>
              <Text size="sm" c="dimmed">
                {t("login.otpSentHint")}
              </Text>
              <TextInput
                label={t("login.otpLabel")}
                value={otp}
                onChange={(e) => setOtp(e.currentTarget.value)}
                maxLength={6}
              />
              <Button onClick={handleVerify} loading={loading} disabled={otp.length !== 6}>
                {t("login.verify")}
              </Button>
            </>
          )}

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
