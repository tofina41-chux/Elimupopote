import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppShell, Group, Title, Button } from "@mantine/core";
import { useTranslation } from "react-i18next";

import { AuthProvider, useAuthContext } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { SyncStatusIndicator } from "./components/SyncStatusIndicator";
import { startSyncManager } from "./db/syncManager";
import { setAppLanguage } from "./i18n/i18n";

import { Login } from "./screens/Login";
import { AdminDashboard } from "./screens/AdminDashboard";
import { CourseBuilder } from "./screens/CourseBuilder";
import { LearnerCourseView } from "./screens/LearnerCourseView";
import { AnalyticsDashboard } from "./screens/AnalyticsDashboard";

function Shell() {
  const { t } = useTranslation();
  const { user, logout } = useAuthContext();

  useEffect(() => {
    startSyncManager();
  }, []);

  return (
    <AppShell header={{ height: 60 }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Title order={4}>{t("app.name")}</Title>
          <Group>
            <SyncStatusIndicator />
            <Button variant="subtle" size="xs" onClick={() => setAppLanguage("en")}>
              EN
            </Button>
            <Button variant="subtle" size="xs" onClick={() => setAppLanguage("sw")}>
              SW
            </Button>
            {user && (
              <Button variant="light" size="xs" onClick={logout}>
                {t("nav.logout")}
              </Button>
            )}
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/"
            element={
              <ProtectedRoute allow={["SUPERADMIN", "TENANT_ADMIN"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/courses/new"
            element={
              <ProtectedRoute allow={["INSTRUCTOR"]}>
                <CourseBuilder />
              </ProtectedRoute>
            }
          />
          <Route
            path="/courses/:courseId"
            element={
              <ProtectedRoute allow={["LEARNER"]}>
                <LearnerCourseView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute allow={["TENANT_ADMIN"]}>
                <AnalyticsDashboard />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell.Main>
    </AppShell>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </BrowserRouter>
  );
}
