/**
 * OG-image exporter — renders 1200x630 social-card PNGs into site/public/og/:
 *   profile.png            (owner card: name, role, tagline, language bar, socials)
 *   <projectId>.png        (per project: name, summary, owner + top-3 tech chips)
 *
 * Composition uses the active theme's tokens (via the site/src/theme.ts
 * engine shim; a buyer's tokens live in site/src/themes/<name>/) so cards
 * match the site. Text is rendered in the profile's sourceLang. Pipeline:
 * satori (element objects -> SVG, glyphs outlined) -> @resvg/resvg-js -> PNG.
 *
 * Fonts: Noto Sans JP static TTFs (Regular + Bold, OFL — see fonts/OFL.txt).
 * Static instances are required: satori's opentype.js fork cannot parse the
 * google/fonts variable TTF's fvar table. These are the full (non-subset)
 * static instances Google Fonts serves to legacy user agents.
 *
 * Run: npx tsx engine/exporters/og-images/generate.ts
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { ROOT, PROJECTS_DIR, PROFILE_FILE } from "../../scripts/lib/paths.js";
import { readJson, listJsonFiles } from "../../scripts/lib/io.js";
import { theme } from "../../../site/src/theme.js";
import type { LocalizedText, Profile, Project } from "../../schemas/index.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FONT_REGULAR = path.join(HERE, "fonts", "NotoSansJP-Regular.ttf");
const FONT_BOLD = path.join(HERE, "fonts", "NotoSansJP-Bold.ttf");
const OUT_DIR = path.join(ROOT, "site", "public", "og");

const WIDTH = 1200;
const HEIGHT = 630;

/** Satori element object (JSX-less API). */
interface El {
  type: string;
  props: {
    style?: Record<string, string | number>;
    children?: El | El[] | string;
  };
}

function div(
  style: Record<string, string | number>,
  children?: El | El[] | string
): El {
  return { type: "div", props: { style, children } };
}

/** Source-language text with graceful fallback to any non-empty locale. */
function src(text: LocalizedText | undefined, lang: string): string {
  if (!text) return "";
  const primary = text[lang];
  if (primary) return primary;
  for (const value of Object.values(text)) if (value) return value;
  return "";
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function chip(label: string): El {
  return div(
    {
      display: "flex",
      padding: "10px 22px",
      backgroundColor: theme.bgRaised,
      border: `1px solid ${theme.line}`,
      borderRadius: 999,
      color: theme.textDim,
      fontSize: 24,
      lineHeight: 1.2,
    },
    label
  );
}

/** Shared frame: bg, subtle left accent bar, padded column of content. */
function frame(children: El[]): El {
  return div(
    {
      width: WIDTH,
      height: HEIGHT,
      display: "flex",
      backgroundColor: theme.bg,
      fontFamily: "Noto Sans JP",
      overflow: "hidden",
    },
    [
      div({ width: 12, height: HEIGHT, backgroundColor: theme.accent }),
      div(
        {
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          flexGrow: 1,
          padding: "64px 72px 56px 64px",
        },
        children
      ),
    ]
  );
}

function projectCard(project: Project, profile: Profile): El {
  const lang = profile.sourceLang;
  const name = project.name;
  const summary = truncate(src(project.summary, lang), 110);
  const tech = (project.techStack ?? []).slice(0, 3).map((t) => t.name);

  return frame([
    div({ display: "flex", flexDirection: "column" }, [
      div(
        {
          display: "flex",
          fontSize: name.length > 18 ? 58 : 78,
          fontWeight: 700,
          color: theme.text,
          lineHeight: 1.12,
          letterSpacing: "-0.02em",
        },
        name
      ),
      div(
        {
          display: "flex",
          marginTop: 30,
          fontSize: 30,
          fontWeight: 400,
          color: theme.textDim,
          lineHeight: 1.6,
        },
        summary
      ),
    ]),
    div({ display: "flex", alignItems: "center" }, [
      div(
        {
          display: "flex",
          fontSize: 26,
          fontWeight: 700,
          color: theme.textFaint,
          marginRight: 28,
        },
        profile.name
      ),
      div({ display: "flex", gap: 14 }, tech.map(chip)),
    ]),
  ]);
}

/**
 * Cross-project language composition, mirroring the site's LanguageBars
 * component: largest share first, tail beyond the color count folded into
 * "Other". Shares come from script-produced metrics.languages only; weights
 * use bytes when every entry has them, else per-project pct (equal weight).
 * No numbers are printed — the bar is purely proportional.
 */
interface LanguageSlice {
  name: string;
  share: number;
}

/** Fixed assignment: largest share gets the brightest ramp step (like the site). */
const BAR_COLORS = [
  theme.viz[4],
  theme.viz[3],
  theme.viz[2],
  theme.viz[1],
  theme.accent,
];

/** Index into BAR_COLORS; slice counts never exceed it, but keep tsc happy. */
function barColor(i: number): string {
  return BAR_COLORS[i] ?? theme.accent;
}

function aggregateLanguages(projects: Project[]): LanguageSlice[] {
  const entries = projects.flatMap((p) => p.metrics?.languages ?? []);
  if (entries.length === 0) return [];
  const useBytes = entries.every((l) => typeof l.bytes === "number");
  const totals = new Map<string, number>();
  for (const l of entries) {
    const weight = useBytes ? (l.bytes as number) : l.pct;
    if (weight <= 0) continue;
    totals.set(l.name, (totals.get(l.name) ?? 0) + weight);
  }
  const sorted = [...totals.entries()]
    .map(([name, weight]) => ({ name, weight }))
    .sort((a, b) => b.weight - a.weight);
  const grand = sorted.reduce((sum, l) => sum + l.weight, 0);
  if (grand <= 0) return [];
  let slices = sorted.map((l) => ({ name: l.name, share: l.weight / grand }));
  if (slices.length > BAR_COLORS.length) {
    const head = slices.slice(0, BAR_COLORS.length - 1);
    const tail = slices.slice(BAR_COLORS.length - 1);
    slices = [
      ...head,
      { name: "Other", share: tail.reduce((sum, l) => sum + l.share, 0) },
    ];
  }
  return slices;
}

/** Stacked proportional bar + dot legend (no numeric labels). */
function languageBarBlock(slices: LanguageSlice[]): El {
  return div({ display: "flex", flexDirection: "column", gap: 18 }, [
    div(
      {
        display: "flex",
        height: 14,
        borderRadius: 999,
        overflow: "hidden",
        gap: 3,
        backgroundColor: theme.bg,
      },
      slices.map((s, i) =>
        div({
          display: "flex",
          flexGrow: Math.max(s.share, 0.01) * 1000,
          backgroundColor: barColor(i),
        })
      )
    ),
    div(
      { display: "flex", gap: 28 },
      slices.map((s, i) =>
        div({ display: "flex", alignItems: "center", gap: 10 }, [
          div({
            display: "flex",
            width: 12,
            height: 12,
            borderRadius: 999,
            backgroundColor: barColor(i),
          }),
          div(
            { display: "flex", fontSize: 22, color: theme.textDim, lineHeight: 1.2 },
            s.name
          ),
        ])
      )
    ),
  ]);
}

function profileCard(profile: Profile, projects: Project[]): El {
  const lang = profile.sourceLang;
  const role = src(profile.role, lang);
  const tagline = truncate(src(profile.tagline, lang), 110);
  const slices = aggregateLanguages(projects);

  // Socials when present; otherwise the GitHub account (always in profile),
  // so the footer row never collapses to nothing on a fresh seed.
  const chips =
    profile.socials.length > 0
      ? profile.socials
          .slice(0, 4)
          .map((s) => chip(`${s.platform} · ${s.handle ?? s.url}`))
      : [chip(`github.com/${profile.githubUser}`)];

  const footer: El[] = [];
  if (slices.length > 0) footer.push(languageBarBlock(slices));
  footer.push(div({ display: "flex", gap: 14 }, chips));

  return frame([
    // Identity block centered in the space above the footer so the card
    // stays balanced whether or not a language bar exists.
    div(
      {
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        flexGrow: 1,
      },
      [
        div(
          {
            display: "flex",
            fontSize: 28,
            fontWeight: 700,
            color: theme.accent,
            lineHeight: 1.2,
          },
          role
        ),
        div(
          {
            display: "flex",
            marginTop: 18,
            fontSize: 84,
            fontWeight: 700,
            color: theme.text,
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
          },
          profile.name
        ),
        div(
          {
            display: "flex",
            marginTop: 30,
            fontSize: 32,
            fontWeight: 400,
            color: theme.textDim,
            lineHeight: 1.6,
          },
          tagline
        ),
      ]
    ),
    div(
      { display: "flex", flexDirection: "column", gap: 30, marginTop: 44 },
      footer
    ),
  ]);
}

async function renderPng(
  element: El,
  fonts: { name: string; data: Buffer; weight: 400 | 700; style: "normal" }[]
): Promise<Buffer> {
  const svg = await satori(element, { width: WIDTH, height: HEIGHT, fonts });
  const resvg = new Resvg(svg, { fitTo: { mode: "original" } });
  return resvg.render().asPng();
}

async function main(): Promise<void> {
  const fonts: { name: string; data: Buffer; weight: 400 | 700; style: "normal" }[] = [
    { name: "Noto Sans JP", data: fs.readFileSync(FONT_REGULAR), weight: 400, style: "normal" },
    { name: "Noto Sans JP", data: fs.readFileSync(FONT_BOLD), weight: 700, style: "normal" },
  ];

  const profile = readJson(PROFILE_FILE) as Profile;
  const projects = listJsonFiles(PROJECTS_DIR).map(
    (file) => readJson(file) as Project
  );
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const profileOut = path.join(OUT_DIR, "profile.png");
  fs.writeFileSync(
    profileOut,
    await renderPng(profileCard(profile, projects), fonts)
  );
  console.log(`og-images: wrote ${path.relative(ROOT, profileOut)}`);

  for (const project of projects) {
    const out = path.join(OUT_DIR, `${project.id}.png`);
    fs.writeFileSync(out, await renderPng(projectCard(project, profile), fonts));
    console.log(`og-images: wrote ${path.relative(ROOT, out)}`);
  }
}

main().catch((err) => {
  console.error("og-images: generation failed");
  console.error(err);
  process.exit(1);
});
