import '@ant-design/v5-patch-for-react-19'; // Ant Design React 19 호환성 패치 임포트
import type { Viewport } from 'next';
import "./globals.css";
import { ThemeProvider } from "./components/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ViewportProvider } from "@/contexts/ViewportContext";
import AntApp from 'antd/es/app'; // Ant Design의 App 컴포넌트 임포트
import ClientLayoutContent from "./ClientLayoutContent";

// RootLayout은 서버 컴포넌트로 유지합니다. 클라이언트 훅은 ClientLayoutContent에서 사용합니다.

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <ViewportProvider>
            <AuthProvider>
              <NotificationProvider>
                <AntApp>
                  <ClientLayoutContent>{children}</ClientLayoutContent>
                </AntApp>
              </NotificationProvider>
            </AuthProvider>
          </ViewportProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
