"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "./api";
import { session } from "./session";
import type { Me } from "./types";

type AuthState = {
  user: Me | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<Me | null>;
  register: (email: string, password: string, fullName: string) => Promise<{ needsEmailConfirmation: boolean }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<Me | null>;
};

const AuthContext = createContext<AuthState | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<Me | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    if (!(await session().getAccessToken())) {
      setUser(null);
      return null;
    }
    try {
      const me = await api.me.get();
      setUser(me);
      return me;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    const loadInitialUser = async () => {
      await refreshUser();
      setIsLoading(false);
    };
    void loadInitialUser();
  }, [refreshUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      await session().signIn(email, password);
      return refreshUser();
    },
    [refreshUser],
  );

  const register = useCallback(
    async (email: string, password: string, fullName: string) => {
      const result = await session().signUp(email, password, fullName);
      if (!result.needsEmailConfirmation) await refreshUser();
      return result;
    },
    [refreshUser],
  );

  const logout = useCallback(async () => {
    await session().signOut();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, login, register, logout, refreshUser }),
    [user, isLoading, login, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
};
