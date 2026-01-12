import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { AuthProvider } from "@/lib/auth-provider";
import { ThemeProvider } from "@/lib/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { BusinessThemeProvider } from '@/lib/business-theme-provider';

export const metadata: Metadata = {
  title: "791 Barber - Gestão de Barbearia",
  description: "Sistema completo de gestão para barbearias tradicionais",
  icons: {
    icon: [
      { url: "https://791barber.com/favicon.ico?v=205", sizes: "any" },
      { url: "https://791barber.com/favicon.ico?v=205", type: "image/x-icon" },
    ],
    apple: [
      { url: "https://791barber.com/favicon.ico?v=205", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-950 text-slate-50`}
      >
        <ThemeProvider>
          <AuthProvider>
            <BusinessThemeProvider>
              {children}
            </BusinessThemeProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
