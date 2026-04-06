import React from "react";
import { SocialIcon } from "./Icons";

interface Props { logo: string; description: string; copyright: string; socialLinks: { platform: string; url: string }[]; links: { label: string; url: string }[]; navLinks: { label: string; href: string }[]; sections: Record<string, boolean>; }

export default function Footer(props: Props) {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          <div className="lg:col-span-2">
            <p className="text-2xl font-black mb-4">{props.logo}<span className="text-rose-400">.</span></p>
            <p className="text-gray-400 text-sm max-w-sm leading-relaxed mb-6">{props.description}</p>
            <div className="flex items-center gap-3">
              {props.socialLinks.map((s, i) => (
                <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/5 hover:bg-rose-500 flex items-center justify-center text-gray-400 hover:text-white transition-all duration-300">
                  <SocialIcon platform={s.platform} />
                </a>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-bold mb-4 text-sm uppercase tracking-wider text-gray-500">Pages</h4>
            <ul className="space-y-2.5">
              {props.navLinks.filter(l => { const id = l.href.replace("#",""); return !(id in props.sections) || props.sections[id]; }).map((l, i) => (
                <li key={i}><a href={l.href} className="text-gray-400 hover:text-white text-sm transition">{l.label}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4 text-sm uppercase tracking-wider text-gray-500">Legal</h4>
            <ul className="space-y-2.5">
              {props.links.map((l, i) => (
                <li key={i}><a href={l.url} className="text-gray-400 hover:text-white text-sm transition">{l.label}</a></li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 pt-8 text-center">
          <p className="text-gray-500 text-sm">{props.copyright}</p>
        </div>
      </div>
    </footer>
  );
}
