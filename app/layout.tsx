import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TEST UX - демо AI-CRM",
  description:
    "Демо AI CRM: чат-ассистент сам регистрирует и достраивает интерфейс в реальном времени.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className="dark">
      <head>
        <link
          rel="stylesheet"
          href="https://rsms.me/inter/inter.css"
        />
      </head>
      <body className="min-h-screen antialiased bg-bg text-ink selection:bg-accent/30">
        {children}
      </body>
    </html>
  );
}
