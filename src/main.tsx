import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { heroTitle, sections, type Block, type SiteSection } from './data/content';
import './styles.css';

gsap.registerPlugin(ScrollTrigger);

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return reduced;
}

function isBlockEmpty(block: Block) {
  if (block.kind === 'code') return block.code.trim().length === 0;
  if (/<(img|svg|canvas|table)\b/i.test(block.html)) return false;
  return block.html.replace(/<[^>]*>/g, '').replace(/\s+/g, '').length === 0;
}

function normalizeSections(items: SiteSection[]) {
  return items.map((section) => ({
    ...section,
    blocks: section.blocks.filter((block) => !isBlockEmpty(block)),
  }));
}

function HtmlBlock({ html }: { html: string }) {
  return <div className="html-block" dangerouslySetInnerHTML={{ __html: html }} />;
}

function CodeBlock({ code }: { code: string }) {
  return <pre className="code-block"><code>{code}</code></pre>;
}

function ContentBlock({ block }: { block: Block }) {
  if (block.kind === 'code') return <CodeBlock code={block.code} />;
  return <HtmlBlock html={block.html} />;
}

function SectionCard({ section, index, reduced }: { section: SiteSection; index: number; reduced: boolean }) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;

    const onEnter = () => {
      gsap.to(el, {
        y: -4,
        boxShadow: '0 24px 70px rgba(41, 82, 105, .14)',
        duration: 0.22,
        ease: 'power2.out',
      });
    };

    const onLeave = () => {
      gsap.to(el, {
        y: 0,
        boxShadow: '0 18px 52px rgba(41, 82, 105, .09)',
        duration: 0.22,
        ease: 'power2.out',
      });
    };

    el.addEventListener('pointerenter', onEnter, { passive: true });
    el.addEventListener('pointerleave', onLeave, { passive: true });

    return () => {
      el.removeEventListener('pointerenter', onEnter);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, [reduced]);

  return (
    <section ref={ref} id={`section-${index}`} className="section-card">
      <header className="section-head">
        <h2>{section.title}</h2>
      </header>
      <div className="blocks">
        {section.blocks.map((block, blockIndex) => <ContentBlock key={`${block.kind}-${blockIndex}`} block={block} />)}
      </div>
    </section>
  );
}

function App() {
  const reduced = useReducedMotion();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const cleanSections = useMemo(() => normalizeSections(sections), []);
  const contentSections = useMemo(() => cleanSections.slice(1), [cleanSections]);
  const nav = useMemo(() => contentSections.map((section, index) => ({ title: section.title, id: `section-${index}` })), [contentSections]);
  const words = heroTitle.split(' ');

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      if (reduced) return;

      gsap.fromTo('.hero-panel', { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.72, ease: 'power3.out' });
      gsap.fromTo('.hero-title span', { yPercent: 80, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.72, stagger: 0.015, ease: 'power3.out' });

      gsap.utils.toArray<HTMLElement>('.section-card').forEach((card) => {
        gsap.fromTo(card, { y: 38, opacity: 0 }, {
          y: 0,
          opacity: 1,
          duration: 0.62,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: card,
            start: 'top 86%',
            toggleActions: 'play none none none',
          },
        });
      });

      gsap.to('.orb-one', { yPercent: 18, scrollTrigger: { trigger: root, start: 'top top', end: 'bottom bottom', scrub: 1.2 } });
      gsap.to('.orb-two', { yPercent: -18, scrollTrigger: { trigger: root, start: 'top top', end: 'bottom bottom', scrub: 1.2 } });
      gsap.to('.bg-grid', { yPercent: -6, scrollTrigger: { trigger: root, start: 'top top', end: 'bottom bottom', scrub: 1.4 } });
    }, root);

    const cursor = cursorRef.current;
    const moveCursor = (event: PointerEvent) => {
      if (!cursor || reduced || window.innerWidth < 960) return;
      gsap.to(cursor, { x: event.clientX, y: event.clientY, duration: 0.22, ease: 'power2.out' });
    };

    window.addEventListener('pointermove', moveCursor, { passive: true });
    return () => {
      ctx.revert();
      window.removeEventListener('pointermove', moveCursor);
    };
  }, [reduced]);

  return (
    <div ref={rootRef} className="site-shell">
      <div ref={cursorRef} className="cursor-glow" />
      <div className="bg-grid" />
      <div className="orb orb-one" />
      <div className="orb orb-two" />

      <header className="hero">
        <div className="hero-panel">
          <h1 className="hero-title">
            {words.map((word, index) => <span key={`${word}-${index}`}>{word}{index < words.length - 1 ? '\u00a0' : ''}</span>)}
          </h1>
          <nav className="nav-ribbon" aria-label="Навигация">
            {nav.map((item) => <a key={item.id} href={`#${item.id}`}>{item.title}</a>)}
          </nav>
        </div>
      </header>

      <main className="content-flow">
        {contentSections.map((section, index) => <SectionCard key={`${section.title}-${index}`} section={section} index={index} reduced={reduced} />)}
      </main>
    </div>
  );
}

const container = document.getElementById('root') as HTMLElement & { __root?: Root };
container.__root ??= createRoot(container);
container.__root.render(<App />);
