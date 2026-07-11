/**
 * OG-image exporter — renders 1200x630 social-card PNGs into site/public/og/:
 *   profile.png            (owner card: name, role, tagline)
 *   <projectId>.png        (per project: name, summary, owner + top-3 tech chips)
 *
 * Composition uses the buyer theme tokens (site/src/theme.ts) so cards match
 * the site. Text is rendered in the profile's sourceLang. Pipeline:
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

function profileCard(profile: Profile): El {
  const lang = profile.sourceLang;
  const role = src(profile.role, lang);
  const tagline = truncate(src(profile.tagline, lang), 110);

  return frame([
    div({ display: "flex", flexDirection: "column" }, [
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
    ]),
    div(
      { display: "flex", gap: 14 },
      profile.socials.map((s) => chip(`${s.platform} · ${s.handle ?? s.url}`))
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
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const profileOut = path.join(OUT_DIR, "profile.png");
  fs.writeFileSync(profileOut, await renderPng(profileCard(profile), fonts));
  console.log(`og-images: wrote ${path.relative(ROOT, profileOut)}`);

  for (const file of listJsonFiles(PROJECTS_DIR)) {
    const project = readJson(file) as Project;
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
