import React from "react";

interface Position { title: string; type: string; location: string; description: string; }
interface Props { tagline: string; title: string; subtitle?: string; culture?: string[]; positions: Position[]; formTitle: string; formSubtitle: string; }

export default function Careers(props: Props) {
  return (
    <section id="careers" className="py-24 sm:py-32 bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 animate-fade-up">
          <span className="inline-block px-4 py-1.5 bg-white/10 text-rose-300 text-sm font-bold rounded-full mb-4 uppercase tracking-wider">{props.tagline}</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-4">{props.title}</h2>
          {props.subtitle && <p className="text-gray-400 text-lg">{props.subtitle}</p>}
          {props.culture && (
            <div className="flex flex-wrap justify-center gap-3 mt-8">
              {props.culture.map((p, i) => (
                <span key={i} className="px-4 py-2 bg-white/5 border border-white/10 text-sm text-gray-300 rounded-full">{p}</span>
              ))}
            </div>
          )}
        </div>
        <div className="grid lg:grid-cols-5 gap-10">
          <div className="lg:col-span-3 space-y-4">
            {props.positions.map((pos, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-white/20 transition-all duration-300 animate-fade-up" style={{ animationDelay: `${i * 100}ms` }}>
                <h4 className="font-bold text-lg mb-2">{pos.title}</h4>
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-rose-500/20 text-rose-300">{pos.type}</span>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/5 text-gray-400">{pos.location}</span>
                </div>
                <p className="text-sm text-gray-400">{pos.description}</p>
              </div>
            ))}
          </div>
          <div className="lg:col-span-2 animate-fade-up anim-delay-300">
            <div className="sticky top-24 bg-white rounded-3xl p-8 text-gray-900 shadow-2xl">
              <h3 className="text-xl font-black mb-2">{props.formTitle}</h3>
              <p className="text-gray-500 text-sm mb-6">{props.formSubtitle}</p>
              <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                <input type="text" placeholder="Full Name" className="w-full px-4 py-3 rounded-xl bg-gray-50 border-2 border-gray-100 focus:border-rose-400 outline-none text-sm transition" />
                <input type="email" placeholder="Email" className="w-full px-4 py-3 rounded-xl bg-gray-50 border-2 border-gray-100 focus:border-rose-400 outline-none text-sm transition" />
                <input type="tel" placeholder="Phone" className="w-full px-4 py-3 rounded-xl bg-gray-50 border-2 border-gray-100 focus:border-rose-400 outline-none text-sm transition" />
                <textarea rows={3} placeholder="Message or portfolio link..." className="w-full px-4 py-3 rounded-xl bg-gray-50 border-2 border-gray-100 focus:border-rose-400 outline-none text-sm resize-none transition" />
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center hover:border-rose-300 transition cursor-pointer">
                  <svg className="mx-auto h-7 w-7 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                  <p className="text-xs text-gray-400 mt-2">Upload CV (PDF, DOC)</p>
                </div>
                <button type="submit" className="w-full bg-gray-900 text-white font-bold py-3.5 rounded-xl hover:bg-gray-800 transition">Submit Application</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
