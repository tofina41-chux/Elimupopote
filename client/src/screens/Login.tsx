import { useState } from "react";
import {
  Alert,
  Anchor,
  Box,
  Button,
  Group,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconAlertCircle, IconArrowRight } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../api/client";
import { useAuthContext } from "../context/AuthContext";
import { setAppLanguage } from "../i18n/i18n";

export function Login() {
  const { t, i18n } = useTranslation();
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
    } catch (err: any) {
      setError(err?.response?.data?.error || t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box style={{ display: "flex", minHeight: "100vh" }}>
      {/* Brand panel — hidden on narrow screens */}
      <Box
        visibleFrom="sm"
        style={{
          flex: "1 1 46%",
          background: "linear-gradient(135deg, var(--mantine-color-kilele-7), var(--mantine-color-kilele-9))",
          color: "white",
          padding: "clamp(32px, 6vw, 72px)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box
          style={{
            position: "absolute",
            width: 520,
            height: 520,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(232,150,26,0.18), transparent 70%)",
            top: -160,
            right: -160,
          }}
        />
        <Group gap="xs" style={{ position: "relative" }}>
          <Box
            w={34}
            h={34}
            style={{
              borderRadius: 8,
              background: "var(--mantine-color-jua-5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              color: "var(--mantine-color-kilele-9)",
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            E
          </Box>
          <Text fw={600} size="lg">
            {t("app.name")}
          </Text>
        </Group>

        <Stack gap="sm" style={{ position: "relative", maxWidth: 420 }}>
          <Title order={1} fz={40} lh={1.1}>
            {t("app.tagline")}
          </Title>
          <Text c="kilele.1" fz="md">
            Corporate training built for how Kenyan teams actually work —
            offline-first, bilingual, and ready in minutes.
          </Text>
        </Stack>

        <Group gap="xl" style={{ position: "relative" }}>
          <div>
            <Text fz={24} fw={700}>
              EN / SW
            </Text>
            <Text c="kilele.2" fz="xs">
              Bilingual by default
            </Text>
          </div>
          <div>
            <Text fz={24} fw={700}>
              100%
            </Text>
            <Text c="kilele.2" fz="xs">
              Works offline
            </Text>
          </div>
        </Group>
      </Box>

      {/* Sign-in panel */}
      <Box
        style={{
          flex: "1 1 54%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          background: "var(--mantine-color-gray-0)",
        }}
      >
        <Paper withBorder shadow="md" radius="lg" p="xl" w={380}>
          <Stack gap="lg">
            <Box hiddenFrom="sm">
              <Text fw={700} fz="xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {t("app.name")}
              </Text>
              <Text c="dimmed" size="sm">
                {t("app.tagline")}
              </Text>
            </Box>

            <div>
              <Title order={3}>{t("login.title")}</Title>
              <Text c="dimmed" size="sm" mt={4}>
                Enter your phone number to continue.
              </Text>
            </div>

            <TextInput
              label={t("login.phoneLabel")}
              placeholder={t("login.phonePlaceholder")}
              value={phone}
              onChange={(e) => setPhone(e.currentTarget.value)}
              onKeyDown={(e) => e.key === "Enter" && phone && handleSignIn()}
              size="md"
              autoFocus
            />

            {error && (
              <Alert color="red" variant="light" icon={<IconAlertCircle size={16} />}>
                {error}
              </Alert>
            )}

            <Button
              onClick={handleSignIn}
              loading={loading}
              disabled={!phone}
              size="md"
              rightSection={<IconArrowRight size={16} />}
            >
              {t("login.submit")}
            </Button>

            <Group justify="center" gap="xs">
              <Anchor
                size="xs"
                c={i18n.language === "en" ? "kilele.7" : "dimmed"}
                fw={i18n.language === "en" ? 700 : 400}
                onClick={() => setAppLanguage("en")}
              >
                English
              </Anchor>
              <Text size="xs" c="dimmed">
                ·
              </Text>
              <Anchor
                size="xs"
                c={i18n.language === "sw" ? "kilele.7" : "dimmed"}
                fw={i18n.language === "sw" ? 700 : 400}
                onClick={() => setAppLanguage("sw")}
              >
                Kiswahili
              </Anchor>
            </Group>
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
}
