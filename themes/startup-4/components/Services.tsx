import React from "react";
import { Icon } from "./Icons";

interface Item { title: string; description: string; color: string; icon: string; }
interface Props { tagline: string; title: string; items: Item[]; }

const colorMap: Record<string, { bg: string; text: string; border: string; hoverBg: string }> = {
  rose:    { bg: "bg-rose-50", text: "text-rose-600", border: "border-rose-100", hoverBg: "hover:bg-rose-500" },
  violet:  { bg: "bg-violet-50", text: "text-violet-600", border: "border-violet-100", hoverBg: "hover:bg-violet-500" },
  amber:   { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-100", hoverBg: "hover:bg-amber-500" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-100", hoverBg: "hover:bg-emerald-500" },
  sky:     { bg: "bg-sky-50", text: "text-sky-600", border: "border-sky-100", hoverBg: "hover:bg-sky-500" },
  orange:  { bg: "bg-orange-50", text: "text-orange-600", border: "border-orange-100", hoverBg: "hover:bg-orange-500" },
  indigo:  { bg: "bg-indigo-50", text: "text-indigo-600", border: "border-indigo-100", hoverBg: "hover:bg-indigo-500" },
  fuchsia: { bg: "bg-fuchsia-50", text: "text-fuchsia-600", border: "border-fuchsia-100", hoverBg: "hover:bg-fuchsia-500" },
};

export default function Services(props: Props) {
  return (
    <section id="services" className="py-24 sm:py-32 bg-[#FFF8F0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-16 animate-fade-up">
          <span className="inline-block px-4 py-1.5 bg-violet-50 text-violet-600 text-sm font-bold rounded-full mb-4 uppercase tracking-wider">{props.tagline}</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900">{props.title}</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {props.items.map((svc, i) => {
            const c = colorMap[svc.color] || colorMap.rose;
            return (
              <div key={i} className={`group ${c.bg} ${c.border} border-2 rounded-3xl p-8 ${c.hoverBg} hover:text-white transition-all duration-500 cursor-pointer hover:-translate-y-2 hover:shadow-xl animate-fade-up`} style={{ animationDelay: `${i * 100}ms` }}>
                <div className={`w-14 h-14 ${c.text} mb-6 group-hover:text-white transition-colors duration-500`}>
                  <Icon name={svc.icon} className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 group-hover:text-white mb-3 transition-colors duration-500">{svc.title}</h3>
                <p className="text-gray-500 group-hover:text-white/80 leading-relaxed transition-colors duration-500">{svc.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
