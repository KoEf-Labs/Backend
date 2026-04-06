import React from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import About from "./components/About";
import Services from "./components/Services";
import References from "./components/References";
import Careers from "./components/Careers";
import Contact from "./components/Contact";
import Footer from "./components/Footer";

/* ─── Global Animation CSS ────────────────────────────────────────────────── */

const globalCSS = `
@keyframes fadeUp { from { opacity:0; transform:translateY(40px) } to { opacity:1; transform:translateY(0) } }
@keyframes fadeDown { from { opacity:0; transform:translateY(-20px) } to { opacity:1; transform:translateY(0) } }
@keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
@keyframes neonPulse { 0%,100% { opacity:0.5 } 50% { opacity:1 } }
@keyframes gridScroll { from { transform: translateY(0) } to { transform: translateY(60px) } }
@keyframes glow { 0%,100% { box-shadow: 0 0 20px rgba(6,182,212,0.1) } 50% { box-shadow: 0 0 40px rgba(6,182,212,0.3) } }

.animate-fade-up { animation: fadeUp 0.8s ease-out both }
.animate-fade-down { animation: fadeDown 0.6s ease-out both }
.animate-fade-in { animation: fadeIn 0.6s ease-out both }
.neon-pulse { animation: neonPulse 3s ease-in-out infinite }
.animate-glow { animation: glow 3s ease-in-out infinite }

.anim-delay-100 { animation-delay: 100ms }
.anim-delay-200 { animation-delay: 200ms }
.anim-delay-300 { animation-delay: 300ms }
.anim-delay-400 { animation-delay: 400ms }
.anim-delay-500 { animation-delay: 500ms }
.anim-delay-600 { animation-delay: 600ms }

/* Scrollbar */
::-webkit-scrollbar { width: 6px }
::-webkit-scrollbar-track { background: #020617 }
::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 3px }
::-webkit-scrollbar-thumb:hover { background: #334155 }

/* Selection */
::selection { background: rgba(6,182,212,0.3); color: white }
`;

/* ─── Main Theme ──────────────────────────────────────────────────────────── */

interface ThemeData {
  sections: Record<string, boolean>;
  navbar: any;
  hero: any;
  about: any;
  services: any;
  references: any;
  careers: any;
  contact: any;
  footer: any;
}

export default function Startup3Theme({ data }: { data: ThemeData }) {
  const sec = data.sections;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: globalCSS }} />

      <Navbar logo={data.navbar.logo} links={data.navbar.links} sections={sec} />

      {sec.hero && <Hero {...data.hero} />}
      {sec.about && <About {...data.about} />}
      {sec.services && <Services {...data.services} />}
      {sec.references && <References {...data.references} />}
      {sec.careers && <Careers {...data.careers} />}
      {sec.contact && <Contact {...data.contact} />}

      <Footer
        logo={data.navbar.logo}
        description={data.footer.description}
        copyright={data.footer.copyright}
        socialLinks={data.footer.socialLinks}
        links={data.footer.links}
        navLinks={data.navbar.links}
        sections={sec}
      />
    </>
  );
}
