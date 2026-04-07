import React from "react";
import { safeUrl } from "../../shared/safe-url";

interface Props { logo: string; tagline?: string; links: { label: string; href: string }[]; sections: Record<string, boolean>; }

export default function Navbar({ logo, tagline, links, sections }: Props) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <a href="#" className="flex items-center gap-2">
            <span className="text-xl font-black tracking-tight text-gray-900">{logo}</span>
            {tagline && <span className="hidden sm:inline text-xs text-gray-400 border-l border-gray-200 pl-2 ml-1">{tagline}</span>}
          </a>
          <div className="hidden md:flex items-center gap-7">
            {links.filter(l => { const id = l.href.replace("#",""); return !(id in sections) || sections[id]; }).map((l, i) => (
              <a key={i} href={safeUrl(l.href)} className="text-sm font-medium text-gray-500 hover:text-gray-900 transition">{l.label}</a>
            ))}
          </div>
          <a href="#contact" className="hidden sm:inline-flex px-5 py-2 text-sm font-semibold text-white bg-gray-900 rounded-full hover:bg-gray-800 transition">
            Start a Project
          </a>
        </div>
      </div>
    </nav>
  );
}
