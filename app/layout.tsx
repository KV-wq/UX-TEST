import type { Metadata } from "next";
import "./globals.css";

const title = "TEST UX - демо AI-CRM";
const description =
  "Демо AI CRM: чат-ассистент сам регистрирует и достраивает интерфейс в реальном времени.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    url: "/",
    siteName: "TEST UX",
    locale: "ru_RU",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: title,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og.png"],
  },
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
