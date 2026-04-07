import React from "react";
import { safeEmbedUrl } from "../../shared/safe-url";

interface Props { tagline: string; title: string; subtitle?: string; phone: string; email: string; address: string; mapEmbedUrl?: string; }

export default function Contact(props: Props) {
  return (
    <section id="contact" className="py-24 sm:py-32 bg-[#FFF8F0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 animate-fade-up">
          <span className="inline-block px-4 py-1.5 bg-emerald-50 text-emerald-600 text-sm font-bold rounded-full mb-4 uppercase tracking-wider">{props.tagline}</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 mb-4">{props.title}</h2>
          {props.subtitle && <p className="text-gray-500 text-lg">{props.subtitle}</p>}
        </div>
        <div className="grid lg:grid-cols-2 gap-10">
          <div className="rounded-3xl overflow-hidden h-[400px] shadow-lg animate-fade-up">
            {props.mapEmbedUrl ? (
              <iframe src={safeEmbedUrl(props.mapEmbedUrl)} width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            ) : (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">Google Maps</div>
            )}
          </div>
          <div className="flex flex-col justify-center space-y-5 animate-fade-up anim-delay-200">
            {[
              { icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>, label: "Address", value: props.address, color: "rose" },
              { icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>, label: "Phone", value: props.phone, color: "violet" },
              { icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>, label: "Email", value: props.email, color: "amber" },
            ].map((item, i) => {
              const colors: Record<string, string> = { rose: "bg-rose-100 text-rose-600", violet: "bg-violet-100 text-violet-600", amber: "bg-amber-100 text-amber-600" };
              return (
                <div key={i} className="flex items-start gap-5 bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                  <div className={`w-12 h-12 ${colors[item.color]} rounded-2xl flex items-center justify-center flex-shrink-0`}>{item.icon}</div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">{item.label}</h4>
                    <p className="text-gray-500">{item.value}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
