import React from "react";

interface Props {
  tagline: string;
  title: string;
  description: string;
  imageUrl?: string;
  metrics?: { value: string; label: string }[];
}

export default function About(props: Props) {
  return (
    <section id="about" className="py-24 sm:py-32 bg-slate-950 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="animate-fade-up">
            <span className="inline-flex items-center px-3 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-6">{props.tagline}</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight mb-8">{props.title}</h2>
            {props.description.split("\n").map((p, i) => (
              <p key={i} className="text-gray-400 text-lg leading-relaxed mb-4">{p}</p>
            ))}
            {props.metrics && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-10">
                {props.metrics.map((m, i) => (
                  <div key={i} className="bg-white/[0.03] border border-white/5 rounded-xl p-4 text-center hover:border-cyan-500/20 hover:bg-cyan-500/[0.03] transition duration-300">
                    <p className="text-xl font-bold text-cyan-400">{m.value}</p>
                    <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider">{m.label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="relative animate-fade-up anim-delay-300">
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-violet-500/20 rounded-2xl blur-xl" />
            {props.imageUrl ? (
              <img src={props.imageUrl} alt="About" className="relative rounded-2xl w-full h-[480px] object-cover border border-white/10" />
            ) : (
              <div className="relative rounded-2xl bg-white/5 w-full h-[480px] flex items-center justify-center text-gray-600 border border-white/10">About Image</div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
