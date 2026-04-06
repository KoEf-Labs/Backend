import React from "react";

interface Props { tagline: string; title: string; description: string; imageUrl?: string; highlights?: { number: string; label: string }[]; }

export default function About(props: Props) {
  return (
    <section id="about" className="py-24 sm:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="order-2 lg:order-1 animate-fade-up">
            <span className="inline-block px-4 py-1.5 bg-rose-50 text-rose-600 text-sm font-bold rounded-full mb-6 uppercase tracking-wider">{props.tagline}</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 leading-tight mb-8">{props.title}</h2>
            {props.description.split("\n").map((p, i) => (
              <p key={i} className="text-gray-500 text-lg leading-relaxed mb-4">{p}</p>
            ))}
            {props.highlights && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-10 pt-10 border-t border-gray-100">
                {props.highlights.map((h, i) => (
                  <div key={i}>
                    <p className="text-3xl font-black text-gray-900">{h.number}</p>
                    <p className="text-sm text-gray-400 mt-1">{h.label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="order-1 lg:order-2 relative animate-fade-up anim-delay-200">
            <div className="absolute -top-6 -right-6 w-full h-full bg-amber-200 rounded-3xl" />
            <div className="absolute -bottom-6 -left-6 w-full h-full bg-rose-200 rounded-3xl" />
            {props.imageUrl ? (
              <img src={props.imageUrl} alt="About" className="relative rounded-3xl w-full h-[480px] object-cover shadow-lg" />
            ) : (
              <div className="relative rounded-3xl bg-gray-100 w-full h-[480px] flex items-center justify-center text-gray-400">About Image</div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
