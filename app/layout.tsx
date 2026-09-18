import type { Metadata } from "next";
import "./globals.css";
import {ThemeProvider} from "./theme-provider";

export const metadata: Metadata = {
  title: "Clareza | Gestão financeira",
  description: "Seu dinheiro, com clareza. Finanças pessoais e empresariais.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="antialiased"><ThemeProvider>{children}</ThemeProvider></body>
    </html>
  );
}
