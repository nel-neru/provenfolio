/**
 * Data-forensic theme manifest — the registry entry point. Importing it
 * pulls in the theme stylesheet and every component, so a page that loads
 * this manifest (statically or dynamically) carries the full theme.
 */
import "./styles.css";
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
  name: "data-forensic",
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
