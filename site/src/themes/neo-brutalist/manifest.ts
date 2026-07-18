/**
 * Neo-brutalist theme manifest — the registry entry point, exposing
 * tokens and components only. styles.css is deliberately NOT imported
 * here: Astro bundles any CSS reachable through the registry's dynamic-
 * import glob into every page (all themes stacked, cascade collisions).
 * The page shell links this theme's styles.css per page via
 * themeStylesheetHref().
 */
import { theme } from "./tokens.js";
import type { ThemeManifest } from "../../lib/theme-registry.js";

import Header from "./components/Header.astro";
import Footer from "./components/Footer.astro";
import HomePage from "./components/HomePage.astro";
import ProjectsPage from "./components/ProjectsPage.astro";
import ProjectPage from "./components/ProjectPage.astro";
import AboutPage from "./components/AboutPage.astro";
import HistoryPage from "./components/HistoryPage.astro";
import OverviewPage from "./components/OverviewPage.astro";

export const manifest: ThemeManifest = {
  name: "neo-brutalist",
  tokens: theme,
  components: {
    Header,
    Footer,
    HomePage,
    ProjectsPage,
    ProjectPage,
    AboutPage,
    HistoryPage,
    OverviewPage,
  },
};
