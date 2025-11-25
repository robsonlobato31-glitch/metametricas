import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import Campanhas from "./pages/Campanhas";
import Metricas from "./pages/Metricas";
import MetaAds from "./pages/MetaAds";
import GoogleAds from "./pages/GoogleAds";
import AlertaGasto from "./pages/AlertaGasto";
import Settings from "./pages/Settings";
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
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/campanhas"
                element={
                  <ProtectedRoute>
                    <Campanhas />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/metricas"
                element={
                  <ProtectedRoute>
                    <Metricas />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/meta-ads"
                element={
                  <ProtectedRoute>
                    <MetaAds />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/google-ads"
                element={
                  <ProtectedRoute>
                    <GoogleAds />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/alerta-gasto"
                element={
                  <ProtectedRoute>
                    <AlertaGasto />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                }
              />

              {/* Catch-all 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
