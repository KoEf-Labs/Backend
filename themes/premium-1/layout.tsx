import React from "react";

// Premium theme 1 — placeholder. Real visuals will be designed together
// later; this renders just enough to verify the purchase + render path
// end-to-end. Non-owners should never see this layout because the render
// pipeline rejects unauthorized access upstream.

const css = `
:root {
  --bg: #0f0f1a;
  --fg: #f8f8ff;
  --accent: #8b5cf6;
}
body { margin: 0; font-family: -apple-system, system-ui, sans-serif; background: var(--bg); color: var(--fg); }
.hero { min-height: 90vh; display: flex; align-items: center; justify-content: center; text-align: center; padding: 48px 24px; background: linear-gradient(135deg, #0f0f1a 0%, #1e1b4b 100%); }
.hero h1 { font-size: clamp(2.5rem, 8vw, 5rem); font-weight: 800; letter-spacing: -0.03em; margin: 0 0 16px; background: linear-gradient(135deg, #fff 30%, var(--accent)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.hero p { font-size: 1.2rem; opacity: 0.8; max-width: 600px; margin: 0 auto 32px; }
.badge { display: inline-block; padding: 6px 14px; border-radius: 999px; background: rgba(139,92,246,0.15); color: var(--accent); font-size: 0.85rem; margin-bottom: 24px; letter-spacing: 0.02em; }
.cta { display: inline-block; padding: 14px 32px; background: var(--accent); color: white; border-radius: 12px; text-decoration: none; font-weight: 600; transition: transform 0.2s; }
.cta:hover { transform: translateY(-2px); }
.footer { text-align: center; padding: 48px 24px; opacity: 0.5; font-size: 0.85rem; }
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
          <div>
            <div className="badge">✨ Premium</div>
            <h1>{hero.name ?? data.navbar?.logo ?? "Premium Site"}</h1>
            {hero.title && <p>{hero.title}</p>}
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
