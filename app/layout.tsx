import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/nav";

export const metadata: Metadata = {
  title: "Lokesh Burma | Backend Software Engineer",
  description:
    "Portfolio and technical writing hub for Lokesh Burma, a backend-focused Senior Software Engineer building cloud-native SaaS systems.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Nav />
        {children}
      </body>
    </html>
  );
}
