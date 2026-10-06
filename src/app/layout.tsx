import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getT } from "@/lib/i18n/server";
import { LocaleProvider } from "@/lib/i18n/client";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: "Salda",
    description: t("meta.description"),
    manifest: "/manifest.json",
    icons: {
      icon: "/favicon-32.png",
      apple: "/icons/apple-touch-icon.png",
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: "Salda",
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#f3f2f2",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { locale } = await getT();
  return (
    <html lang={locale} className="h-full">
      <body className="min-h-full">
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
