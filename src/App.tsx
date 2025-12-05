import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { RealtimeAlertsProvider } from "@/contexts/RealtimeAlertsContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import { DashboardLayout } from "@/components/DashboardLayout";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import Campanhas from "./pages/Campanhas";
import Metricas from "./pages/Metricas";
import Relatorios from "./pages/Relatorios";
import MetaAds from "./pages/MetaAds";
import GoogleAds from "./pages/GoogleAds";
import CampanhasGoogleAds from "./pages/CampanhasGoogleAds";
import AlertaGasto from "./pages/AlertaGasto";
import BudgetDashboard from "./pages/BudgetDashboard";
import Settings from "./pages/Settings";
import AdminUsers from "./pages/AdminUsers";
import Plans from "./pages/Plans";
import Workspaces from "./pages/Workspaces";
import WorkspaceMembers from "./pages/WorkspaceMembers";
import WorkspaceSettings from "./pages/WorkspaceSettings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" storageKey="dashboard-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <RealtimeAlertsProvider>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />

                {/* Protected Routes */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <Dashboard />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/campanhas"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <Campanhas />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/metricas"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <Metricas />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/relatorios"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <Relatorios />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/meta-ads"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <MetaAds />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/google-ads"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <GoogleAds />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/google-ads/campanhas"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <CampanhasGoogleAds />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/alerta-gasto"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <AlertaGasto />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/budget-dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <BudgetDashboard />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <Settings />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/users"
                  element={
                    <AdminRoute>
                      <DashboardLayout>
                        <AdminUsers />
                      </DashboardLayout>
                    </AdminRoute>
                  }
                />
                <Route
                  path="/plans"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <Plans />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/workspaces"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <Workspaces />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/workspaces/:workspaceId/members"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <WorkspaceMembers />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/workspaces/:workspaceId/settings"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <WorkspaceSettings />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />

                {/* Catch-all 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </RealtimeAlertsProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
