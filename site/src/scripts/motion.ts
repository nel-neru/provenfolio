/**
 * Site-wide scroll polish — Lenis smooth scroll + one GSAP reveal pattern.
 * Cinematic, not carnival: a single fade-up effect on [data-reveal] elements
 * (staggered inside [data-reveal-group]) plus the hero canvas recede.
 * Skipped entirely under prefers-reduced-motion. Re-initialized on every
 * astro:page-load; torn down on astro:before-swap (View Transitions).
 */
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let lenis: Lenis | null = null;
let tickerFn: ((time: number) => void) | null = null;
let initialized = false;

export function initMotion(): void {
  if (initialized) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  initialized = true;

  gsap.registerPlugin(ScrollTrigger);

  lenis = new Lenis();
  lenis.on("scroll", ScrollTrigger.update);
  tickerFn = (time: number) => lenis?.raf(time * 1000);
  gsap.ticker.add(tickerFn);
  gsap.ticker.lagSmoothing(0);

  /* -------- reveal: fade-up 24px, once, staggered within groups -------- */
  const revealVars = {
    y: 24,
    opacity: 0,
    duration: 0.7,
    ease: "power2.out",
    clearProps: "opacity,transform", // hand back to CSS (hover transforms etc.)
  } as const;

  const seen = new Set<Element>();
  document.querySelectorAll("[data-reveal-group]").forEach((group) => {
    const items = Array.from(group.querySelectorAll("[data-reveal]"));
    if (items.length === 0) return;
    items.forEach((el) => seen.add(el));
    gsap.from(items, {
      ...revealVars,
      stagger: 0.06,
      scrollTrigger: { trigger: group, start: "top 80%", once: true },
    });
  });
  document.querySelectorAll("[data-reveal]").forEach((el) => {
    if (seen.has(el)) return;
    gsap.from(el, {
      ...revealVars,
      scrollTrigger: { trigger: el, start: "top 80%", once: true },
    });
  });

  /* -------- hero recede: canvas fades/zooms across the first viewport -------- */
  const heroCanvas = document.getElementById("hero-canvas");
  const hero = document.getElementById("hero");
  if (heroCanvas && hero) {
    gsap.fromTo(
      heroCanvas,
      { opacity: 1, scale: 1 },
      {
        opacity: 0.25,
        scale: 1.06,
        ease: "none",
        scrollTrigger: {
          trigger: hero,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      }
    );
  }
}

export function destroyMotion(): void {
  if (!initialized) return;
  initialized = false;
  ScrollTrigger.getAll().forEach((st) => st.kill());
  if (tickerFn) {
    gsap.ticker.remove(tickerFn);
    tickerFn = null;
  }
  lenis?.destroy();
  lenis = null;
}
