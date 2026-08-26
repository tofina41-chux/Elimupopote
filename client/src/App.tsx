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
import { InstructorDashboard } from "./screens/InstructorDashboard";
import { LearnerDashboard } from "./screens/LearnerDashboard";
import { AnalyticsDashboard } from "./screens/AnalyticsDashboard";
import { CourseEditor } from "./screens/CourseEditor";
import { CourseView } from "./screens/CourseView";

// Sends each role to their own home screen after login.
function HomeRedirect() {
  const { user } = useAuthContext();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "SUPERADMIN" || user.role === "TENANT_ADMIN")
    return <Navigate to="/admin" replace />;
  if (user.role === "INSTRUCTOR")
    return <Navigate to="/instructor" replace />;
  if (user.role === "LEARNER")
    return <Navigate to="/learner" replace />;
  return <Navigate to="/login" replace />;
}

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
          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* Smart home redirect — sends each role to their own page */}
          <Route path="/" element={<HomeRedirect />} />

          {/* Superadmin + Tenant Admin */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allow={["SUPERADMIN", "TENANT_ADMIN"]}>
                <AdminDashboard />
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

          {/* Instructor */}
          <Route
            path="/instructor"
            element={
              <ProtectedRoute allow={["INSTRUCTOR"]}>
                <InstructorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/courses/new"
            element={
              <ProtectedRoute allow={["INSTRUCTOR"]}>
                <CourseEditor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/courses/:courseId/edit"
            element={
              <ProtectedRoute allow={["INSTRUCTOR"]}>
                <CourseEditor />
              </ProtectedRoute>
            }
          />

          {/* Learner */}
          <Route
            path="/learner"
            element={
              <ProtectedRoute allow={["LEARNER"]}>
                <LearnerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/courses/:courseId"
            element={
              <ProtectedRoute allow={["LEARNER"]}>
                <CourseView />
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
