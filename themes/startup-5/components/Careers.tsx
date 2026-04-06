import React from "react";

interface Position { title: string; type: string; location: string; description: string; }
interface Props { tagline: string; title: string; subtitle?: string; positions: Position[]; formTitle: string; formSubtitle: string; }

export default function Careers(props: Props) {
  return (
    <section id="careers" className="py-20 sm:py-28 bg-gray-50/50">
      <div className="max-w-5xl mx-auto px-6 lg:px-8">
        <p className="text-[13px] font-medium text-gray-400 uppercase tracking-widest mb-3">{props.tagline}</p>
        <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-2 tracking-tight">{props.title}</h2>
        {props.subtitle && <p className="text-gray-400 mb-10">{props.subtitle}</p>}
        <div className="grid lg:grid-cols-5 gap-12">
          <div className="lg:col-span-3 space-y-3">
            {props.positions.map((pos, i) => (
              <div key={i} className="bg-white border border-gray-100 rounded-xl p-5 hover:border-gray-200 transition animate-fade-up" style={{ animationDelay: `${i * 80}ms` }}>
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-sm font-semibold text-gray-900">{pos.title}</h4>
                </div>
                <div className="flex gap-2 mb-2">
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-500">{pos.type}</span>
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-500">{pos.location}</span>
                </div>
                <p className="text-[13px] text-gray-400">{pos.description}</p>
              </div>
            ))}
          </div>
          <div className="lg:col-span-2 animate-fade-up" style={{ animationDelay: "200ms" }}>
            <div className="sticky top-20 bg-white border border-gray-100 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-1">{props.formTitle}</h3>
              <p className="text-[13px] text-gray-400 mb-5">{props.formSubtitle}</p>
              <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
                <input type="text" placeholder="Name" className="w-full px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-100 text-sm text-gray-900 placeholder-gray-300 focus:ring-1 focus:ring-gray-300 focus:border-gray-300 outline-none transition" />
                <input type="email" placeholder="Email" className="w-full px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-100 text-sm text-gray-900 placeholder-gray-300 focus:ring-1 focus:ring-gray-300 focus:border-gray-300 outline-none transition" />
                <input type="tel" placeholder="Phone" className="w-full px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-100 text-sm text-gray-900 placeholder-gray-300 focus:ring-1 focus:ring-gray-300 focus:border-gray-300 outline-none transition" />
                <textarea rows={2} placeholder="Message" className="w-full px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-100 text-sm text-gray-900 placeholder-gray-300 focus:ring-1 focus:ring-gray-300 focus:border-gray-300 outline-none resize-none transition" />
                <div className="border border-dashed border-gray-200 rounded-lg p-4 text-center hover:border-gray-300 transition cursor-pointer">
                  <p className="text-[12px] text-gray-400">Upload CV (PDF)</p>
                </div>
                <button type="submit" className="w-full bg-gray-900 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-gray-800 transition">Submit</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
