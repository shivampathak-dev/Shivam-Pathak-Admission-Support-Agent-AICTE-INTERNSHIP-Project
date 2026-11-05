"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { apiClient } from "@/lib/api";
import type { AuthState, User } from "@/types";

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
  });

  // Rehydrate token on first render
  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      setState((s) => ({ ...s, isLoading: false }));
      return;
    }
    apiClient.setToken(token);
    apiClient
      .me()
      .then((user) => {
        setState({ user, token, isLoading: false });
      })
      .catch(() => {
        apiClient.setToken(null);
        setState({ user: null, token: null, isLoading: false });
      });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiClient.login(email, password);
    apiClient.setToken(res.access_token);
    setState({ user: res.user, token: res.access_token, isLoading: false });
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const res = await apiClient.register(name, email, password);
      apiClient.setToken(res.access_token);
      setState({ user: res.user, token: res.access_token, isLoading: false });
    },
    []
  );

  const logout = useCallback(() => {
    apiClient.setToken(null);
    setState({ user: null, token: null, isLoading: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
