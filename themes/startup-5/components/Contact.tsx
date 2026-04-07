import React from "react";
import { safeEmbedUrl } from "../../shared/safe-url";

interface Props { tagline: string; title: string; subtitle?: string; phone: string; email: string; address: string; mapEmbedUrl?: string; }

export default function Contact(props: Props) {
  return (
    <section id="contact" className="py-20 sm:py-28">
      <div className="max-w-5xl mx-auto px-6 lg:px-8">
        <p className="text-[13px] font-medium text-gray-400 uppercase tracking-widest mb-3">{props.tagline}</p>
        <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-2 tracking-tight">{props.title}</h2>
        {props.subtitle && <p className="text-gray-400 mb-10">{props.subtitle}</p>}
        <div className="grid lg:grid-cols-2 gap-10">
          <div className="rounded-xl overflow-hidden h-[340px] bg-gray-100 animate-fade-up">
            {props.mapEmbedUrl ? (
              <iframe src={safeEmbedUrl(props.mapEmbedUrl)} width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300">Map</div>
            )}
          </div>
          <div className="flex flex-col justify-center space-y-6 animate-fade-up" style={{ animationDelay: "150ms" }}>
            {[
              { label: "Email", value: props.email },
              { label: "Phone", value: props.phone },
              { label: "Location", value: props.address },
            ].map((item, i) => (
              <div key={i} className="border-b border-gray-100 pb-5">
                <p className="text-[12px] text-gray-400 uppercase tracking-widest mb-1">{item.label}</p>
                <p className="text-sm text-gray-900 font-medium">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
