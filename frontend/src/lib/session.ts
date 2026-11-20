// Sign-in and file upload.
//
// Sign-in always goes to the API's own endpoints, POST {API}/auth/login and /auth/register
// (AuthController on the Spring Boot backend, or the same routes in /mock-api). The JWT that
// comes back is kept in localStorage and sent as `Authorization: Bearer <token>`.
//
// Uploads (payment slips, files to print):
//   - mock mode  → /mock-api/uploads returns a fake URL
//   - backend    → Supabase Storage with the project's anon key, when
//                  NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY are set
//                  (the backend has no upload endpoint of its own yet)

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { API_BASE_URL } from "./config";

export type UploadBucket = "slips" | "attachments";

export type SessionBackend = {
  mode: "backend" | "mock";
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
  /** Uploads a file and returns a URL the backend can store. */
  uploadFile: (bucket: UploadBucket, file: File) => Promise<string>;
};

export class SessionError extends Error {}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const TOKEN_KEY = "accessToken";

export const SESSION_MODE: SessionBackend["mode"] = API_BASE_URL.startsWith("/mock-api") ? "mock" : "backend";

// Matches runs of characters that are not letters, digits, "_", "." or "-" so they can become "_".
// Matches: " (" in "my file (1).pdf" → "my_file_1_.pdf". Leaves "report-v2.pdf" unchanged.
// Try it: https://regex101.com/?regex=%5B%5E%5Cw.-%5D%2B&testString=my%20file%20(1).pdf&flags=g
const UNSAFE_FILENAME_CHARS = /[^\w.-]+/g;
const safeFileName = (name: string) => name.replace(UNSAFE_FILENAME_CHARS, "_");

const post = async <T>(path: string, init: RequestInit): Promise<T> => {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { method: "POST", ...init });
  } catch {
    throw new SessionError("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ (หลังบ้านเปิดอยู่ไหม?)");
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const fieldMessage = body.fields ? Object.values(body.fields)[0] : null;
    throw new SessionError(String(fieldMessage ?? body.message ?? "เกิดข้อผิดพลาด"));
  }
  return body as T;
};

const signInWith = async (path: string, payload: object) => {
  const { accessToken } = await post<{ accessToken: string }>(path, {
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  localStorage.setItem(TOKEN_KEY, accessToken);
};

const uploadToMock = async (bucket: UploadBucket, file: File) => {
  const form = new FormData();
  form.append("bucket", bucket);
  form.append("file", file);
  const { url } = await post<{ url: string }>("/uploads", { body: form });
  return url;
};

const uploadToSupabase = (client: SupabaseClient) => async (bucket: UploadBucket, file: File) => {
  const path = `uploads/${Date.now()}-${safeFileName(file.name)}`;
  const { error } = await client.storage.from(bucket).upload(path, file);
  if (error) throw new SessionError(`อัปโหลดไฟล์ไม่สำเร็จ: ${error.message}`);
  return client.storage.from(bucket).getPublicUrl(path).data.publicUrl;
};

const uploadUnavailable = async () => {
  throw new SessionError("ยังอัปโหลดไฟล์ไม่ได้: ยังไม่ได้ตั้งค่า Supabase Storage ใน .env.local");
};

const chooseUploader = (): SessionBackend["uploadFile"] => {
  if (SESSION_MODE === "mock") return uploadToMock;
  if (SUPABASE_URL && SUPABASE_ANON_KEY) return uploadToSupabase(createClient(SUPABASE_URL, SUPABASE_ANON_KEY));
  return uploadUnavailable;
};

const createSessionBackend = (): SessionBackend => ({
  mode: SESSION_MODE,
  signIn: (email, password) => signInWith("/auth/login", { email, password }),
  signUp: async (email, password, fullName) => {
    await signInWith("/auth/register", { email, password, fullName });
    return { needsEmailConfirmation: false };
  },
  signOut: async () => localStorage.removeItem(TOKEN_KEY),
  getAccessToken: async () => localStorage.getItem(TOKEN_KEY),
  uploadFile: chooseUploader(),
});

let backend: SessionBackend | null = null;

/** Lazily created so nothing touches localStorage during server rendering. */
export const session = (): SessionBackend => (backend ??= createSessionBackend());
