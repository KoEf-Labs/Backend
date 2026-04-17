import React from "react";

// Premium theme 2 — placeholder with a different palette/feel so the
// preview differs from premium-1. Real design work comes later.

const css = `
:root {
  --bg: #fffbeb;
  --fg: #1c1917;
  --accent: #f59e0b;
}
body { margin: 0; font-family: "Playfair Display", Georgia, serif; background: var(--bg); color: var(--fg); }
.hero { min-height: 90vh; display: flex; align-items: center; padding: 48px 8vw; position: relative; overflow: hidden; }
.hero::before { content: ""; position: absolute; right: -100px; top: -100px; width: 400px; height: 400px; border-radius: 50%; background: radial-gradient(circle, rgba(245,158,11,0.25), transparent 70%); }
.content { max-width: 720px; position: relative; }
.badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 999px; background: rgba(245,158,11,0.12); color: var(--accent); font-size: 0.85rem; font-family: system-ui; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 24px; }
.hero h1 { font-size: clamp(2.5rem, 7vw, 4.5rem); font-weight: 700; line-height: 1.05; letter-spacing: -0.02em; margin: 0 0 24px; }
.hero h1 em { font-style: italic; color: var(--accent); }
.hero p { font-family: system-ui; font-size: 1.15rem; line-height: 1.6; opacity: 0.75; max-width: 560px; margin: 0 0 32px; }
.cta { display: inline-block; padding: 14px 36px; background: var(--fg); color: var(--bg); border-radius: 2px; text-decoration: none; font-weight: 500; font-family: system-ui; font-size: 0.95rem; letter-spacing: 0.05em; text-transform: uppercase; }
.footer { text-align: center; padding: 48px 24px; opacity: 0.4; font-size: 0.85rem; font-family: system-ui; }
`;

interface ThemeData {
  navbar?: { logo?: string };
  hero?: { name?: string; title?: string; subtitle?: string; buttonText?: string; buttonLink?: string };
}

export default function Layout({ data }: { data: ThemeData }) {
  const hero = data.hero ?? {};
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <main>
        <section className="hero">
          <div className="content">
            <div className="badge">◆ Premium Edition</div>
            <h1>
              {hero.name ?? data.navbar?.logo ?? "Elegant"}{" "}
              <em>by design.</em>
            </h1>
            {hero.subtitle && <p>{hero.subtitle}</p>}
            {hero.buttonText && (
              <a className="cta" href={hero.buttonLink ?? "#"}>
                {hero.buttonText}
              </a>
            )}
          </div>
        </section>
        <footer className="footer">© {new Date().getFullYear()}</footer>
      </main>
    </>
  );
}
