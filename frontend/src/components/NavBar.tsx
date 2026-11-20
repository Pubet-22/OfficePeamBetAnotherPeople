"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Ransom } from "./scrapbook";
import { Coins, cx, PremiumMark } from "./ui";

const customerLinks = [
  { href: "/", label: "สั่ง" },
  { href: "/orders", label: "ออเดอร์" },
  { href: "/wallet", label: "กระเป๋าเงิน" },
];
const adminLinks = [{ href: "/admin", label: "ราวใบสั่ง" }];

const isActive = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

export const NavBar = () => {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  if (!user) return null;
  const links = user.role === "ADMIN" ? adminLinks : customerLinks;

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const navLinks = (className: string) =>
    links.map((link) => (
      <Link
        key={link.href}
        href={link.href}
        aria-current={isActive(pathname, link.href) ? "page" : undefined}
        className={cx(
          className,
          isActive(pathname, link.href)
            ? "bg-coral text-paper"
            : "text-ink-soft hover:bg-butter-soft hover:text-ink",
        )}
      >
        {link.label}
      </Link>
    ));

  return (
    <>
      <header className="sticky top-0 z-20 bg-cream/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:gap-5 sm:px-6">
          <Link href={user.role === "ADMIN" ? "/admin" : "/"} aria-label="Office Runner หน้าแรก" className="shrink-0">
            <Ransom text="Office Runner" size="sm" seed={2} nowrap />
          </Link>
          <nav className="hidden gap-1 sm:flex" aria-label="เมนูหลัก">
            {navLinks("rounded-full px-4 py-1.5 font-chunky text-sm whitespace-nowrap transition-colors")}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            {user.role === "USER" && (
              <Link href="/wallet" className="rounded-full border-2 border-line bg-paper px-3 py-1 font-medium hover:border-butter">
                <Coins amount={user.coinBalance} />
              </Link>
            )}
            {user.premium && <PremiumMark />}
            <span className="hidden font-hand text-base text-ink-soft lg:inline">{user.fullName ?? user.email}</span>
            <button onClick={handleLogout} className="rounded-full px-3 py-1 whitespace-nowrap text-ink-soft hover:bg-butter-soft hover:text-ink">
              <span className="lg:hidden">ออก</span>
              <span className="hidden lg:inline">ออกจากระบบ</span>
            </button>
          </div>
        </div>
        {/* gingham ribbon under the bar */}
        <div className="gingham h-2.5 opacity-80" aria-hidden />
      </header>

      <nav
        aria-label="เมนูหลัก"
        className="fixed inset-x-3 bottom-3 z-20 flex gap-1 rounded-2xl bg-paper p-1.5 shadow-[0_10px_24px_-12px_rgb(59_42_32/0.5)] sm:hidden"
      >
        {navLinks("flex-1 rounded-xl py-2.5 text-center font-chunky text-sm transition-colors")}
      </nav>
    </>
  );
};
