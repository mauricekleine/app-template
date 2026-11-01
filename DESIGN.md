# Design

Use superthread v2 from the installed `@mk` registry items. The visual authority is the superthread-design skill and [the system's design record](https://github.com/mauricekleine/mauricekleine.com/blob/main/packages/superthread/DESIGN.md).

The starting page takes the fleet's mode from `@mk/theme`, and the fleet rail's mode cell changes it. Square edges, one plum fill on paper, Supreme body, Unbounded headings and Fragment Mono metadata come from the installed tokens. The fleet rail stays on the deep ground. App styles own layout, never theme values.

The working panel is at most 880 px wide on every page, so main content holds its place between pages. The rail brings the skip link, so each page's `main` holds `id="main"`. The tokens' base layer owns the window's ground, selection, scrollbar, caret and focus ring, so `src/page.css` writes none of them.

`public/mark.svg` is a neutral placeholder. Replace it with the app's mark when creating a ship; the same file supplies the masthead and favicon. Fill in the app's purpose, density and route-specific composition here as the app grows.
