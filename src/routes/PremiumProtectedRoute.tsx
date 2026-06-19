import { Navigate, Outlet } from 'react-router-dom';
export default function PremiumProtectedRoute({ active = false }: { active?: boolean }) { return active ? <Outlet/> : <Navigate to="/planos" replace/>; }
