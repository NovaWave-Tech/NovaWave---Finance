import { Box } from '@chakra-ui/react';import { Outlet } from 'react-router-dom';
export default function AdminLayout(){return <Box minH="100vh" bg="appBg"><Outlet/></Box>}
