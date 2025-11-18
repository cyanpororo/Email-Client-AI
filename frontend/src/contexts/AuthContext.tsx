import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import * as authApi from "../api/auth";
import {
  getAccessToken,
  getRefreshToken,
  clearTokens,
  setAccessToken,
} from "../api/client";

type User = {
  id: string;
  email: string;
  role: string;
  created_at?: string;
};

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasRole: (role: string | string[]) => boolean;
  login: (email: string, password: string) => Promise<void>;
  googleLogin: (credential: string) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
  isAuthenticating: boolean; // added
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const refreshTimeoutRef = useRef<number | null>(null);

  const clearRefreshTimer = () => {
    if (refreshTimeoutRef.current) {
      window.clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
  };

  const decodeExp = (token: string): number | null => {
    try {
      const payload = JSON.parse(atob(token.split(".")[1] ?? ""));
      return typeof payload?.exp === "number" ? payload.exp : null;
    } catch {
      return null;
    }
  };

  const scheduleProactiveRefresh = (token: string) => {
    const exp = decodeExp(token);
    if (!exp) return;

    const nowSec = Math.floor(Date.now() / 1000);
    const leadSec = 60; // refresh 60s before expiry
    const delayMs = Math.max(exp - nowSec - leadSec, 0) * 1000;

    clearRefreshTimer();
    refreshTimeoutRef.current = window.setTimeout(async () => {
      const refresh = getRefreshToken();
      if (!refresh) {
        clearTokens();
        setUser(null);
        return;
      }
      try {
        const { accessToken } = await authApi.refreshAccessToken(refresh);
        setAccessToken(accessToken);
        scheduleProactiveRefresh(accessToken);
        // Optionally refresh profile in background
        queryClient.invalidateQueries({ queryKey: ["profile"] });
      } catch {
        clearTokens();
        setUser(null);
        window.location.href = "/login"; // ensure redirect on refresh failure
      }
    }, delayMs);
  };

  // Silent bootstrap + schedule proactive refresh if we obtain a token
  useEffect(() => {
    let cancelled = false;
    const bootstrap = async () => {
      try {
        if (!getAccessToken()) {
          const refresh = getRefreshToken();
          if (refresh) {
            const { accessToken } = await authApi.refreshAccessToken(refresh);
            if (!cancelled) {
              setAccessToken(accessToken);
              scheduleProactiveRefresh(accessToken);
            }
          }
        } else {
          const token = getAccessToken()!;
          scheduleProactiveRefresh(token);
        }
      } catch {
        clearTokens();
        setUser(null);
        window.location.href = "/login"; // ensure redirect on refresh failure
      } finally {
        if (!cancelled) setInitializing(false);
      }
    };
    bootstrap();
    return () => {
      cancelled = true;
      clearRefreshTimer();
    };
  }, [queryClient]);

  const {
    data: profileData,
    isLoading: isProfileLoading,
    isError,
  } = useQuery({
    queryKey: ["profile"],
    queryFn: authApi.getProfile,
    enabled: !initializing && Boolean(getAccessToken()),
    retry: false,
  });

  useEffect(() => {
    if (profileData) {
      setUser({
        id: profileData.id,
        email: profileData.email,
        role: profileData.role,
        created_at: profileData.created_at,
      });
    }
  }, [profileData]);

  useEffect(() => {
    if (isError) {
      clearTokens();
      setUser(null);
    }
  }, [isError]);

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      setUser(data.user);
      setError(null);
      // Schedule proactive refresh using the freshly issued access token
      scheduleProactiveRefresh(data.accessToken);
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      navigate("/inbox");
    },
    onError: (err: any) => {
      const message =
        err?.response?.data?.message || err.message || "Login failed";
      setError(message);
    },
  });

  const googleLoginMutation = useMutation({
    mutationFn: authApi.googleLogin,
    onSuccess: (data) => {
      setUser(data.user);
      setError(null);
      scheduleProactiveRefresh(data.accessToken);
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      navigate("/inbox");
    },
    onError: (err: any) => {
      const message =
        err?.response?.data?.message || err.message || "Google login failed";
      setError(message);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      clearRefreshTimer();
      setUser(null);
      setError(null);
      queryClient.clear();
      navigate("/login"); // redirect to login after logout
    },
  });

  const login = async (email: string, password: string) => {
    setError(null);
    await loginMutation.mutateAsync({ email, password });
  };

  const googleLogin = async (credential: string) => {
    setError(null);
    await googleLoginMutation.mutateAsync({ credential });
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  const hasRole = (requiredRole: string | string[]) => {
    if (!user) return false;
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    return roles.includes(user.role);
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: Boolean(user),
    isLoading: initializing || isProfileLoading,
    hasRole,
    login,
    googleLogin,
    logout,
    error,
    isAuthenticating: loginMutation.isPending || googleLoginMutation.isPending, // added
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
