import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "C9 Oracle | Tactical Coaching & xRW Telemetry HUD",
  description: "Cloud9 Tactical Intelligence and Micro-Mistake Analysis System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased selection:bg-cyan-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
