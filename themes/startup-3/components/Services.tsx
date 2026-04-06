import React from "react";
import { Icon } from "./Icons";

interface ServiceItem { title: string; description: string; icon: string; color: string; }

interface Props {
  tagline: string;
  title: string;
  subtitle?: string;
  items: ServiceItem[];
}

const colorMap: Record<string, { border: string; bg: string; text: string; glow: string }> = {
  cyan:    { border: "border-cyan-500/20", bg: "bg-cyan-500/10", text: "text-cyan-400", glow: "hover:shadow-[0_0_30px_rgba(6,182,212,0.15)] hover:border-cyan-500/40" },
  violet:  { border: "border-violet-500/20", bg: "bg-violet-500/10", text: "text-violet-400", glow: "hover:shadow-[0_0_30px_rgba(139,92,246,0.15)] hover:border-violet-500/40" },
  blue:    { border: "border-blue-500/20", bg: "bg-blue-500/10", text: "text-blue-400", glow: "hover:shadow-[0_0_30px_rgba(59,130,246,0.15)] hover:border-blue-500/40" },
  emerald: { border: "border-emerald-500/20", bg: "bg-emerald-500/10", text: "text-emerald-400", glow: "hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] hover:border-emerald-500/40" },
  amber:   { border: "border-amber-500/20", bg: "bg-amber-500/10", text: "text-amber-400", glow: "hover:shadow-[0_0_30px_rgba(245,158,11,0.15)] hover:border-amber-500/40" },
  rose:    { border: "border-rose-500/20", bg: "bg-rose-500/10", text: "text-rose-400", glow: "hover:shadow-[0_0_30px_rgba(244,63,94,0.15)] hover:border-rose-500/40" },
  fuchsia: { border: "border-fuchsia-500/20", bg: "bg-fuchsia-500/10", text: "text-fuchsia-400", glow: "hover:shadow-[0_0_30px_rgba(217,70,239,0.15)] hover:border-fuchsia-500/40" },
  indigo:  { border: "border-indigo-500/20", bg: "bg-indigo-500/10", text: "text-indigo-400", glow: "hover:shadow-[0_0_30px_rgba(99,102,241,0.15)] hover:border-indigo-500/40" },
};

export default function Services(props: Props) {
  return (
    <section id="services" className="py-24 sm:py-32 bg-[#020617] border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 animate-fade-up">
          <span className="inline-flex items-center px-3 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-6">{props.tagline}</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">{props.title}</h2>
          {props.subtitle && <p className="text-gray-400 text-lg max-w-2xl mx-auto">{props.subtitle}</p>}
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {props.items.map((svc, i) => {
            const c = colorMap[svc.color] || colorMap.cyan;
            return (
              <div key={i} className={`group relative bg-white/[0.02] ${c.border} border rounded-2xl p-7 transition-all duration-500 ${c.glow} hover:-translate-y-1 animate-fade-up`} style={{ animationDelay: `${i * 100}ms` }}>
                <div className={`w-11 h-11 ${c.bg} rounded-xl flex items-center justify-center ${c.text} mb-5`}>
                  <Icon name={svc.icon} className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{svc.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{svc.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
