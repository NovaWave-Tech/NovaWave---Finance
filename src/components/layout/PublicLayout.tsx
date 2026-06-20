import { Box } from "@chakra-ui/react";
import { Outlet } from "react-router-dom";
export default function PublicLayout() {
  return (
    <Box minH="100vh">
      <Outlet />
    </Box>
  );
}
