import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "@/components/ui/sonner"; // ДОБАВИТЬ

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "Система учёта ЗГТ",
  description: "Система учёта защиты государственной тайны",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster /> {/* ДОБАВИТЬ */}
        </Providers>
      </body>
    </html>
  );
}