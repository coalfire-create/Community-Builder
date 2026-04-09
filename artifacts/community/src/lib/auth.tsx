import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useGetMe } from "@workspace/api-client-react";
import type { User } from "@workspace/api-client-react";
import { useLocation } from "wouter";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const { data: user, isLoading, isError, error } = useGetMe({
    query: {
      retry: false,
    }
  });

  const [localUser, setLocalUser] = useState<User | null>(null);

  useEffect(() => {
    if (user) {
      setLocalUser(user);
    } else if (isError) {
      setLocalUser(null);
      // Redirect to login if not authenticated and not on login/register page
      if (location !== "/" && location !== "/register") {
        setLocation("/");
      }
    }
  }, [user, isError, location, setLocation]);

  const logout = () => {
    setLocalUser(null);
    setLocation("/");
  };

  return (
    <AuthContext.Provider
      value={{
        user: localUser,
        isLoading,
        isAuthenticated: !!localUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
