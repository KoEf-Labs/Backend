import React from "react";
import { SocialIcon } from "./Icons";

interface Props { logo: string; description: string; copyright: string; socialLinks: { platform: string; url: string }[]; links: { label: string; url: string }[]; }

export default function Footer(props: Props) {
  return (
    <footer className="border-t border-gray-100">
      <div className="max-w-5xl mx-auto px-6 lg:px-8 py-12">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-8">
          <div>
            <p className="text-sm font-medium text-gray-900 mb-1">{props.logo}</p>
            <p className="text-[13px] text-gray-400">{props.description}</p>
          </div>
          <div className="flex items-center gap-3">
            {props.socialLinks.map((s, i) => (
              <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition">
                <SocialIcon platform={s.platform} />
              </a>
            ))}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-gray-100">
          <p className="text-[12px] text-gray-300">{props.copyright}</p>
          <div className="flex items-center gap-4">
            {props.links.map((l, i) => (
              <a key={i} href={l.url} className="text-[12px] text-gray-300 hover:text-gray-500 transition">{l.label}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
