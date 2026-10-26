"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
const links = [
  { href: "/", label: "Home" }, { href: "/projects", label: "Projects" },
  { href: "/blog", label: "Writing" }, { href: "/techcanvas", label: "TechCanvas" },
  { href: "/experience", label: "Experience" }, { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];
export function Nav() {
  const pathname=usePathname();
  const navigation=links.map(link=>{
    const active=link.href==='/'?pathname==='/':pathname.startsWith(link.href);
    return <Link key={link.href} href={link.href} aria-current={active?'page':undefined} className={`shrink-0 rounded-md px-3 py-2 text-xs font-medium transition ${active?'bg-accent/10 text-accent-soft':'text-subtle hover:bg-panel-raised hover:text-ink'}`}>{link.label}</Link>;
  });
  return <header className="sticky top-0 z-20 border-b border-line bg-canvas/95 backdrop-blur">
    <nav aria-label="Main navigation" className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-5 lg:px-8">
      <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="Lokesh Burma home"><span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-xl border border-accent/30 bg-accent/10 text-sm font-bold text-accent-soft">LB</span><span className="text-sm font-semibold tracking-tight text-ink">Lokesh Burma<span className="mt-1 block text-[9px] font-medium tracking-[.18em] text-subtle">ENGINEERING & IDEAS</span></span></Link>
      <div className="hidden items-center gap-1 lg:flex">{navigation}</div>
      <Link href="mailto:lokesh.burma@outlook.com?subject=Resume%20request" className="shrink-0 rounded-lg border border-line bg-panel px-4 py-2 text-xs font-semibold text-ink transition hover:border-accent/60">Let’s talk</Link>
    </nav>
    <nav aria-label="Mobile navigation" className="flex gap-1 overflow-x-auto border-t border-line px-4 py-2 lg:hidden">{navigation}</nav>
  </header>;
}
