const fs = require('fs');
const path = require('path');

// ⚠️ 회원님의 실제 도메인 주소로 변경하세요.
const DOMAIN = 'https://nodntools.com'; 

const currentDate = new Date().toUTCString();
const isoDate = new Date().toISOString().split('T')[0];

// 지도를 그릴 자동 탐색 명단 배열
const autoPages = [];

// [핵심 로직] 프로젝트 최상위 폴더를 자동으로 읽어 내려가는 스캐너
const files = fs.readdirSync(__dirname);

files.forEach(file => {
    const fullPath = path.join(__dirname, file);
    const stat = fs.statSync(fullPath);

    // 1. 제외할 파일/폴더 지정 (여기에 걸리는 애들은 사이트맵에서 제외)
    if (
        file.startsWith('.') || 
        file === 'node_modules' || 
        file === 'package.json' || 
        file === 'package-lock.json' || 
        file === 'generate-meta.js' || 
        file === 'sitemap.xml' || 
        file === 'rss.xml'
    ) {
        return; 
    }

    // 2. 메인 홈 화면 처리 (index.html)
    if (file === 'index.html') {
        autoPages.push({
            relPath: '',
            title: 'NodnWebTools Home Dashboard',
            desc: 'Access all free online calculators including mortgage, paycheck, and auto loan tools.'
        });
    } 
    // 3. 파일 형태 처리 (예: salestax.html 등 최상위 html 파일들)
    else if (stat.isFile() && file.endsWith('.html')) {
        // paycheckus나 mortgage처럼 확장자 없는 특수 파일 형태 또는 일반 html 대응
        const titleName = file.replace('.html', '').toUpperCase();
        autoPages.push({
            relPath: file,
            title: `${titleName} Calculator - NodnWebTools`,
            desc: `Free online ${titleName} utility tool for quick calculations.`
        });
    }
    // 4. 확장자 없는 특수 파일 처리 (예: paycheckus, mortgage 파일 자체)
    else if (stat.isFile() && !file.includes('.')) {
        const titleName = file.toUpperCase();
        autoPages.push({
            relPath: file,
            title: `${titleName} Calculator - NodnWebTools`,
            desc: `Free online ${titleName} utility tool for quick calculations.`
        });
    }
    // 5. 폴더 구조 처리 (예: autoloan 폴더 내부의 index.html)
    else if (stat.isDirectory()) {
        const indexPath = path.join(fullPath, 'index.html');
        if (fs.existsSync(indexPath)) {
            const titleName = file.toUpperCase();
            autoPages.push({
                relPath: file, // 주소창에 폴더 이름만 노출 (/autoloan)
                title: `${titleName} Calculator - NodnWebTools`,
                desc: `Free online ${titleName} utility tool for quick calculations.`
            });
        }
    }
});

// 1. sitemap.xml 생성 시작
let sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
autoPages.forEach(page => {
    sitemapXml += `  <url>\n    <loc>${DOMAIN}/${page.relPath}</loc>\n    <lastmod>${isoDate}</lastmod>\n    <changefreq>${page.relPath === '' ? 'daily' : 'weekly'}</changefreq>\n    <priority>${page.relPath === '' ? '1.0' : '0.8'}</priority>\n  </url>\n`;
});
sitemapXml += `</urlset>`;
fs.writeFileSync(path.join(__dirname, 'sitemap.xml'), sitemapXml);
console.log(`✅ [자동화] 총 ${autoPages.length}개의 페이지를 탐색하여 sitemap.xml 생성 완료!`);

// 2. rss.xml 생성 시작
let rssXml = `<?xml version="1.0" encoding="UTF-8" ?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n<channel>\n`;
rssXml += `    <title>NodnWebTools - Free Online Calculators</title>\n    <link>${DOMAIN}/</link>\n    <description>Fast, free, and accurate web utilities.</description>\n    <language>en-us</language>\n    <lastBuildDate>${currentDate}</lastBuildDate>\n    <atom:link href="${DOMAIN}/rss.xml" rel="self" type="application/rss+xml" />\n`;
autoPages.forEach(page => {
    rssXml += `    <item>\n        <title>${page.title}</title>\n        <link>${DOMAIN}/${page.relPath}</link>\n        <description>${page.desc}</description>\n        <pubDate>${currentDate}</pubDate>\n        <guid>${DOMAIN}/${page.relPath}</guid>\n    </item>\n`;
});
rssXml += `</channel>\n</rss>`;
fs.writeFileSync(path.join(__dirname, 'rss.xml'), rssXml);
console.log(`✅ [자동화] 총 ${autoPages.length}개의 항목을 바탕으로 rss.xml 생성 완료!`);