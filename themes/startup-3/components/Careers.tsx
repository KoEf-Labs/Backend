import React from "react";

interface Position { title: string; type: string; location: string; salary: string; description: string; tags?: string[] }

interface Props {
  tagline: string;
  title: string;
  subtitle?: string;
  perks?: string[];
  positions: Position[];
  formTitle: string;
  formSubtitle: string;
}

export default function Careers(props: Props) {
  return (
    <section id="careers" className="py-24 sm:py-32 bg-[#020617] border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 animate-fade-up">
          <span className="inline-flex items-center px-3 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-6">{props.tagline}</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">{props.title}</h2>
          {props.subtitle && <p className="text-gray-400 text-lg">{props.subtitle}</p>}
          {props.perks && (
            <div className="flex flex-wrap justify-center gap-3 mt-8">
              {props.perks.map((p, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium rounded-lg">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                  {p}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="grid lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-4">
            {props.positions.map((pos, i) => (
              <div key={i} className="bg-white/[0.02] border border-white/5 rounded-xl p-6 hover:border-cyan-500/20 hover:bg-cyan-500/[0.02] transition duration-300 animate-fade-up" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                  <h4 className="font-semibold text-white text-lg">{pos.title}</h4>
                  {pos.salary && <span className="text-sm font-mono text-cyan-400">{pos.salary}</span>}
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-violet-500/10 border border-violet-500/20 text-violet-400">{pos.type}</span>
                  <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-white/5 border border-white/10 text-gray-400">{pos.location}</span>
                  {pos.tags && pos.tags.map((tag, j) => (
                    <span key={j} className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-cyan-500/5 border border-cyan-500/10 text-cyan-500/70">{tag}</span>
                  ))}
                </div>
                <p className="text-sm text-gray-500">{pos.description}</p>
              </div>
            ))}
          </div>
          <div className="lg:col-span-2 animate-fade-up anim-delay-300">
            <div className="sticky top-24 bg-white/[0.02] border border-white/10 rounded-2xl p-8">
              <h3 className="text-xl font-bold text-white mb-2">{props.formTitle}</h3>
              <p className="text-gray-500 text-sm mb-6">{props.formSubtitle}</p>
              <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                <input type="text" placeholder="Full Name" className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none text-sm transition" />
                <input type="email" placeholder="Email" className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none text-sm transition" />
                <input type="tel" placeholder="Phone" className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none text-sm transition" />
                <textarea rows={3} placeholder="Why are you interested?" className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none text-sm resize-none transition" />
                <div className="border border-dashed border-white/10 rounded-xl p-5 text-center hover:border-cyan-500/30 transition cursor-pointer">
                  <svg className="mx-auto h-7 w-7 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                  <p className="text-xs text-gray-500 mt-2">Upload CV (PDF, DOC)</p>
                </div>
                <button type="submit" className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 font-medium py-3.5 rounded-xl hover:shadow-[0_0_25px_rgba(6,182,212,0.3)] transition duration-300 text-white">
                  Submit Application
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
