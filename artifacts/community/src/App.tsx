import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Layout } from "@/components/layout";
import { Login } from "@/pages/login";
import { Register } from "@/pages/register";
import { Feed } from "@/pages/feed";
import { PostDetail } from "@/pages/post-detail";
import { AnnouncementDetail } from "@/pages/announcement-detail";
import { Write } from "@/pages/write";
import { Admin } from "@/pages/admin";
import { Blocked } from "@/pages/blocked";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: false,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/" />;
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/blocked" component={Blocked} />
        <Route path="/feed">
          <ProtectedRoute>
            <Feed />
          </ProtectedRoute>
        </Route>
        <Route path="/post/:id">
          <ProtectedRoute>
            <PostDetail />
          </ProtectedRoute>
        </Route>
        <Route path="/announcement/:id">
          <ProtectedRoute>
            <AnnouncementDetail />
          </ProtectedRoute>
        </Route>
        <Route path="/write">
          <ProtectedRoute>
            <Write />
          </ProtectedRoute>
        </Route>
        <Route path="/admin">
          <ProtectedRoute>
            <Admin />
          </ProtectedRoute>
        </Route>
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
