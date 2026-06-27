import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";

type Role = "SUPERADMIN" | "TENANT_ADMIN" | "INSTRUCTOR" | "LEARNER";

// Wraps a screen; redirects to /login if unauthenticated, or to "/" if the
// user's role isn't in `allow`. Keeps role-gating declarative in App.tsx
// rather than scattered as if-checks inside every screen component.
export function ProtectedRoute({ allow, children }: { allow: Role[]; children: ReactNode }) {
  const { user } = useAuthContext();

  if (!user) return <Navigate to="/login" replace />;
  if (!allow.includes(user.role)) return <Navigate to="/" replace />;

  return <>{children}</>;
}
