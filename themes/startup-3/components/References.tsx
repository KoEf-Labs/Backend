import React from "react";

interface Props {
  tagline: string;
  title: string;
  subtitle?: string;
  clients: { name: string; logo: string }[];
  testimonials: { quote: string; author: string; role: string; avatar: string }[];
}

export default function References(props: Props) {
  return (
    <section id="references" className="py-24 sm:py-32 bg-slate-950 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 animate-fade-up">
          <span className="inline-flex items-center px-3 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-6">{props.tagline}</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">{props.title}</h2>
          {props.subtitle && <p className="text-gray-400 text-lg">{props.subtitle}</p>}
        </div>
        {/* Client logos */}
        <div className="flex flex-wrap justify-center gap-4 mb-20">
          {props.clients.map((c, i) => (
            <div key={i} className="bg-white/[0.03] border border-white/5 rounded-xl px-7 py-4 hover:border-cyan-500/20 hover:bg-cyan-500/[0.03] transition duration-300 animate-fade-up" style={{ animationDelay: `${i * 80}ms` }}>
              {c.logo ? <img src={c.logo} alt={c.name} className="h-7 object-contain opacity-60" /> : <span className="text-sm font-medium text-gray-500">{c.name}</span>}
            </div>
          ))}
        </div>
        {/* Testimonials */}
        <div className="grid md:grid-cols-3 gap-6">
          {props.testimonials.map((t, i) => (
            <div key={i} className="relative bg-white/[0.02] border border-white/5 rounded-2xl p-8 hover:border-cyan-500/20 transition duration-300 animate-fade-up" style={{ animationDelay: `${(i + 1) * 150}ms` }}>
              <svg className="w-8 h-8 text-cyan-500/20 mb-5" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H14.017zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10H0z" /></svg>
              <p className="text-gray-300 leading-relaxed mb-6">&ldquo;{t.quote}&rdquo;</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs">{t.author.charAt(0)}</div>
                <div>
                  <p className="text-sm font-semibold text-white">{t.author}</p>
                  <p className="text-xs text-gray-500">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
