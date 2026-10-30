import type { Metadata } from "next";
import "./globals.css";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { Nav } from "@/components/nav";

export const metadata: Metadata = {
  title: "Lokesh Burma | Senior Backend Software Engineer",
  description:
    "Portfolio and technical writing hub for Lokesh Burma, a Senior Backend Software Engineer building distributed SaaS platforms, AWS microservices, and AI-powered operations.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} /></head>
      <body>
        <Nav />
        {children}
        <footer className="border-t border-line"><div className="mx-auto flex max-w-6xl flex-col justify-between gap-4 px-5 py-8 text-xs text-subtle sm:flex-row"><span className="tracking-[.15em]">LOKESH BURMA / ENGINEERING & IDEAS</span><span className="flex gap-5"><a href="/blog" className="hover:text-accent-soft">Writing</a><a href="/techcanvas" className="hover:text-accent-soft">TechCanvas</a><a href="/contact" className="hover:text-accent-soft">Contact</a></span></div></footer>
      </body>
    </html>
  );
}
