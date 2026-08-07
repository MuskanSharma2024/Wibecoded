import { Geist_Mono } from "next/font/google";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Vera | AI Security Log",
  description: "Autonomous AI Security Research Feed",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-mono selection:bg-accent-green selection:text-black">
        {children}
      </body>
    </html>
  );
}
