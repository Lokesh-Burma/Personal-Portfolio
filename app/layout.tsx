import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/nav";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "Lokesh Burma | Senior Backend Software Engineer",
  description:
    "Portfolio and technical writing hub for Lokesh Burma, a Senior Backend Software Engineer building distributed SaaS platforms, AWS microservices, and AI-powered operations.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Nav />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
