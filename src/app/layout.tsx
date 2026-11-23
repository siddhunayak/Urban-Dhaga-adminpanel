import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["500", "700"] });

export const metadata: Metadata = {
  title: "UrbanDhagaa — Order Management",
  description: "Order management, payments and fulfilment for UrbanDhagaa",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`h-full ${sans.variable} ${mono.variable}`}>
      <body className="h-full bg-zinc-50 font-sans antialiased text-zinc-900">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
