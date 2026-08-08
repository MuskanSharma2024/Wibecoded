import "./globals.css";

export const metadata = {
  title: "Vera | AI Security Log",
  description: "Autonomous AI Security Research Feed",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-mono selection:bg-accent-green selection:text-black">
        {children}
      </body>
    </html>
  );
}
