import React from "react";

interface Props { title: string; subtitle: string; buttonText: string; buttonLink: string; secondaryButtonText?: string; secondaryButtonLink?: string; marquee?: string[]; }

export default function Hero(props: Props) {
  return (
    <section id="hero" className="relative pt-16 min-h-screen flex flex-col justify-center overflow-hidden bg-[#FFF8F0]">
      {/* Decorative shapes */}
      <div className="absolute top-20 right-[10%] w-64 h-64 rounded-full bg-rose-200/40 blur-3xl shape-float" />
      <div className="absolute bottom-20 left-[5%] w-80 h-80 rounded-full bg-violet-200/30 blur-3xl shape-float" style={{ animationDelay: "2s" }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-amber-100/40 blur-3xl" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-gray-900 leading-[0.95] mb-8 animate-fade-up tracking-tight">
          {props.title}
        </h1>
        <p className="text-lg sm:text-xl text-gray-500 max-w-xl mx-auto mb-12 leading-relaxed animate-fade-up anim-delay-200">
          {props.subtitle}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up anim-delay-300">
          <a href={props.buttonLink || "#references"} className="inline-flex items-center gap-2 bg-gray-900 text-white font-semibold px-8 py-4 rounded-full hover:bg-gray-800 hover:scale-105 transition-all duration-300 shadow-xl shadow-gray-900/10">
            {props.buttonText}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
          </a>
          {props.secondaryButtonText && (
            <a href={props.secondaryButtonLink || "#"} className="inline-flex items-center gap-2 text-gray-600 font-medium px-8 py-4 rounded-full border-2 border-gray-200 hover:border-gray-400 transition-all duration-300">
              {props.secondaryButtonText}
            </a>
          )}
        </div>
      </div>

      {/* Marquee */}
      {props.marquee && props.marquee.length > 0 && (
        <div className="relative mt-auto pb-8 overflow-hidden">
          <div className="marquee-track flex gap-8 whitespace-nowrap text-6xl sm:text-7xl md:text-8xl font-black text-gray-900/[0.04] select-none uppercase tracking-tight">
            {[...props.marquee, ...props.marquee, ...props.marquee].map((word, i) => (
              <span key={i} className="flex items-center gap-8">
                {word}
                <span className="w-3 h-3 rounded-full bg-rose-400/30" />
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
