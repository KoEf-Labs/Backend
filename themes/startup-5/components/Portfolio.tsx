import React from "react";

interface Project { title: string; description: string; category: string; imageUrl?: string; year?: string; }
interface Props { tagline: string; title: string; projects: Project[]; }

export default function Portfolio(props: Props) {
  return (
    <section id="portfolio" className="py-20 sm:py-28">
      <div className="max-w-5xl mx-auto px-6 lg:px-8">
        <p className="text-[13px] font-medium text-gray-400 uppercase tracking-widest mb-3">{props.tagline}</p>
        <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-12 tracking-tight">{props.title}</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {props.projects.map((p, i) => (
            <div key={i} className="group cursor-pointer animate-fade-up" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="relative rounded-xl overflow-hidden aspect-[4/3] mb-4 bg-gray-100">
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                ) : (
                  <div className="w-full h-full bg-gray-100" />
                )}
              </div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[11px] font-medium text-gray-400 uppercase tracking-widest">{p.category}</span>
                {p.year && <><span className="text-gray-200">/</span><span className="text-[11px] text-gray-300">{p.year}</span></>}
              </div>
              <h3 className="text-sm font-semibold text-gray-900 group-hover:text-gray-600 transition mb-1">{p.title}</h3>
              <p className="text-[13px] text-gray-400">{p.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
