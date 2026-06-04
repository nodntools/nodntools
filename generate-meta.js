const fs = require('fs');
const path = require('path');

// ⚠️ 회원님의 실제 도메인 주소로 변경하세요.
const DOMAIN = 'https://nodntools.com'; 

// 사이트에 포함할 페이지 목록 (새 계산기가 추가되면 여기에 한 줄만 추가하면 끝!)
const pages = [
    { relPath: '', title: 'NodnWebTools Home Dashboard', desc: 'Access all free online calculators including mortgage, paycheck, and auto loan tools.' },
    { relPath: 'paycheckus', title: 'US Paycheck Calculator (2026 Tax Brackets)', desc: 'Estimate your monthly take-home pay after federal, state, and FICA taxes.' },
    { relPath: 'mortgage', title: 'Mortgage Calculator with Interest & Amortization', desc: 'Calculate your monthly home loan payments, interest rates, and loan terms easily.' },
    { relPath: 'autoloan', title: 'Auto Loan Calculator - Vehicle Budgeting Tool', desc: 'Estimate your monthly car payments, total interest costs, and overall vehicle budget.' }
];

const currentDate = new Date().toUTCString();

// 1. sitemap.xml 자동 생성
let sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
pages.forEach(page => {
    sitemapXml += `  <url>\n    <loc>${DOMAIN}/${page.relPath}</loc>\n    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n    <changefreq>${page.relPath === '' ? 'daily' : 'weekly'}</changefreq>\n    <priority>${page.relPath === '' ? '1.0' : '0.8'}</priority>\n  </url>\n`;
});
sitemapXml += `</urlset>`;

fs.writeFileSync(path.join(__dirname, 'sitemap.xml'), sitemapXml);
console.log('✅ sitemap.xml이 성공적으로 자동 생성되었습니다!');

// 2. rss.xml 자동 생성
let rssXml = `<?xml version="1.0" encoding="UTF-8" ?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n<channel>\n`;
rssXml += `    <title>NodnWebTools - Free Online Calculators</title>\n    <link>${DOMAIN}/</link>\n    <description>Fast, free, and accurate web utilities.</description>\n    <language>en-us</language>\n    <lastBuildDate>${currentDate}</lastBuildDate>\n    <atom:link href="${DOMAIN}/rss.xml" rel="self" type="application/rss+xml" />\n`;

pages.forEach(page => {
    rssXml += `    <item>\n        <title>${page.title}</title>\n        <link>${DOMAIN}/${page.relPath}</link>\n        <description>${page.desc}</description>\n        <pubDate>${currentDate}</pubDate>\n        <guid>${DOMAIN}/${page.relPath}</guid>\n    </item>\n`;
});
rssXml += `</channel>\n</rss>`;

fs.writeFileSync(path.join(__dirname, 'rss.xml'), rssXml);
console.log('✅ rss.xml이 성공적으로 자동 생성되었습니다!');