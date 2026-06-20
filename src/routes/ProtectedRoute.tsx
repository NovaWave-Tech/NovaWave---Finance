import { Center, Spinner } from "@chakra-ui/react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <Center minH="100vh">
        <Spinner />
      </Center>
    );
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
