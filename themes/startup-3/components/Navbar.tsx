import React from "react";
import { safeUrl } from "../../shared/safe-url";

interface Props {
  logo: string;
  links: { label: string; href: string }[];
  sections: Record<string, boolean>;
}

export default function Navbar({ logo, links, sections }: Props) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-cyan-500/10" style={{ background: "rgba(2,6,23,0.85)", backdropFilter: "blur(20px)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <a href="#" className="text-lg font-bold tracking-tight">
            <span className="text-cyan-400">{logo.split(".")[0]}</span>
            <span className="text-gray-500">.{logo.split(".")[1] || "AI"}</span>
          </a>
          <div className="hidden md:flex items-center gap-7">
            {links
              .filter(l => { const id = l.href.replace("#",""); return !(id in sections) || sections[id]; })
              .map((l, i) => (
                <a key={i} href={safeUrl(l.href)} className="text-sm text-gray-400 hover:text-cyan-400 transition duration-300">{l.label}</a>
              ))}
          </div>
          <a href="#contact" className="hidden sm:inline-flex items-center gap-2 px-5 py-2 text-sm font-medium border border-cyan-500/30 text-cyan-400 rounded-lg hover:bg-cyan-500/10 hover:border-cyan-500/60 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] transition duration-300">
            Get Started
          </a>
        </div>
      </div>
    </nav>
  );
}
