
import { Inter } from "next/font/google";
import type { Viewport } from 'next';
import "./globals.css";
import { ThemeProvider } from "./components/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { ViewportProvider } from "@/contexts/ViewportContext";
import { Toaster } from "@/components/ui/sonner"
import ClientLayoutContent from "./ClientLayoutContent";

const inter = Inter({ subsets: ["latin"] });

// RootLayout은 서버 컴포넌트로 유지합니다. 클라이언트 훅은 ClientLayoutContent에서 사용합니다.

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ViewportProvider>
            <AuthProvider>
              <NotificationProvider>
                <ClientLayoutContent>{children}</ClientLayoutContent>
                <Toaster />
              </NotificationProvider>
            </AuthProvider>
          </ViewportProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
