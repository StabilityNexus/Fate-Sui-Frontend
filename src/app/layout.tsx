import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/themeProvider";
import { ProviderSui } from "@/Providers/SuiProvider";
import AppLoader from "@/components/Loader";
import { Toaster } from "react-hot-toast";
import ReactQueryProvider from "@/Providers/QueryClientProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fate Protocol",
  description:
    "Decentralized prediction markets with dual vaults. Buy and sell bullCoins and bearCoins to predict market trends.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
   <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ProviderSui>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
          >
            <AppLoader minDuration={700}>
              {" "}
              <ReactQueryProvider>{children}</ReactQueryProvider>
              <Toaster />
            </AppLoader>
          </ThemeProvider>
        </ProviderSui>
      </body>
    </html>
  );
}
