import React from "react";

interface Project { name: string; category: string; imageUrl?: string; color: string; }
interface Props { tagline: string; title: string; subtitle?: string; projects: Project[]; clients?: { name: string }[]; }

export default function References(props: Props) {
  return (
    <section id="references" className="py-24 sm:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 animate-fade-up">
          <span className="inline-block px-4 py-1.5 bg-amber-50 text-amber-600 text-sm font-bold rounded-full mb-4 uppercase tracking-wider">{props.tagline}</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 mb-4">{props.title}</h2>
          {props.subtitle && <p className="text-gray-500 text-lg max-w-xl mx-auto">{props.subtitle}</p>}
        </div>
        {/* Portfolio grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-16">
          {props.projects.map((p, i) => (
            <div key={i} className="group relative rounded-3xl overflow-hidden aspect-[4/3] cursor-pointer animate-fade-up" style={{ animationDelay: `${i * 100}ms` }}>
              {p.imageUrl ? (
                <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              ) : (
                <div className={`w-full h-full ${p.color}`} />
              )}
              <div className={`absolute inset-0 ${p.color}/80 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col items-center justify-center text-white p-6`}>
                <p className="text-sm font-medium uppercase tracking-wider mb-2 opacity-80">{p.category}</p>
                <h3 className="text-2xl font-bold text-center">{p.name}</h3>
              </div>
            </div>
          ))}
        </div>
        {/* Client names marquee */}
        {props.clients && props.clients.length > 0 && (
          <div className="flex flex-wrap justify-center gap-x-10 gap-y-4 pt-12 border-t border-gray-100">
            {props.clients.map((c, i) => (
              <span key={i} className="text-2xl font-black text-gray-200 uppercase tracking-wider hover:text-gray-400 transition">{c.name}</span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
