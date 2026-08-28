import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const baseURL = "https://liuzhao1225.github.io/";
const errors = [];
const seenTitles = new Map();
const seenCanonicals = new Map();

function fail(message) {
  errors.push(message);
}

function listHTML(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if ([".git", "node_modules"].includes(entry.name)) return [];
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return listHTML(target);
    return entry.name === "index.html" ? [target] : [];
  });
}

function matchOne(html, expression, label, file) {
  const matches = [...html.matchAll(expression)];
  if (matches.length !== 1) {
    fail(`${file}: expected one ${label}, found ${matches.length}`);
    return "";
  }
  return matches[0][1]?.trim() ?? "";
}

function localTargetForHref(file, href) {
  const clean = href.split(/[?#]/, 1)[0];
  if (!clean || /^(?:https?:|mailto:|tel:|javascript:)/i.test(clean)) return null;
  const resolved = path.resolve(path.dirname(file), clean);
  return clean.endsWith("/") ? path.join(resolved, "index.html") : resolved;
}

for (const file of ["robots.txt", "sitemap.xml", "llms.txt"]) {
  if (!fs.existsSync(path.join(root, file))) fail(`${file}: missing required GEO file`);
}

const htmlFiles = listHTML(root).sort();
for (const file of htmlFiles) {
  const relative = path.relative(root, file);
  const html = fs.readFileSync(file, "utf8");
  const title = matchOne(html, /<title[^>]*>([\s\S]*?)<\/title>/gi, "title", relative);
  const description = matchOne(html, /<meta\s+name=["']description["']\s+content=["']([^"']+)["'][^>]*>/gi, "meta description", relative);
  const robots = matchOne(html, /<meta\s+name=["']robots["']\s+content=["']([^"']+)["'][^>]*>/gi, "robots meta", relative).toLowerCase();
  const canonical = matchOne(html, /<link\s+rel=["']canonical["']\s+href=["']([^"']+)["'][^>]*>/gi, "canonical", relative);
  const describedBy = matchOne(html, /<link\s+rel=["']describedby["']\s+href=["']([^"']+)["'][^>]*>/gi, "llms.txt describedby", relative);
  const authorURL = matchOne(html, /<link\s+rel=["']author["']\s+href=["']([^"']+)["'][^>]*>/gi, "author link", relative);
  const h1Count = [...html.matchAll(/<h1\b[^>]*>/gi)].length;

  if (!title || !description) fail(`${relative}: title and description must be nonempty`);
  if (seenTitles.has(title)) fail(`${relative}: title duplicates ${seenTitles.get(title)}`);
  else seenTitles.set(title, relative);
  if (seenCanonicals.has(canonical)) fail(`${relative}: canonical duplicates ${seenCanonicals.get(canonical)}`);
  else seenCanonicals.set(canonical, relative);
  if (!robots.includes("index") || !robots.includes("follow") || !robots.includes("max-snippet:-1")) fail(`${relative}: robots meta must allow indexing, following, and full snippets`);
  if (/noindex|nofollow|nosnippet|data-nosnippet/i.test(html)) fail(`${relative}: contains a blocking robots or snippet directive`);
  if (!canonical.startsWith(baseURL)) fail(`${relative}: canonical must stay on the personal site`);
  if (describedBy !== `${baseURL}llms.txt`) fail(`${relative}: describedby must point to the root llms.txt`);
  if (!authorURL.startsWith(baseURL)) fail(`${relative}: author link must point to the official profile`);
  if (h1Count !== 1) fail(`${relative}: expected one H1, found ${h1Count}`);
  if (!/<time\b[^>]*datetime=["']2026-08-28["']/i.test(html)) fail(`${relative}: missing visible machine-readable update date`);

  for (const language of ["zh-CN", "en", "x-default"]) {
    if (!new RegExp(`<link\\s+rel=["']alternate["'][^>]+hreflang=["']${language}["']`, "i").test(html)) fail(`${relative}: missing ${language} hreflang`);
  }
  for (const policy of ["about/", "contact/", "privacy/", "terms/"]) {
    if (!html.includes(policy)) fail(`${relative}: missing discoverable ${policy} link`);
  }

  const jsonLD = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  if (jsonLD.length === 0) fail(`${relative}: missing JSON-LD`);
  for (const block of jsonLD) {
    try {
      JSON.parse(block[1]);
    } catch (error) {
      fail(`${relative}: invalid JSON-LD: ${error.message}`);
    }
  }

  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)) {
    const target = localTargetForHref(file, match[1]);
    if (target && !fs.existsSync(target)) fail(`${relative}: broken internal link ${match[1]}`);
  }
}

const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
const sitemapURLs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
if (new Set(sitemapURLs).size !== sitemapURLs.length) fail("sitemap.xml: contains duplicate loc URLs");
const expectedURLs = htmlFiles.map((file) => {
  const directory = path.relative(root, path.dirname(file)).split(path.sep).join("/");
  return directory ? `${baseURL}${directory}/` : baseURL;
});
for (const url of expectedURLs) if (!sitemapURLs.includes(url)) fail(`sitemap.xml: missing ${url}`);
for (const url of sitemapURLs) if (!url.startsWith(baseURL)) fail(`sitemap.xml: URL outside the GitHub Pages site ${url}`);

const robotsText = fs.readFileSync(path.join(root, "robots.txt"), "utf8");
for (const bot of ["OAI-SearchBot", "GPTBot", "ChatGPT-User", "ClaudeBot", "PerplexityBot", "Googlebot"]) {
  if (!robotsText.includes(`User-agent: ${bot}`)) fail(`robots.txt: missing explicit access record for ${bot}`);
}
if (!robotsText.includes(`Sitemap: ${baseURL}sitemap.xml`)) fail("robots.txt: missing canonical sitemap URL");

const llms = fs.readFileSync(path.join(root, "llms.txt"), "utf8");
if (!llms.startsWith("# Zhao Liu / 刘朝\n")) fail("llms.txt: must start with the canonical identity H1");
if (!llms.includes("> This is the official bilingual personal website")) fail("llms.txt: missing concise identity summary");

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`GEO checks passed for ${htmlFiles.length} HTML pages and ${sitemapURLs.length} sitemap URLs.`);
