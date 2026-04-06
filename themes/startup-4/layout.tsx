import React from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import About from "./components/About";
import Services from "./components/Services";
import References from "./components/References";
import Careers from "./components/Careers";
import Contact from "./components/Contact";
import Footer from "./components/Footer";

const globalCSS = `
@keyframes fadeUp { from { opacity:0; transform:translateY(30px) } to { opacity:1; transform:translateY(0) } }
@keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
@keyframes shapeFloat { 0%,100% { transform:translateY(0) rotate(0deg) } 50% { transform:translateY(-20px) rotate(3deg) } }
@keyframes marqueeScroll { from { transform:translateX(0) } to { transform:translateX(-33.33%) } }

.animate-fade-up { animation: fadeUp 0.8s ease-out both }
.animate-fade-in { animation: fadeIn 0.6s ease-out both }
.shape-float { animation: shapeFloat 6s ease-in-out infinite }
.marquee-track { animation: marqueeScroll 30s linear infinite }

.anim-delay-100 { animation-delay:.1s }
.anim-delay-200 { animation-delay:.2s }
.anim-delay-300 { animation-delay:.3s }
.anim-delay-400 { animation-delay:.4s }
.anim-delay-500 { animation-delay:.5s }

/* Selection color */
::selection { background: rgba(244,63,94,0.2) }
`;

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

export default function Startup4Theme({ data }: { data: ThemeData }) {
  const sec = data.sections;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: globalCSS }} />

      <Navbar logo={data.navbar.logo} tagline={data.navbar.tagline} links={data.navbar.links} sections={sec} />

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
