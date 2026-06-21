import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '内容生成 tools',
  description: '本地内容生成工作台',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  );
}