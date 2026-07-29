const fs = require('fs');
const path = require('path');

const DOMAIN = 'https://nodntools.com';
const ROOT_DIR = __dirname;

const EXCLUDED_NAMES = new Set([
  'node_modules',
  '.git',
  '.github',
  'generate-meta.js',
  'sitemap.xml',
  'rss.xml',
  'package.json',
  'package-lock.json',
  'vercel.json',
  'robots.txt',
  '404.html'
]);

const EXCLUDED_PATTERNS = [
  /\(\d+\)\.html$/i,
  /(?:^|[-_.])backup(?:[-_.]|$)/i,
  /(?:^|[-_.])copy(?:[-_.]|$)/i,
  /(?:^|[-_.])test(?:[-_.]|$)/i,
  /(?:^|[-_.])draft(?:[-_.]|$)/i,
  /(?:^|[-_.])old(?:[-_.]|$)/i,
  /~$/i
];

function normalizeDomain(domain) {
  return domain.replace(/\/+$/, '');
}

function toPosix(value) {
  return value.split(path.sep).join('/');
}

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function cleanText(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function isExcluded(relativePath) {
  const normalizedPath = toPosix(relativePath);
  const pathParts = normalizedPath.split('/');

  if (
    pathParts.some(
      (part) => EXCLUDED_NAMES.has(part) || part.startsWith('.')
    )
  ) {
    return true;
  }

  return EXCLUDED_PATTERNS.some((pattern) =>
    pattern.test(normalizedPath)
  );
}

function readHtmlMetadata(filePath, fallbackName) {
  let html = '';

  try {
    html = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.warn(
      `⚠️ 파일을 읽지 못해 기본 메타데이터를 사용합니다: ${filePath}`
    );
  }

  const titleMatch = html.match(
    /<title[^>]*>([\s\S]*?)<\/title>/i
  );

  const descriptionMatch =
    html.match(
      /<meta\s+[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["'][^>]*>/i
    ) ||
    html.match(
      /<meta\s+[^>]*content=["']([\s\S]*?)["'][^>]*name=["']description["'][^>]*>/i
    );

  const robotsMatches = [
    ...html.matchAll(
      /<meta\s+[^>]*name=["'](?:robots|googlebot)["'][^>]*content=["']([\s\S]*?)["'][^>]*>/gi
    ),
    ...html.matchAll(
      /<meta\s+[^>]*content=["']([\s\S]*?)["'][^>]*name=["'](?:robots|googlebot)["'][^>]*>/gi
    )
  ];

  const noindex = robotsMatches.some((match) =>
    String(match[1]).toLowerCase().includes('noindex')
  );

  const title =
    cleanText(titleMatch ? titleMatch[1] : '') ||
    `${fallbackName} - NodnWebTools`;

  const description =
    cleanText(descriptionMatch ? descriptionMatch[1] : '') ||
    `Free online ${fallbackName} tool from NodnWebTools.`;

  return {
    title,
    description,
    noindex
  };
}

function humanizeSlug(slug) {
  if (!slug) {
    return 'NodnWebTools Home';
  }

  return slug
    .split('/')
    .pop()
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function routeFromHtml(relativePath) {
  const normalizedPath = toPosix(relativePath);

  if (normalizedPath === 'index.html') {
    return '';
  }

  if (normalizedPath.endsWith('/index.html')) {
    return normalizedPath.slice(0, -'/index.html'.length);
  }

  return normalizedPath.replace(/\.html$/i, '');
}

function routeFromExtensionlessFile(relativePath) {
  return toPosix(relativePath).replace(/^\/+|\/+$/g, '');
}

function makeUrl(route) {
  const baseUrl = normalizeDomain(DOMAIN);

  if (!route) {
    return `${baseUrl}/`;
  }

  return `${baseUrl}/${route}`;
}

function getLastModifiedDate(filePath) {
  try {
    return fs
      .statSync(filePath)
      .mtime
      .toISOString()
      .split('T')[0];
  } catch (error) {
    return new Date().toISOString().split('T')[0];
  }
}

function getRssDate(filePath) {
  try {
    return fs.statSync(filePath).mtime.toUTCString();
  } catch (error) {
    return new Date().toUTCString();
  }
}

function collectPages(directory, relativeDirectory = '') {
  const pages = [];

  let entries = [];

  try {
    entries = fs.readdirSync(directory, {
      withFileTypes: true
    });
  } catch (error) {
    console.warn(
      `⚠️ 폴더를 읽지 못했습니다: ${directory}`
    );

    return pages;
  }

  for (const entry of entries) {
    const relativePath = path.join(
      relativeDirectory,
      entry.name
    );

    const fullPath = path.join(
      directory,
      entry.name
    );

    if (isExcluded(relativePath)) {
      continue;
    }

    if (entry.isDirectory()) {
      pages.push(
        ...collectPages(fullPath, relativePath)
      );

      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const lowerName = entry.name.toLowerCase();
    const isHtml = lowerName.endsWith('.html');
    const isExtensionless = !entry.name.includes('.');

    if (!isHtml && !isExtensionless) {
      continue;
    }

    const route = isHtml
      ? routeFromHtml(relativePath)
      : routeFromExtensionlessFile(relativePath);

    if (
      route === '' &&
      toPosix(relativePath) !== 'index.html'
    ) {
      continue;
    }

    const fallbackName = humanizeSlug(route);

    const metadata = isHtml
      ? readHtmlMetadata(fullPath, fallbackName)
      : {
          title: `${fallbackName} - NodnWebTools`,
          description:
            `Free online ${fallbackName} tool from NodnWebTools.`,
          noindex: false
        };

    if (metadata.noindex) {
      console.log(
        `⏭️ noindex 페이지 제외: ${toPosix(relativePath)}`
      );

      continue;
    }

    pages.push({
      route,
      url: makeUrl(route),
      filePath: fullPath,
      title: metadata.title,
      description: metadata.description,
      lastmod: getLastModifiedDate(fullPath)
    });
  }

  return pages;
}

function deduplicateAndSort(pages) {
  const uniquePages = new Map();

  for (const page of pages) {
    if (!uniquePages.has(page.url)) {
      uniquePages.set(page.url, page);
    } else {
      console.warn(
        `⚠️ 중복 URL 제외: ${page.url}`
      );
    }
  }

  return [...uniquePages.values()].sort(
    (firstPage, secondPage) => {
      if (firstPage.route === '') {
        return -1;
      }

      if (secondPage.route === '') {
        return 1;
      }

      return firstPage.route.localeCompare(
        secondPage.route
      );
    }
  );
}

function generateSitemap(pages) {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
  ];

  for (const page of pages) {
    lines.push('  <url>');
    lines.push(
      `    <loc>${xmlEscape(page.url)}</loc>`
    );
    lines.push(
      `    <lastmod>${page.lastmod}</lastmod>`
    );
    lines.push('  </url>');
  }

  lines.push('</urlset>');
  lines.push('');

  return lines.join('\n');
}

function generateRss(pages) {
  const currentDate = new Date().toUTCString();

  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    '    <title>NodnWebTools - Free Online Tools</title>',
    `    <link>${xmlEscape(makeUrl(''))}</link>`,
    '    <description>Free browser-based calculators, converters, document tools, and utilities.</description>',
    '    <language>en-us</language>',
    `    <lastBuildDate>${currentDate}</lastBuildDate>`,
    `    <atom:link href="${xmlEscape(
      makeUrl('rss.xml')
    )}" rel="self" type="application/rss+xml" />`
  ];

  for (const page of pages) {
    lines.push('    <item>');
    lines.push(
      `      <title>${xmlEscape(page.title)}</title>`
    );
    lines.push(
      `      <link>${xmlEscape(page.url)}</link>`
    );
    lines.push(
      `      <description>${xmlEscape(
        page.description
      )}</description>`
    );
    lines.push(
      `      <pubDate>${getRssDate(
        page.filePath
      )}</pubDate>`
    );
    lines.push(
      `      <guid isPermaLink="true">${xmlEscape(
        page.url
      )}</guid>`
    );
    lines.push('    </item>');
  }

  lines.push('  </channel>');
  lines.push('</rss>');
  lines.push('');

  return lines.join('\n');
}

function validatePages(pages) {
  const invalidPages = pages.filter((page) =>
    page.url.endsWith('.html')
  );

  if (invalidPages.length > 0) {
    console.warn(
      '⚠️ .html 주소가 발견되었습니다:'
    );

    for (const page of invalidPages) {
      console.warn(`   ${page.url}`);
    }
  }
}

function main() {
  try {
    const collectedPages = collectPages(ROOT_DIR);

    const pages = deduplicateAndSort(
      collectedPages
    );

    if (pages.length === 0) {
      throw new Error(
        '사이트맵에 포함할 공개 페이지를 찾지 못했습니다.'
      );
    }

    validatePages(pages);

    const sitemapPath = path.join(
      ROOT_DIR,
      'sitemap.xml'
    );

    const rssPath = path.join(
      ROOT_DIR,
      'rss.xml'
    );

    fs.writeFileSync(
      sitemapPath,
      generateSitemap(pages),
      'utf8'
    );

    fs.writeFileSync(
      rssPath,
      generateRss(pages),
      'utf8'
    );

    console.log('');
    console.log(
      `✅ 총 ${pages.length}개의 공개 페이지를 찾았습니다.`
    );
    console.log(
      '✅ sitemap.xml을 확장자 없는 URL로 생성했습니다.'
    );
    console.log(
      '✅ 하위 폴더의 index.html 페이지도 자동으로 포함했습니다.'
    );
    console.log(
      '✅ 404, 테스트, 백업, 복사본 및 noindex 페이지를 제외했습니다.'
    );
    console.log(
      '✅ 각 파일의 실제 수정 날짜를 lastmod에 사용했습니다.'
    );
    console.log(
      '✅ rss.xml도 함께 생성했습니다.'
    );
    console.log('');
    console.log(
      `📄 Sitemap: ${sitemapPath}`
    );
    console.log(
      `📄 RSS: ${rssPath}`
    );
  } catch (error) {
    console.error('');
    console.error(
      '❌ sitemap.xml 및 rss.xml 생성 실패'
    );
    console.error(
      error instanceof Error
        ? error.message
        : String(error)
    );

    process.exitCode = 1;
  }
}

main();