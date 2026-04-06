import React from "react";

interface Props { tagline: string; title: string; description: string; imageUrl?: string; details?: { label: string; value: string }[]; }

export default function About(props: Props) {
  return (
    <section id="about" className="py-20 sm:py-28">
      <div className="max-w-5xl mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-5 gap-16">
          <div className="lg:col-span-3 animate-fade-up">
            <p className="text-[13px] font-medium text-gray-400 uppercase tracking-widest mb-3">{props.tagline}</p>
            <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-6 tracking-tight">{props.title}</h2>
            {props.description.split("\n").map((p, i) => (
              <p key={i} className="text-gray-400 leading-relaxed mb-4">{p}</p>
            ))}
            {props.details && (
              <div className="grid grid-cols-2 gap-4 mt-8 pt-8 border-t border-gray-100">
                {props.details.map((d, i) => (
                  <div key={i}>
                    <p className="text-[12px] text-gray-400 uppercase tracking-widest mb-1">{d.label}</p>
                    <p className="text-sm font-medium text-gray-900">{d.value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="lg:col-span-2 animate-fade-up" style={{ animationDelay: "200ms" }}>
            {props.imageUrl ? (
              <img src={props.imageUrl} alt="About" className="rounded-xl w-full h-[380px] object-cover grayscale hover:grayscale-0 transition duration-700" />
            ) : (
              <div className="rounded-xl bg-gray-50 w-full h-[380px] flex items-center justify-center text-gray-300">Image</div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
