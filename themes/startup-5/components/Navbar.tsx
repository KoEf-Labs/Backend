import React from "react";

interface Props { logo: string; links: { label: string; href: string }[]; sections: Record<string, boolean>; }

export default function Navbar({ logo, links, sections }: Props) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 border-b border-gray-100">
          <a href="#" className="text-sm font-medium text-gray-900 tracking-tight">{logo}</a>
          <div className="hidden md:flex items-center gap-6">
            {links.filter(l => { const id = l.href.replace("#",""); return !(id in sections) || sections[id]; }).map((l, i) => (
              <a key={i} href={l.href} className="text-[13px] text-gray-400 hover:text-gray-900 transition">{l.label}</a>
            ))}
          </div>
          <a href="#contact" className="text-[13px] font-medium text-gray-900 hover:text-gray-600 transition">Contact &rarr;</a>
        </div>
      </div>
    </nav>
  );
}
