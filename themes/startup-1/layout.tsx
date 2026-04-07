import React from "react";
import { safeUrl, safeEmbedUrl } from "../shared/safe-url";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NavLink {
  label: string;
  href: string;
}

interface Stat {
  value: string;
  label: string;
}

interface ServiceItem {
  title: string;
  description: string;
  icon: string;
}

interface Client {
  name: string;
  logo: string;
}

interface Testimonial {
  quote: string;
  author: string;
  role: string;
}

interface JobPosition {
  title: string;
  type: string;
  location: string;
  description: string;
}

interface SocialLink {
  platform: string;
  url: string;
}

interface FooterLink {
  label: string;
  url: string;
}

interface ThemeData {
  sections: Record<string, boolean>;
  navbar: { logo: string; links: NavLink[] };
  hero: {
    title: string;
    subtitle: string;
    buttonText: string;
    buttonLink: string;
    imageUrl: string;
  };
  about: {
    title: string;
    description: string;
    imageUrl: string;
    stats: Stat[];
  };
  services: {
    title: string;
    subtitle: string;
    items: ServiceItem[];
  };
  references: {
    title: string;
    subtitle: string;
    clients: Client[];
    testimonials: Testimonial[];
  };
  careers: {
    title: string;
    subtitle: string;
    positions: JobPosition[];
    formTitle: string;
    formSubtitle: string;
  };
  contact: {
    title: string;
    subtitle: string;
    phone: string;
    email: string;
    address: string;
    mapEmbedUrl: string;
  };
  footer: {
    copyright: string;
    socialLinks: SocialLink[];
    links: FooterLink[];
  };
}

// ---------------------------------------------------------------------------
// Icon helper
// ---------------------------------------------------------------------------

function ServiceIcon({ name }: { name: string }) {
  const icons: Record<string, React.ReactNode> = {
    palette: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h1.5c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z" />
      </svg>
    ),
    search: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
    ),
    cart: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
      </svg>
    ),
    cloud: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
      </svg>
    ),
    mobile: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
      </svg>
    ),
    chart: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    code: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
      </svg>
    ),
    shield: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  };
  return <>{icons[name] || icons.code}</>;
}

function SocialIcon({ platform }: { platform: string }) {
  const icons: Record<string, React.ReactNode> = {
    twitter: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
    ),
    linkedin: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
    ),
    instagram: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
    ),
    facebook: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
    ),
    github: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" /></svg>
    ),
    youtube: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
    ),
  };
  return <>{icons[platform] || null}</>;
}

// ---------------------------------------------------------------------------
// Main Theme Component
// ---------------------------------------------------------------------------

export default function Startup1Theme({ data }: { data: ThemeData }) {
  const s = data.sections;

  return (
    <>
      {/* ── Navbar ───────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <a href="#" className="text-xl font-bold text-gray-900">
              {data.navbar.logo}
            </a>
            <div className="hidden md:flex items-center gap-8">
              {data.navbar.links
                .filter((link) => {
                  const sectionId = link.href.replace("#", "");
                  if (sectionId in s) return s[sectionId];
                  return true;
                })
                .map((link, i) => (
                  <a
                    key={i}
                    href={safeUrl(link.href)}
                    className="text-sm text-gray-600 hover:text-gray-900 transition"
                  >
                    {link.label}
                  </a>
                ))}
            </div>
            <a
              href="#contact"
              className="hidden sm:inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition"
            >
              Contact Us
            </a>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      {s.hero && (
        <section id="hero" className="pt-16">
          <div className="relative min-h-[90vh] flex items-center bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
              <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-300 rounded-full blur-3xl" />
            </div>
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 grid lg:grid-cols-2 gap-12 items-center">
              <div className="text-white">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                  {data.hero.title}
                </h1>
                <p className="text-lg sm:text-xl text-white/80 mb-10 max-w-lg">
                  {data.hero.subtitle}
                </p>
                {data.hero.buttonText && (
                  <a
                    href={safeUrl(data.hero.buttonLink) || "#contact"}
                    className="inline-flex items-center gap-2 bg-white text-indigo-700 font-semibold px-8 py-3.5 rounded-full hover:bg-gray-100 transition shadow-lg shadow-indigo-900/20"
                  >
                    {data.hero.buttonText}
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                  </a>
                )}
              </div>
              <div className="hidden lg:block">
                {data.hero.imageUrl ? (
                  <img
                    src={data.hero.imageUrl}
                    alt="Hero"
                    className="rounded-2xl shadow-2xl shadow-black/20 w-full h-[420px] object-cover"
                  />
                ) : (
                  <div className="rounded-2xl bg-white/10 w-full h-[420px] flex items-center justify-center text-white/40">
                    Hero Image
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── About ────────────────────────────────────────────────── */}
      {s.about && (
        <section id="about" className="py-20 sm:py-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                {data.about.imageUrl ? (
                  <img
                    src={data.about.imageUrl}
                    alt="About"
                    className="rounded-2xl shadow-lg w-full h-[400px] object-cover"
                  />
                ) : (
                  <div className="rounded-2xl bg-gray-100 w-full h-[400px] flex items-center justify-center text-gray-400">
                    About Image
                  </div>
                )}
              </div>
              <div>
                <span className="text-indigo-600 font-semibold text-sm uppercase tracking-wider">
                  About Us
                </span>
                <h2 className="text-3xl sm:text-4xl font-bold mt-2 mb-6 text-gray-900">
                  {data.about.title}
                </h2>
                {data.about.description.split("\n").map((p, i) => (
                  <p key={i} className="text-gray-600 leading-relaxed mb-4">
                    {p}
                  </p>
                ))}
                {data.about.stats && data.about.stats.length > 0 && (
                  <div className="grid grid-cols-3 gap-6 mt-8 pt-8 border-t border-gray-100">
                    {data.about.stats.map((stat, i) => (
                      <div key={i}>
                        <p className="text-2xl sm:text-3xl font-bold text-indigo-600">
                          {stat.value}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {stat.label}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Services ─────────────────────────────────────────────── */}
      {s.services && (
        <section id="services" className="py-20 sm:py-28 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <span className="text-indigo-600 font-semibold text-sm uppercase tracking-wider">
                Services
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold mt-2 text-gray-900">
                {data.services.title}
              </h2>
              {data.services.subtitle && (
                <p className="text-gray-500 mt-4 max-w-2xl mx-auto">
                  {data.services.subtitle}
                </p>
              )}
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {data.services.items.map((svc, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-md hover:border-indigo-100 transition group"
                >
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-5 group-hover:bg-indigo-600 group-hover:text-white transition">
                    <ServiceIcon name={svc.icon} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {svc.title}
                  </h3>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    {svc.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── References ───────────────────────────────────────────── */}
      {s.references && (
        <section id="references" className="py-20 sm:py-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <span className="text-indigo-600 font-semibold text-sm uppercase tracking-wider">
                References
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold mt-2 text-gray-900">
                {data.references.title}
              </h2>
              {data.references.subtitle && (
                <p className="text-gray-500 mt-4">
                  {data.references.subtitle}
                </p>
              )}
            </div>

            {/* Client logos */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 mb-16">
              {data.references.clients.map((client, i) => (
                <div
                  key={i}
                  className="bg-gray-50 rounded-xl h-20 flex items-center justify-center border border-gray-100"
                >
                  {client.logo ? (
                    <img src={client.logo} alt={client.name} className="h-8 object-contain" />
                  ) : (
                    <span className="text-sm font-medium text-gray-400">
                      {client.name}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Testimonials */}
            <div className="grid md:grid-cols-3 gap-8">
              {data.references.testimonials.map((t, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm"
                >
                  <svg className="w-8 h-8 text-indigo-200 mb-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H14.017zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10H0z" />
                  </svg>
                  <p className="text-gray-600 leading-relaxed mb-6">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div>
                    <p className="font-semibold text-gray-900">{t.author}</p>
                    <p className="text-sm text-gray-400">{t.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Careers ──────────────────────────────────────────────── */}
      {s.careers && (
        <section id="careers" className="py-20 sm:py-28 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <span className="text-indigo-600 font-semibold text-sm uppercase tracking-wider">
                Careers
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold mt-2 text-gray-900">
                {data.careers.title}
              </h2>
              {data.careers.subtitle && (
                <p className="text-gray-500 mt-4">
                  {data.careers.subtitle}
                </p>
              )}
            </div>

            <div className="grid lg:grid-cols-2 gap-12">
              {/* Job Listings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Open Positions
                </h3>
                {data.careers.positions.map((pos, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-semibold text-gray-900">
                        {pos.title}
                      </h4>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                        {pos.type}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        {pos.location}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {pos.description}
                    </p>
                  </div>
                ))}
              </div>

              {/* Application Form */}
              <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm h-fit">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {data.careers.formTitle}
                </h3>
                <p className="text-gray-500 text-sm mb-6">
                  {data.careers.formSubtitle}
                </p>
                <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      placeholder="John Doe"
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      placeholder="john@example.com"
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      placeholder="+1 555 000 0000"
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Message
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Tell us about yourself..."
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-sm resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Upload CV
                    </label>
                    <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-indigo-300 transition cursor-pointer">
                      <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                      <p className="mt-2 text-sm text-gray-500">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        PDF, DOC up to 5MB
                      </p>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-indigo-600 text-white font-medium py-3 rounded-lg hover:bg-indigo-700 transition"
                  >
                    Submit Application
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Contact ──────────────────────────────────────────────── */}
      {s.contact && (
        <section id="contact" className="py-20 sm:py-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <span className="text-indigo-600 font-semibold text-sm uppercase tracking-wider">
                Contact
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold mt-2 text-gray-900">
                {data.contact.title}
              </h2>
              {data.contact.subtitle && (
                <p className="text-gray-500 mt-4">{data.contact.subtitle}</p>
              )}
            </div>
            <div className="grid lg:grid-cols-2 gap-12">
              {/* Map */}
              <div className="rounded-2xl overflow-hidden shadow-lg h-[400px]">
                {data.contact.mapEmbedUrl ? (
                  <iframe
                    src={safeEmbedUrl(data.contact.mapEmbedUrl)}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
                    Google Maps
                  </div>
                )}
              </div>
              {/* Contact Info */}
              <div className="flex flex-col justify-center space-y-8">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Address</h4>
                    <p className="text-gray-500">{data.contact.address}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Phone</h4>
                    <p className="text-gray-500">{data.contact.phone}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Email</h4>
                    <p className="text-gray-500">{data.contact.email}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            <div className="lg:col-span-2">
              <p className="text-xl font-bold mb-4">{data.navbar.logo}</p>
              <p className="text-gray-400 text-sm max-w-sm leading-relaxed">
                {data.hero.subtitle}
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-gray-400">
                Quick Links
              </h4>
              <ul className="space-y-2">
                {data.navbar.links
                  .filter((link) => {
                    const id = link.href.replace("#", "");
                    return !(id in s) || s[id];
                  })
                  .map((link, i) => (
                    <li key={i}>
                      <a href={safeUrl(link.href)} className="text-gray-400 hover:text-white text-sm transition">
                        {link.label}
                      </a>
                    </li>
                  ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-gray-400">
                Legal
              </h4>
              <ul className="space-y-2">
                {data.footer.links.map((link, i) => (
                  <li key={i}>
                    <a href={safeUrl(link.url)} className="text-gray-400 hover:text-white text-sm transition">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-sm">{data.footer.copyright}</p>
            <div className="flex items-center gap-4">
              {data.footer.socialLinks.map((social, i) => (
                <a
                  key={i}
                  href={safeUrl(social.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-500 hover:text-white transition"
                >
                  <SocialIcon platform={social.platform} />
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
