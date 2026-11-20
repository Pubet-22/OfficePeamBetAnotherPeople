"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { categoryIcon } from "@/components/icons";
import { BinderClip, Ransom, Sticker, Tape } from "@/components/scrapbook";
import { Button, ErrorText, inputClass, Label, Notice } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { errorMessage } from "@/lib/hooks";
import { categoryLabel } from "@/lib/labels";
import { SESSION_MODE } from "@/lib/session";
import type { GeneralCategory } from "@/lib/types";

type Mode = "login" | "register";
type Showcase = { key: "COFFEE" | GeneralCategory; color: "pink" | "sky" | "leaf" | "butter" | "lilac"; tilt: string };

const SHOWCASE: Showcase[] = [
  { key: "COFFEE", color: "butter", tilt: "-rotate-6" },
  { key: "WASH_GLASS", color: "sky", tilt: "rotate-3" },
  { key: "PICKUP_FOOD", color: "pink", tilt: "-rotate-2" },
  { key: "PRINT", color: "leaf", tilt: "rotate-6" },
  { key: "TRASH", color: "lilac", tilt: "-rotate-3" },
];

export default function LoginPage() {
  const { user, isLoading, login, register } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && user) router.replace(user.role === "ADMIN" ? "/admin" : "/");
  }, [user, isLoading, router]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        const { needsEmailConfirmation } = await register(email, password, fullName);
        if (needsEmailConfirmation) setNotice("สมัครแล้ว เปิดอีเมลเพื่อยืนยันก่อนเข้าสู่ระบบ");
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = () => {
    setMode(mode === "login" ? "register" : "login");
    setError(null);
    setNotice(null);
  };

  return (
    <div className="grid items-center gap-14 pt-4 md:grid-cols-[1.15fr_1fr] md:pt-12">
      <div>
        <h1 className="space-y-3">
          <Ransom text="Office" size="lg" seed={0} className="block" />
          <Ransom text="Runner" size="lg" seed={3} className="block pl-8" />
        </h1>
        <p className="mt-6 max-w-md font-hand text-2xl leading-snug text-ink">
          กาแฟแก้วโปรด กับงานเล็กๆ ในออฟฟิศ
          <br />
          ฝากไว้ เดี๋ยวเราเดินไปส่งถึงโต๊ะ
        </p>
        <p className="mt-2 text-ink-soft">เปิดรับทุกวันทำงาน 10:00–16:00 น.</p>
        <ul className="mt-8 flex flex-wrap gap-3" aria-label="บริการ">
          {SHOWCASE.map(({ key, color, tilt }) => {
            const Glyph = categoryIcon[key];
            return (
              <li key={key} className={tilt}>
                <Sticker color={color} className="gap-2 px-4 py-2 text-sm font-medium">
                  <Glyph className="size-5" />
                  {key === "COFFEE" ? "กาแฟ" : categoryLabel[key]}
                </Sticker>
              </li>
            );
          })}
        </ul>
      </div>

      <section className="paper lined relative rotate-1 px-6 pt-10 pb-7 pl-12 sm:px-8 sm:pl-14">
        <BinderClip color="sky" />
        <Tape color="pink" className="-right-6 bottom-6 rotate-[-35deg]" />
        <h2 className="text-3xl">{mode === "login" ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}</h2>
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {mode === "register" && (
            <label className="block">
              <Label>ชื่อ-นามสกุล</Label>
              <input className={inputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </label>
          )}
          <label className="block">
            <Label>อีเมลบริษัท</Label>
            <input
              type="email"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </label>
          <label className="block">
            <Label>รหัสผ่าน</Label>
            <input
              type="password"
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </label>
          <ErrorText message={error} />
          {notice && <Notice>{notice}</Notice>}
          <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
            {mode === "login" ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
          </Button>
        </form>
        <button className="mt-5 w-full text-center font-hand text-lg text-coral hover:underline" onClick={switchMode}>
          {mode === "login" ? "ยังไม่มีบัญชี สมัครสมาชิก" : "มีบัญชีแล้ว เข้าสู่ระบบ"}
        </button>
        {SESSION_MODE === "mock" && (
          <p className="mt-2 text-center text-xs text-ink-soft">โหมดทดสอบ: บัญชีทดสอบอยู่ใน README.md</p>
        )}
      </section>
    </div>
  );
}
