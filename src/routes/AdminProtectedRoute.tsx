import { Navigate, Outlet } from 'react-router-dom';
export default function AdminProtectedRoute({ isAdmin = false }: { isAdmin?: boolean }) { return isAdmin ? <Outlet/> : <Navigate to="/" replace/>; }
