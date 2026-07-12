/**
 * THE theme selector — the buyer customization surface, with your theme
 * package under src/themes/<name>/. Engine updates never touch this file.
 *
 * activeTheme: the design served at the root URLs. Everything — colors,
 * fonts, layout, page composition, the 3D hero palette, OG images, and
 * the Studio cockpit — follows from this line. Restart dev servers after
 * switching.
 *
 * visitorThemes: which installed themes the on-site design switcher
 * offers ("all", or an explicit array like ["midnight", "quiet-luxury"]).
 * Every listed theme is prerendered under /t/<name>/ so visitors can
 * flip the whole design live. The switcher hides itself when fewer than
 * two themes are exposed; set ["<activeTheme>"] to disable it entirely.
 */
export const activeTheme = "midnight";
export const visitorThemes = "all";
