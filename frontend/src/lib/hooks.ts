"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "./api";
import { useAuth } from "./auth";
import { SessionError } from "./session";
import type { Role } from "./types";

export const POLL_INTERVAL_MS = 5000;

/** Redirects to /login when signed out, or to the right home page when the role does not match. */
export const useRequireAuth = (role?: Role) => {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) router.replace("/login");
    else if (role && user.role !== role) router.replace(user.role === "ADMIN" ? "/admin" : "/");
  }, [user, isLoading, role, router]);

  const isReady = !isLoading && !!user && (!role || user.role === role);
  return { user, isReady };
};

/** Loads data once, then again every `intervalMs` while the page is open. */
export const usePolledData = <T>(load: () => Promise<T>, { enabled = true, intervalMs = POLL_INTERVAL_MS } = {}) => {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loadRef = useRef(load);

  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  const reload = useCallback(async () => {
    try {
      setData(await loadRef.current());
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void reload();
    if (!intervalMs) return;
    const timer = setInterval(() => void reload(), intervalMs);
    return () => clearInterval(timer);
  }, [enabled, intervalMs, reload]);

  return { data, error, reload, setData };
};

export const errorMessage = (err: unknown) =>
  err instanceof ApiError || err instanceof SessionError ? err.message : "เกิดข้อผิดพลาดที่ไม่คาดคิด";
