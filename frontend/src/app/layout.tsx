import type { Metadata } from "next";
import { Anuphan, Chonburi, Itim, Mitr } from "next/font/google";
import { Suspense } from "react";
import { NavBar } from "@/components/NavBar";
import { AuthProvider } from "@/lib/auth";
import "./globals.css";

const itim = Itim({ variable: "--font-itim", subsets: ["thai", "latin"], weight: "400" });
const mitr = Mitr({ variable: "--font-mitr", subsets: ["thai", "latin"], weight: ["500", "700"] });
const chonburi = Chonburi({ variable: "--font-chonburi", subsets: ["thai", "latin"], weight: "400" });
const anuphan = Anuphan({ variable: "--font-anuphan", subsets: ["thai", "latin"] });

export const metadata: Metadata = {
  title: "Office Runner",
  description: "สั่งกาแฟและฝากงานจิปาถะในออฟฟิศ ส่งถึงโต๊ะ",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="th"
      className={`${itim.variable} ${mitr.variable} ${chonburi.variable} ${anuphan.variable} h-full antialiased`}
    >
      <body className="min-h-full overflow-x-clip">
        <AuthProvider>
          <Suspense>
            <NavBar />
          </Suspense>
          <main className="mx-auto max-w-5xl px-4 pt-8 pb-28 sm:px-6">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
