import { Inter } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "sonner";
import { AntdProvider } from "@/providers/AntdProvider";
import { ClientInitializer } from "@/components/ClientInitializer";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="zh-CN"
      suppressHydrationWarning
    >
      <body
        className={inter.className}
        suppressHydrationWarning
      >
        <ClientInitializer>
          <NuqsAdapter>
            <AntdProvider>{children}</AntdProvider>
          </NuqsAdapter>
        </ClientInitializer>
        <Toaster />
      </body>
    </html>
  );
}
