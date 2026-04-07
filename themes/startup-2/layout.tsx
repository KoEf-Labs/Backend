import React from "react";
import { safeUrl, safeEmbedUrl } from "../shared/safe-url";

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════════════════ */

interface Slide { image: string; title: string; subtitle: string; buttonText: string; buttonLink: string; }
interface NavLink { label: string; href: string; }
interface Feature { icon: string; title: string; description: string; }
interface ServiceItem { title: string; description: string; icon: string; gradient: string; }
interface Client { name: string; logo: string; }
interface Testimonial { quote: string; author: string; role: string; avatar: string; }
interface Position { title: string; type: string; location: string; salary: string; description: string; }
interface SocialLink { platform: string; url: string; }
interface FooterLink { label: string; url: string; }

interface ThemeData {
  sections: Record<string, boolean>;
  navbar: { logo: string; links: NavLink[] };
  hero: { slides: Slide[] };
  about: { tagline: string; title: string; description: string; imageUrl: string; features: Feature[] };
  services: { tagline: string; title: string; subtitle: string; items: ServiceItem[] };
  references: { tagline: string; title: string; subtitle: string; clients: Client[]; testimonials: Testimonial[] };
  careers: { tagline: string; title: string; subtitle: string; perks: string[]; positions: Position[]; formTitle: string; formSubtitle: string };
  contact: { tagline: string; title: string; subtitle: string; phone: string; email: string; address: string; mapEmbedUrl: string };
  footer: { description: string; copyright: string; socialLinks: SocialLink[]; links: FooterLink[] };
}

/* ═══════════════════════════════════════════════════════════════════════════
   ICONS
   ═══════════════════════════════════════════════════════════════════════════ */

function Icon({ name, className = "w-6 h-6" }: { name: string; className?: string }) {
  const map: Record<string, React.ReactNode> = {
    lightbulb: <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" /></svg>,
    palette: <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h1.5c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z" /></svg>,
    code: <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" /></svg>,
    mobile: <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" /></svg>,
    cloud: <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" /></svg>,
    brain: <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" /></svg>,
    chart: <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>,
    shield: <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>,
    rocket: <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.58-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" /></svg>,
    globe: <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" /></svg>,
  };
  return <>{map[name] || map.code}</>;
}

function SocialIcon({ platform }: { platform: string }) {
  const m: Record<string, React.ReactNode> = {
    twitter: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
    linkedin: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>,
    instagram: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>,
    facebook: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
    github: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>,
    youtube: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>,
  };
  return <>{m[platform] || null}</>;
}

/* ═══════════════════════════════════════════════════════════════════════════
   CSS ANIMATIONS (injected as <style>)
   ═══════════════════════════════════════════════════════════════════════════ */

const animationCSS = `
@keyframes fadeInUp { from { opacity:0; transform:translateY(30px) } to { opacity:1; transform:translateY(0) } }
@keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
@keyframes slideIn { from { opacity:0; transform:translateX(-20px) } to { opacity:1; transform:translateX(0) } }
@keyframes float { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-10px) } }
@keyframes pulse-glow { 0%,100% { box-shadow:0 0 20px rgba(139,92,246,0.3) } 50% { box-shadow:0 0 40px rgba(139,92,246,0.6) } }
@keyframes slider { 0%,27% { opacity:1 } 33%,94% { opacity:0 } 100% { opacity:1 } }
.animate-fade-up { animation: fadeInUp 0.8s ease-out both }
.animate-fade-in { animation: fadeIn 0.6s ease-out both }
.animate-slide-in { animation: slideIn 0.6s ease-out both }
.animate-float { animation: float 3s ease-in-out infinite }
.delay-100 { animation-delay:.1s } .delay-200 { animation-delay:.2s } .delay-300 { animation-delay:.3s }
.delay-400 { animation-delay:.4s } .delay-500 { animation-delay:.5s } .delay-600 { animation-delay:.6s }
.hover-lift { transition: transform .3s, box-shadow .3s } .hover-lift:hover { transform:translateY(-6px); box-shadow:0 20px 40px rgba(0,0,0,0.1) }
.glass { background:rgba(255,255,255,0.05); backdrop-filter:blur(12px); border:1px solid rgba(255,255,255,0.1) }
`;

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

export default function Startup2Theme({ data }: { data: ThemeData }) {
  const sec = data.sections;
  const slideCount = data.hero?.slides?.length || 1;
  const slideDuration = 5; // seconds per slide
  const totalDuration = slideDuration * slideCount;

  // CSS keyframes for the auto-slider
  const sliderKeyframes = data.hero?.slides?.map((_, i) => {
    const start = (i / slideCount) * 100;
    const show = start + (1 / slideCount) * 80;
    const end = start + (1 / slideCount) * 100;
    return `.slide-${i} { animation: slide-${i} ${totalDuration}s infinite }
@keyframes slide-${i} { 0% { opacity:${i === 0 ? 1 : 0} } ${i > 0 ? `${start}% { opacity:0 } ${start + 2}% { opacity:1 }` : ''} ${show}% { opacity:1 } ${end}% { opacity:${i === slideCount - 1 ? 1 : 0} } ${i === 0 && slideCount > 1 ? `${end + 2}% { opacity:0 } 98% { opacity:0 } 100% { opacity:1 }` : ''} }`;
  }).join("\n") || "";

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: animationCSS + sliderKeyframes }} />

      {/* ── NAVBAR ──────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <a href="#" className="text-xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              {data.navbar.logo}
            </a>
            <div className="hidden md:flex items-center gap-8">
              {data.navbar.links
                .filter(l => { const id = l.href.replace("#",""); return !(id in sec) || sec[id]; })
                .map((link, i) => (
                  <a key={i} href={safeUrl(link.href)} className="text-sm text-gray-400 hover:text-white transition">{link.label}</a>
                ))}
            </div>
            <a href="#contact" className="hidden sm:inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-full hover:shadow-lg hover:shadow-violet-500/25 transition">
              Get in Touch
            </a>
          </div>
        </div>
      </nav>

      {/* ── HERO SLIDER ────────────────────────────────────────── */}
      {sec.hero && (
        <section id="hero" className="relative h-screen pt-16 overflow-hidden bg-slate-950">
          {data.hero.slides.map((slide, i) => (
            <div key={i} className={`absolute inset-0 pt-16 slide-${i}`}>
              <div className="absolute inset-0">
                {slide.image ? (
                  <img src={slide.image} alt={slide.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-violet-900 to-slate-900" />
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/70 to-slate-950/40" />
              </div>
              <div className="relative h-full flex items-center">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                  <div className="max-w-2xl">
                    <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white leading-tight mb-6 animate-fade-up">
                      {slide.title}
                    </h1>
                    <p className="text-lg sm:text-xl text-gray-300 mb-10 max-w-lg animate-fade-up delay-200">
                      {slide.subtitle}
                    </p>
                    {slide.buttonText && (
                      <a
                        href={safeUrl(slide.buttonLink) || "#contact"}
                        className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold px-8 py-4 rounded-full hover:shadow-xl hover:shadow-violet-500/30 transition animate-fade-up delay-300"
                      >
                        {slide.buttonText}
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {/* Slide indicators */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3 z-10">
            {data.hero.slides.map((_, i) => (
              <div key={i} className="w-12 h-1 rounded-full bg-white/20 overflow-hidden">
                <div className={`h-full bg-white rounded-full slide-${i}`} style={{ transformOrigin: "left" }} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── ABOUT ──────────────────────────────────────────────── */}
      {sec.about && (
        <section id="about" className="py-24 sm:py-32 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="animate-fade-up">
                <span className="inline-block px-4 py-1.5 bg-violet-50 text-violet-700 text-sm font-semibold rounded-full mb-4">
                  {data.about.tagline}
                </span>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight mb-6">
                  {data.about.title}
                </h2>
                {data.about.description.split("\n").map((p, i) => (
                  <p key={i} className="text-gray-500 leading-relaxed mb-4 text-lg">{p}</p>
                ))}
                {data.about.features && (
                  <div className="grid sm:grid-cols-3 gap-6 mt-10">
                    {data.about.features.map((f, i) => (
                      <div key={i} className={`animate-fade-up delay-${(i + 1) * 100}`}>
                        <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-lg flex items-center justify-center text-white mb-3">
                          <Icon name={f.icon} className="w-5 h-5" />
                        </div>
                        <h4 className="font-semibold text-gray-900 mb-1">{f.title}</h4>
                        <p className="text-sm text-gray-500">{f.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative animate-fade-up delay-300">
                <div className="absolute -inset-4 bg-gradient-to-r from-violet-200 to-fuchsia-200 rounded-3xl blur-2xl opacity-30" />
                {data.about.imageUrl ? (
                  <img src={data.about.imageUrl} alt="About" className="relative rounded-2xl shadow-xl w-full h-[480px] object-cover" />
                ) : (
                  <div className="relative rounded-2xl bg-gray-100 w-full h-[480px] flex items-center justify-center text-gray-400">About Image</div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── SERVICES ───────────────────────────────────────────── */}
      {sec.services && (
        <section id="services" className="py-24 sm:py-32 bg-slate-950 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 animate-fade-up">
              <span className="inline-block px-4 py-1.5 bg-white/10 text-violet-300 text-sm font-semibold rounded-full mb-4">
                {data.services.tagline}
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">{data.services.title}</h2>
              {data.services.subtitle && <p className="text-gray-400 text-lg max-w-2xl mx-auto">{data.services.subtitle}</p>}
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.services.items.map((svc, i) => (
                <div key={i} className={`group glass rounded-2xl p-8 hover-lift animate-fade-up delay-${(i % 6 + 1) * 100}`}>
                  <div className={`w-12 h-12 bg-gradient-to-br ${svc.gradient || 'from-violet-500 to-fuchsia-500'} rounded-xl flex items-center justify-center text-white mb-5 group-hover:scale-110 transition-transform`}>
                    <Icon name={svc.icon} />
                  </div>
                  <h3 className="text-lg font-semibold mb-3">{svc.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{svc.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── REFERENCES ─────────────────────────────────────────── */}
      {sec.references && (
        <section id="references" className="py-24 sm:py-32 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 animate-fade-up">
              <span className="inline-block px-4 py-1.5 bg-violet-50 text-violet-700 text-sm font-semibold rounded-full mb-4">
                {data.references.tagline}
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">{data.references.title}</h2>
              {data.references.subtitle && <p className="text-gray-500 text-lg">{data.references.subtitle}</p>}
            </div>
            {/* Client logos */}
            <div className="flex flex-wrap justify-center gap-8 mb-20">
              {data.references.clients.map((c, i) => (
                <div key={i} className={`bg-white rounded-2xl px-8 py-5 shadow-sm border border-gray-100 hover-lift animate-fade-up delay-${(i % 6 + 1) * 100}`}>
                  {c.logo ? <img src={c.logo} alt={c.name} className="h-8 object-contain" /> : <span className="text-base font-semibold text-gray-400">{c.name}</span>}
                </div>
              ))}
            </div>
            {/* Testimonials */}
            <div className="grid md:grid-cols-3 gap-8">
              {data.references.testimonials.map((t, i) => (
                <div key={i} className={`bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover-lift animate-fade-up delay-${(i + 1) * 100}`}>
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, j) => (
                      <svg key={j} className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                    ))}
                  </div>
                  <p className="text-gray-600 leading-relaxed mb-6">&ldquo;{t.quote}&rdquo;</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-400 flex items-center justify-center text-white font-bold text-sm">
                      {t.author.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{t.author}</p>
                      <p className="text-gray-400 text-xs">{t.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CAREERS ────────────────────────────────────────────── */}
      {sec.careers && (
        <section id="careers" className="py-24 sm:py-32 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 animate-fade-up">
              <span className="inline-block px-4 py-1.5 bg-violet-50 text-violet-700 text-sm font-semibold rounded-full mb-4">
                {data.careers.tagline}
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">{data.careers.title}</h2>
              {data.careers.subtitle && <p className="text-gray-500 text-lg">{data.careers.subtitle}</p>}
              {/* Perks */}
              {data.careers.perks && (
                <div className="flex flex-wrap justify-center gap-3 mt-8">
                  {data.careers.perks.map((p, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-700 text-sm font-medium rounded-full">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                      {p}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="grid lg:grid-cols-5 gap-12">
              {/* Positions — 3 cols */}
              <div className="lg:col-span-3 space-y-4">
                {data.careers.positions.map((pos, i) => (
                  <div key={i} className={`bg-gray-50 rounded-2xl p-6 border border-gray-100 hover:border-violet-200 hover:shadow-md transition animate-fade-up delay-${(i + 1) * 100}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                      <h4 className="font-semibold text-gray-900 text-lg">{pos.title}</h4>
                      {pos.salary && <span className="text-sm font-medium text-violet-600">{pos.salary}</span>}
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-violet-100 text-violet-700">{pos.type}</span>
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{pos.location}</span>
                    </div>
                    <p className="text-sm text-gray-500">{pos.description}</p>
                  </div>
                ))}
              </div>
              {/* Application form — 2 cols */}
              <div className="lg:col-span-2 animate-fade-up delay-300">
                <div className="sticky top-24 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 text-white shadow-xl">
                  <h3 className="text-xl font-bold mb-2">{data.careers.formTitle}</h3>
                  <p className="text-gray-400 text-sm mb-6">{data.careers.formSubtitle}</p>
                  <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                    <input type="text" placeholder="Full Name" className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder-gray-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none text-sm" />
                    <input type="email" placeholder="Email" className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder-gray-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none text-sm" />
                    <input type="tel" placeholder="Phone" className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder-gray-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none text-sm" />
                    <textarea rows={3} placeholder="Tell us about yourself..." className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder-gray-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none text-sm resize-none" />
                    <div className="border-2 border-dashed border-white/10 rounded-xl p-5 text-center hover:border-violet-400/50 transition cursor-pointer">
                      <svg className="mx-auto h-7 w-7 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                      <p className="text-sm text-gray-400 mt-2">Upload CV (PDF, DOC)</p>
                    </div>
                    <button type="submit" className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 font-medium py-3.5 rounded-xl hover:shadow-lg hover:shadow-violet-500/25 transition">
                      Submit Application
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── CONTACT ────────────────────────────────────────────── */}
      {sec.contact && (
        <section id="contact" className="py-24 sm:py-32 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 animate-fade-up">
              <span className="inline-block px-4 py-1.5 bg-violet-50 text-violet-700 text-sm font-semibold rounded-full mb-4">
                {data.contact.tagline}
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">{data.contact.title}</h2>
              {data.contact.subtitle && <p className="text-gray-500 text-lg max-w-2xl mx-auto">{data.contact.subtitle}</p>}
            </div>
            <div className="grid lg:grid-cols-2 gap-12">
              <div className="rounded-2xl overflow-hidden shadow-xl h-[420px] animate-fade-up">
                {data.contact.mapEmbedUrl ? (
                  <iframe src={safeEmbedUrl(data.contact.mapEmbedUrl)} width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">Google Maps</div>
                )}
              </div>
              <div className="flex flex-col justify-center space-y-6 animate-fade-up delay-200">
                {[
                  { icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>, label: "Address", value: data.contact.address },
                  { icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>, label: "Phone", value: data.contact.phone },
                  { icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>, label: "Email", value: data.contact.email },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-5 bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover-lift">
                    <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                      {item.icon}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">{item.label}</h4>
                      <p className="text-gray-500">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── FOOTER ─────────────────────────────────────────────── */}
      <footer className="bg-slate-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            <div className="lg:col-span-2">
              <p className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent mb-4">
                {data.navbar.logo}
              </p>
              <p className="text-gray-400 text-sm max-w-sm leading-relaxed mb-6">{data.footer.description}</p>
              <div className="flex items-center gap-3">
                {data.footer.socialLinks.map((s, i) => (
                  <a key={i} href={safeUrl(s.url)} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition">
                    <SocialIcon platform={s.platform} />
                  </a>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-gray-500">Navigation</h4>
              <ul className="space-y-3">
                {data.navbar.links
                  .filter(l => { const id = l.href.replace("#",""); return !(id in sec) || sec[id]; })
                  .map((l, i) => (
                    <li key={i}><a href={safeUrl(l.href)} className="text-gray-400 hover:text-white text-sm transition">{l.label}</a></li>
                  ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-gray-500">Legal</h4>
              <ul className="space-y-3">
                {data.footer.links.map((l, i) => (
                  <li key={i}><a href={safeUrl(l.url)} className="text-gray-400 hover:text-white text-sm transition">{l.label}</a></li>
                ))}
              </ul>
            </div>
          </div>
          <div className="border-t border-white/5 pt-8 text-center">
            <p className="text-gray-500 text-sm">{data.footer.copyright}</p>
          </div>
        </div>
      </footer>
    </>
  );
}
