import "./globals.css";
import NextAuthSessionProvider from "@/components/SessionProvider";

export const metadata = {
  title: "Portfolio Tracker",
  description: "MVP Portfolio Dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <NextAuthSessionProvider>
          {children}
        </NextAuthSessionProvider>
      </body>
    </html>
  );
}
