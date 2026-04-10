import { createContext, useContext, useEffect, ReactNode } from "react";
import { useGetMe, getGetMeQueryKey, useLogout } from "@workspace/api-client-react";
import type { User } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: user, isLoading, isError, isFetching } = useGetMe({
    query: {
      retry: false,
    }
  });
  const { mutate: logoutMutate } = useLogout();

  useEffect(() => {
    if (isError && !isFetching) {
      if (location !== "/" && location !== "/register") {
        setLocation("/");
      }
    }
  }, [isError, isFetching, location, setLocation]);

  const logout = () => {
    logoutMutate(undefined, {
      onSettled: () => {
        queryClient.setQueryData(getGetMeQueryKey(), undefined);
        setLocation("/");
      },
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        isAuthenticated: !!user,
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
