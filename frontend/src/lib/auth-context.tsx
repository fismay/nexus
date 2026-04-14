"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { api } from "@/lib/api";

interface User {
  id: string;
  username: string;
  email: string;
  display_name: string | null;
  created_at: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState>({
  user: null, token: null, loading: true,
  login: async () => {}, register: async () => {}, logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("nexus_token");
    if (stored) {
      setToken(stored);
      api.setToken(stored);
      api.getMe().then((u) => setUser(u as unknown as User)).catch(() => {
        localStorage.removeItem("nexus_token");
        setToken(null);
        api.setToken(null);
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await api.login(username, password);
    localStorage.setItem("nexus_token", res.access_token);
    setToken(res.access_token);
    api.setToken(res.access_token);
    setUser(res.user as unknown as User);
  }, []);

  const register = useCallback(async (username: string, email: string, password: string) => {
    const res = await api.register(username, email, password);
    localStorage.setItem("nexus_token", res.access_token);
    setToken(res.access_token);
    api.setToken(res.access_token);
    setUser(res.user as unknown as User);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("nexus_token");
    setToken(null);
    setUser(null);
    api.setToken(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
