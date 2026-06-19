import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { LoadingState } from '../components/ui/LoadingState';

const FinanceWorkspace = lazy(() => import('../App'));

export default function AppRoutes() {
  return <Suspense fallback={<LoadingState/>}><Routes><Route path="/app" element={<FinanceWorkspace/>}/><Route path="/login" element={<FinanceWorkspace/>}/><Route path="/" element={<Navigate to="/app" replace/>}/><Route path="*" element={<Navigate to="/app" replace/>}/></Routes></Suspense>;
}
