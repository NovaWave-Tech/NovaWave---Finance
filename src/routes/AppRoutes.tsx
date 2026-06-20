import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { LoadingState } from "../components/ui/LoadingState";
import ProtectedRoute from "./ProtectedRoute";
const Landing = lazy(() => import("../pages/Landing"));
const Auth = lazy(() => import("../pages/Auth"));
const FinanceWorkspace = lazy(() => import("../App"));
export default function AppRoutes() {
  return (
    <Suspense fallback={<LoadingState />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Auth mode="login" />} />
        <Route path="/cadastro" element={<Auth mode="register" />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/app/*" element={<FinanceWorkspace />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
