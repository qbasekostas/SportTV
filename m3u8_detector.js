const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const m3u8Parser = require('m3u8-parser');

const urls = [
    "https://s2watch.link/player.php?id=chftknovasportprime",
    "https://s2watch.link/player.php?id=chftknovasport1",
    "https://s2watch.link/player.php?id=chftknovasport2",
    "https://s2watch.link/player.php?id=chftknovasport3",
    "https://s2watch.link/player.php?id=chftknovasport4",
    "https://s2watch.link/player.php?id=chftknovasport5",
    "https://s2watch.link/player.php?id=chftkcosmote1",
    "https://s2watch.link/player.php?id=chftkcosmote2",
    "https://s2watch.link/player.php?id=chftkcosmote3",
    "https://s2watch.link/player.php?id=chftkcosmote4",
    "https://s2watch.link/player.php?id=chftkcosmote5",
    "https://s2watch.link/player.php?id=chftkcosmote6",
    "https://s2watch.link/player.php?id=chftkcosmote7",
    "https://s2watch.link/player.php?id=chftkcosmote8",
    "https://s2watch.link/player.php?id=chftkcosmote9"
];

async function fetchM3U8(url) {
    try {
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle2' });

        const m3u8Url = await page.evaluate(() => {
            let src = null;
            document.querySelectorAll('source').forEach(source => {
                if (source.src.endsWith('.m3u8')) {
                    src = source.src;
                }
            });
            return src;
        });

        await browser.close();

        if (m3u8Url) {
            const response = await axios.get(m3u8Url);
            return response.data;
        }
    } catch (error) {
        console.error(`Error fetching URL ${url}:`, error);
    }
    return null;
}

function parseM3U8(content) {
    const parser = new m3u8Parser.Parser();
    parser.push(content);
    parser.end();
    return parser.manifest;
}

async function detectM3U8() {
    const results = [];
    for (const url of urls) {
        const content = await fetchM3U8(url);
        if (content) {
            const manifest = parseM3U8(content);
            const duration = manifest.segments ? manifest.segments.reduce((acc, seg) => acc + seg.duration, 0) : 0;
            results.push({
                url,
                duration,
                manifest
            });
        } else {
            console.log(`No M3U8 content found for URL: ${url}`);
        }
    }
    return results;
}

async function main() {
    const results = await detectM3U8();
    const outputPath = path.join(__dirname, 'm3u8_results.json');
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`Results written to ${outputPath}`);
}

main().catch(error => {
    console.error('Error running detector:', error);
    process.exit(1);
});
