import React from "react";
import { safeUrl } from "../../shared/safe-url";
import { SocialIcon } from "./Icons";

interface Props {
  logo: string;
  description: string;
  copyright: string;
  socialLinks: { platform: string; url: string }[];
  links: { label: string; url: string }[];
  navLinks: { label: string; href: string }[];
  sections: Record<string, boolean>;
}

export default function Footer(props: Props) {
  return (
    <footer className="bg-[#010309] border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          <div className="lg:col-span-2">
            <p className="text-lg font-bold mb-4">
              <span className="text-cyan-400">{props.logo.split(".")[0]}</span>
              <span className="text-gray-600">.{props.logo.split(".")[1] || "AI"}</span>
            </p>
            <p className="text-gray-500 text-sm max-w-sm leading-relaxed mb-6">{props.description}</p>
            <div className="flex items-center gap-2">
              {props.socialLinks.map((s, i) => (
                <a key={i} href={safeUrl(s.url)} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg bg-white/[0.03] border border-white/5 hover:border-cyan-500/30 hover:bg-cyan-500/5 flex items-center justify-center text-gray-500 hover:text-cyan-400 transition duration-300">
                  <SocialIcon platform={s.platform} />
                </a>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-xs uppercase tracking-widest text-gray-600">Navigation</h4>
            <ul className="space-y-2.5">
              {props.navLinks
                .filter(l => { const id = l.href.replace("#",""); return !(id in props.sections) || props.sections[id]; })
                .map((l, i) => (
                  <li key={i}><a href={safeUrl(l.href)} className="text-gray-500 hover:text-cyan-400 text-sm transition">{l.label}</a></li>
                ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-xs uppercase tracking-widest text-gray-600">Legal</h4>
            <ul className="space-y-2.5">
              {props.links.map((l, i) => (
                <li key={i}><a href={safeUrl(l.url)} className="text-gray-500 hover:text-cyan-400 text-sm transition">{l.label}</a></li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t border-white/5 pt-8 text-center">
          <p className="text-gray-600 text-sm">{props.copyright}</p>
        </div>
      </div>
    </footer>
  );
}
