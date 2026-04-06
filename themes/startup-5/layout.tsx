import React from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import About from "./components/About";
import Services from "./components/Services";
import Portfolio from "./components/Portfolio";
import Careers from "./components/Careers";
import Contact from "./components/Contact";
import Footer from "./components/Footer";

const globalCSS = `
@keyframes fadeUp { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
@keyframes fadeIn { from { opacity:0 } to { opacity:1 } }

.animate-fade-up { animation: fadeUp 0.7s ease-out both }
.animate-fade-in { animation: fadeIn 0.5s ease-out both }

/* Ultra-minimal scrollbar */
::-webkit-scrollbar { width: 4px }
::-webkit-scrollbar-track { background: transparent }
::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 2px }

::selection { background: rgba(0,0,0,0.06) }
`;

interface ThemeData {
  sections: Record<string, boolean>;
  navbar: any;
  hero: any;
  about: any;
  services: any;
  portfolio: any;
  careers: any;
  contact: any;
  footer: any;
}

export default function Startup5Theme({ data }: { data: ThemeData }) {
  const sec = data.sections;

  return (
    <div className="bg-white text-gray-900 antialiased">
      <style dangerouslySetInnerHTML={{ __html: globalCSS }} />

      <Navbar logo={data.navbar.logo} links={data.navbar.links} sections={sec} />

      {sec.hero && <Hero {...data.hero} />}
      {sec.about && <About {...data.about} />}
      {sec.services && <Services {...data.services} />}
      {sec.portfolio && <Portfolio {...data.portfolio} />}
      {sec.careers && <Careers {...data.careers} />}
      {sec.contact && <Contact {...data.contact} />}

      <Footer
        logo={data.navbar.logo}
        description={data.footer.description}
        copyright={data.footer.copyright}
        socialLinks={data.footer.socialLinks}
        links={data.footer.links}
      />
    </div>
  );
}
