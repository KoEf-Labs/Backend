import React from "react";

interface Props {
  badge?: string;
  title: string;
  titleHighlight?: string;
  subtitle: string;
  buttonText: string;
  buttonLink: string;
  secondaryButtonText?: string;
  secondaryButtonLink?: string;
  stats?: { value: string; label: string }[];
}

export default function Hero(props: Props) {
  const renderTitle = () => {
    if (!props.titleHighlight) return props.title;
    const parts = props.title.split(props.titleHighlight);
    return <>{parts[0]}<span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent">{props.titleHighlight}</span>{parts[1] || ""}</>;
  };

  return (
    <section id="hero" className="relative pt-16 min-h-screen flex flex-col justify-center overflow-hidden" style={{ background: "radial-gradient(ellipse 80% 60% at 50% -20%, rgba(6,182,212,0.15), transparent), radial-gradient(ellipse 60% 50% at 80% 50%, rgba(139,92,246,0.1), transparent), #020617" }}>
      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(rgba(6,182,212,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.3) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[120px] neon-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-violet-500/5 rounded-full blur-[100px] neon-pulse" style={{ animationDelay: "1.5s" }} />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        {props.badge && (
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/5 text-cyan-400 text-sm font-medium mb-8 animate-fade-down">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            {props.badge}
          </div>
        )}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.1] mb-8 max-w-5xl mx-auto animate-fade-up">
          {renderTitle()}
        </h1>
        <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed animate-fade-up anim-delay-200">
          {props.subtitle}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20 animate-fade-up anim-delay-400">
          <a href={props.buttonLink || "#contact"} className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold px-8 py-4 rounded-xl hover:shadow-[0_0_30px_rgba(6,182,212,0.4)] transition duration-300">
            {props.buttonText}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
          </a>
          {props.secondaryButtonText && (
            <a href={props.secondaryButtonLink || "#"} className="inline-flex items-center gap-2 border border-gray-700 text-gray-300 font-medium px-8 py-4 rounded-xl hover:border-gray-500 hover:text-white transition duration-300">
              {props.secondaryButtonText}
            </a>
          )}
        </div>
        {/* Stats bar */}
        {props.stats && props.stats.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/5 rounded-2xl overflow-hidden border border-white/5 max-w-4xl mx-auto animate-fade-up anim-delay-600">
            {props.stats.map((s, i) => (
              <div key={i} className="bg-slate-950/80 px-6 py-6 text-center">
                <p className="text-2xl sm:text-3xl font-bold text-white mb-1">{s.value}</p>
                <p className="text-xs sm:text-sm text-gray-500 uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
