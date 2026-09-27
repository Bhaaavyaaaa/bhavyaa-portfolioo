// Applies site.config.json to every page and generates the crawl files.
//   node scripts/set-site-url.mjs
//
// Per page it rewrites: canonical, og:url, og:/twitter: title + description
// (copied from the page's own <title> and meta description, so they never
// drift), og:/twitter: image base, and one JSON-LD @graph. It then writes
// sitemap.xml, robots.txt and llms.txt. Safe to run repeatedly; line endings
// of each file are preserved.
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cfg = JSON.parse(readFileSync(join(root, 'site.config.json'), 'utf8'));
const SITE = cfg.siteUrl.replace(/\/+$/, '');
const clean = cfg.cleanUrls !== false;

// Every public page. `parent` builds the breadcrumb trail.
const PAGES = [
  { file: 'index.html', slug: '', label: 'Home', type: 'WebPage' },
  { file: 'work.html', slug: 'work', label: 'Work', type: 'CollectionPage' },
  { file: 'experience.html', slug: 'experience', label: 'Experience', type: 'WebPage' },
  { file: 'about.html', slug: 'about', label: 'About', type: 'AboutPage' },
  { file: 'contact.html', slug: 'contact', label: 'Contact', type: 'ContactPage' },
  { file: 'case-studies/muviq.html', slug: 'case-studies/muviq', label: 'MUVIQ', type: 'WebPage', parent: 'work', caseStudy: true },
  { file: 'case-studies/kyra-clinic.html', slug: 'case-studies/kyra-clinic', label: 'Kyra Clinic', type: 'WebPage', parent: 'work', caseStudy: true },
  { file: 'case-studies/blossom-wellness.html', slug: 'case-studies/blossom-wellness', label: 'Blossom Wellness', type: 'WebPage', parent: 'work', caseStudy: true },
  { file: 'case-studies/alpyramid.html', slug: 'case-studies/alpyramid', label: 'ALPYRAMID', type: 'WebPage', parent: 'work', caseStudy: true },
  { file: '404.html', slug: '404', label: 'Page not found', noindex: true },
];

const urlFor = (slug) => (slug === '' ? `${SITE}/` : `${SITE}/${slug}${clean ? '' : '.html'}`);
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const attr = (s) => s.replace(/&(?!amp;|quot;|#39;|lt;|gt;)/g, '&amp;').replace(/"/g, '&quot;');
const PERSON_ID = `${SITE}/#person`;
const WEBSITE_ID = `${SITE}/#website`;

const person = {
  '@type': 'Person',
  '@id': PERSON_ID,
  name: 'Bhavya Arora',
  jobTitle: 'Growth Executive',
  worksFor: { '@type': 'Organization', name: 'iOTA' },
  description: 'Performance marketer planning, launching and optimizing paid campaigns across Google Ads, Meta Ads and LinkedIn Ads.',
  url: `${SITE}/`,
  image: `${SITE}/assets/img/bhavya-portrait-about.jpg`,
  knowsAbout: ['Performance Marketing', 'Paid Acquisition', 'Google Ads', 'Meta Ads', 'LinkedIn Ads', 'Campaign Strategy', 'Growth Strategy', 'Funnel Optimization', 'Conversion Optimization', 'Performance Analysis', 'Lead Generation', 'SEO', 'Email Marketing'],
  ...(cfg.sameAs?.length ? { sameAs: cfg.sameAs } : {}),
};

const meta = {};
for (const p of PAGES) {
  const path = join(root, p.file);
  const raw = readFileSync(path, 'utf8');
  const crlf = raw.includes('\r\n');
  let s = raw.replace(/\r\n/g, '\n');
  const title = decode(s.match(/<title>([\s\S]*?)<\/title>/)[1].trim());
  const desc = decode(s.match(/<meta name="description" content="([^"]*)"/)[1]);
  const url = urlFor(p.slug);
  meta[p.slug] = { title, desc, url, label: p.label };

  const setMeta = (re, value) => { s = s.replace(re, (_, a, b) => `${a}${attr(value)}${b}`); };
  setMeta(/(<meta property="og:title" content=")[^"]*(")/, title);
  setMeta(/(<meta name="twitter:title" content=")[^"]*(")/, title);
  setMeta(/(<meta property="og:description" content=")[^"]*(")/, desc);
  setMeta(/(<meta name="twitter:description" content=")[^"]*(")/, desc);
  setMeta(/(<meta property="og:url" content=")[^"]*(")/, url);
  s = s.replace(/(<meta (?:property="og:image"|name="twitter:image") content=")[^"]*?(\/assets\/[^"]*")/g, `$1${SITE}$2`);

  if (!p.noindex) {
    if (/<link rel="canonical"/.test(s)) setMeta(/(<link rel="canonical" href=")[^"]*(")/, url);
    else s = s.replace(/(<meta name="description"[^>]*>\n)/, `$1  <link rel="canonical" href="${url}" />\n`);
  }

  // One JSON-LD graph per indexable page, replacing any earlier blocks
  s = s.replace(/\n?[ \t]*<script type="application\/ld\+json">[\s\S]*?<\/script>\n?/g, '\n');
  if (!p.noindex) {
    const graph = [];
    const page = { '@type': p.type, '@id': `${url}#webpage`, url, name: title, description: desc, inLanguage: 'en', isPartOf: { '@id': WEBSITE_ID }, about: { '@id': PERSON_ID } };
    if (p.slug === '' || p.slug === 'about') graph.push(person);
    else page.author = { '@id': PERSON_ID };
    if (p.slug === '') graph.push({ '@type': 'WebSite', '@id': WEBSITE_ID, url: `${SITE}/`, name: 'Bhavya Arora', inLanguage: 'en', publisher: { '@id': PERSON_ID } });
    if (p.caseStudy) page.mainEntity = { '@type': 'CreativeWork', name: `${p.label} case study`, author: { '@id': PERSON_ID } };
    if (p.slug !== '') {
      const trail = [{ name: 'Home', item: `${SITE}/` }];
      if (p.parent) trail.push({ name: meta[p.parent]?.label || 'Work', item: urlFor(p.parent) });
      trail.push({ name: p.label, item: url });
      page.breadcrumb = { '@id': `${url}#breadcrumb` };
      graph.push({ '@type': 'BreadcrumbList', '@id': `${url}#breadcrumb`, itemListElement: trail.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: t.name, item: t.item })) });
    }
    graph.unshift(page);
    const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }, null, 2).replace(/\n/g, '\n  ');
    s = s.replace(/\n<\/head>/, `\n  <script type="application/ld+json">\n  ${json}\n  </script>\n</head>`);
  }

  s = s.replace(/\n{3,}(\s*<\/head>)/, '\n$1');
  writeFileSync(path, crlf ? s.replace(/\n/g, '\r\n') : s);
}

// sitemap.xml — indexable pages only, lastmod from each file's modification date
const indexable = PAGES.filter((p) => !p.noindex);
writeFileSync(join(root, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<!-- Generated by scripts/set-site-url.mjs from site.config.json -->\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  indexable.map((p) => `  <url><loc>${urlFor(p.slug)}</loc><lastmod>${statSync(join(root, p.file)).mtime.toISOString().slice(0, 10)}</lastmod></url>`).join('\n') +
  `\n</urlset>\n`);

// robots.txt — everything public is crawlable
writeFileSync(join(root, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);

// llms.txt — short, factual; case-study lines are the pages' own descriptions
const cs = indexable.filter((p) => p.caseStudy);
writeFileSync(join(root, 'llms.txt'), `# Bhavya Arora

> Portfolio of Bhavya Arora — performance marketer and Growth Executive at iOTA. Paid acquisition across Google Ads, Meta Ads and LinkedIn Ads, with a background in SEO, websites, content, social media, email and research.

The site presents Bhavya's work, how that experience developed, and a personal introduction. Case studies describe the work done for each client and only report results that are evidenced on the page.

## Pages

- [Home](${urlFor('')}): ${meta[''].desc}
- [Work](${urlFor('work')}): ${meta.work.desc}
- [Experience](${urlFor('experience')}): ${meta.experience.desc}
- [About](${urlFor('about')}): ${meta.about.desc}
- [Contact](${urlFor('contact')}): ${meta.contact.desc}

## Case studies

${cs.map((p) => `- [${p.label}](${urlFor(p.slug)}): ${meta[p.slug].desc}`).join('\n')}
`);

console.log(`Applied ${SITE} (cleanUrls: ${clean}) to ${PAGES.length} pages; wrote sitemap.xml (${indexable.length} URLs), robots.txt, llms.txt`);
