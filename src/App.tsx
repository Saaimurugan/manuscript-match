import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { queryClient } from "./lib/queryClient";
import { config } from "./lib/config";
import { AuthProviderWithErrorBoundary } from "./components/auth/AuthProviderWithErrorBoundary";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { LoginForm } from "./components/auth/LoginForm";
import { 
  ErrorBoundary, 
  NetworkStatusToast, 
  GlobalErrorToastHandler,
  initializeGlobalErrorHandlers 
} from "./components/error";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AcceptInvitation from "./pages/AcceptInvitation";
import Reports from "./pages/Reports";
import { ScholarFinderApp } from "./features/scholarfinder";

// Initialize global error handlers
initializeGlobalErrorHandlers();

const App = () => (
  <ErrorBoundary
    onError={(error, errorInfo) => {
      console.error('App-level error:', error, errorInfo);
    }}
    showErrorDetails={config.enableDevTools}
    enableReporting={true}
  >
    <QueryClientProvider client={queryClient}>
      <AuthProviderWithErrorBoundary enableAutoRecovery={true} maxRecoveryAttempts={3}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <NetworkStatusToast />
          <GlobalErrorToastHandler />
          <BrowserRouter>
            <ErrorBoundary enableReporting={true}>
              <Routes>
                <Route path="/login" element={<LoginForm />} />
                <Route path="/" element={
                  <ProtectedRoute>
                    <Index />
                  </ProtectedRoute>
                } />
                <Route path="/reports" element={
                  <ProtectedRoute>
                    <Reports />
                  </ProtectedRoute>
                } />
                <Route path="/accept-invitation" element={<AcceptInvitation />} />
                <Route path="/scholarfinder/*" element={
                  <ProtectedRoute>
                    <ScholarFinderApp />
                  </ProtectedRoute>
                } />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </ErrorBoundary>
          </BrowserRouter>
          {config.enableDevTools && <ReactQueryDevtools initialIsOpen={false} />}
        </TooltipProvider>
      </AuthProviderWithErrorBoundary>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
