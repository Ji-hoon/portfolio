import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import {
  ROLE_DESCRIPTION,
  SITE_TITLE,
  SITE_URL,
  buildSocialMeta,
} from "@/lib/role";
import { Providers } from "@/components/providers";
import Header from "@/components/header";
import Footer from "@/components/footer";
import ScrollRestoration from "@/components/scroll-restoration";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// iOS Safari 노치 및 상태바 대응을 위한 Viewport 설정
export const viewport: Viewport = {
  themeColor: "#ffffff",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: ROLE_DESCRIPTION.frontend,
  ...buildSocialMeta(ROLE_DESCRIPTION.frontend),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${inter.variable} antialiased`}>
      <head>
        <link
          rel="stylesheet"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body className="min-h-screen bg-white text-ink">
        <Providers>
          <Suspense fallback={null}>
            <ScrollRestoration />
          </Suspense>
          <Header />
          <div className="mx-auto max-w-[1920px] px-6 md:px-12 lg:px-16">
            {children}
            <div className="mx-auto w-full max-w-[1200px] px-0 md:px-6 lg:px-6">
              <Footer />
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
