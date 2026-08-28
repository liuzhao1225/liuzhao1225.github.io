# 刘朝宇宙 / Zhao Liu Universe

The source for [liuzhao1225.github.io](https://liuzhao1225.github.io/), the canonical bilingual identity hub for 刘朝（Zhao Liu / 黑纹白斑马）across GitHub, X and Bilibili. The [English profile](https://liuzhao1225.github.io/en/) gives international search engines and readers a dedicated language entry point.

## Structure

- `index.html`: semantic content, metadata and Schema.org entity graph
- `en/index.html`: English profile with reciprocal `hreflang`
- `about/`, `contact/`, `privacy/`, `terms/`: Chinese trust and identity pages
- `en/about/`, `en/contact/`, `en/privacy/`, `en/terms/`: English trust and identity pages
- `llms.txt`: curated machine-readable identity and project index
- `sitemap.xml` and `robots.txt`: search and AI crawler discovery
- `styles.css`: responsive light and dark visual system
- `site.js`: reduced-motion-aware section reveals
- `shader-background.js`: WebGL background renderer
- `scripts/check-site-geo.mjs`: deterministic SEO/GEO validation used in CI

## Local preview

```bash
python3 -m http.server 4173
```

Run the metadata and internal-link check before publishing:

```bash
node scripts/check-site-geo.mjs
```

## Background shader

The animated background adapts [Path to the colorful infinity](https://www.shadertoy.com/view/WtjyzR) by Benoit Marini under the [CC BY-NC-SA 3.0](https://creativecommons.org/licenses/by-nc-sa/3.0/) license.
