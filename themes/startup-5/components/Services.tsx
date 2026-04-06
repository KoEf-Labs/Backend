import React from "react";
import { Icon } from "./Icons";

interface Item { title: string; description: string; icon: string; }
interface Props { tagline: string; title: string; items: Item[]; }

export default function Services(props: Props) {
  return (
    <section id="services" className="py-20 sm:py-28 bg-gray-50/50">
      <div className="max-w-5xl mx-auto px-6 lg:px-8">
        <p className="text-[13px] font-medium text-gray-400 uppercase tracking-widest mb-3">{props.tagline}</p>
        <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-12 tracking-tight">{props.title}</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-gray-200 rounded-xl overflow-hidden">
          {props.items.map((item, i) => (
            <div key={i} className="bg-white p-7 hover:bg-gray-50 transition duration-300 animate-fade-up" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="text-gray-300 mb-4"><Icon name={item.icon} className="w-5 h-5" /></div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1.5">{item.title}</h3>
              <p className="text-[13px] text-gray-400 leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
