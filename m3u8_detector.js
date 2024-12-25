const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const m3u8 = require('m3u8');

const urls = [
    "https://foothubhd.org/cdn3/linka.php",
    "https://foothubhd.org/cdn3/linkb.php",
    "https://foothubhd.org/cdn3/linkc.php",
    "https://foothubhd.org/cdn3/linkd.php",
    "https://foothubhd.org/cdn3/linke.php",
    "https://foothubhd.org/cdn3/linkf.php",
    "https://foothubhd.org/cdn3/linkg.php",
    "https://foothubhd.org/cdn3/linkh.php"
];

async function fetchM3U8(url) {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    let m3u8Url = null;

    page.on('response', async (response) => {
        const url = response.url();
        if (url.endsWith('.m3u8')) {
            m3u8Url = url;
        }
    });

    try {
        await page.goto(url, { waitUntil: 'networkidle2' });

        // Wait for a while to ensure all network requests are complete
        await new Promise(resolve => setTimeout(resolve, 5000));

        if (m3u8Url) {
            const response = await page.goto(m3u8Url);
            const content = await response.text();
            await browser.close();
            return content;
        }
    } catch (error) {
        console.error(`Error fetching URL ${url}:`, error);
    }

    await browser.close();
    return null;
}

async function parseM3U8(content) {
    return new Promise((resolve, reject) => {
        const parser = m3u8.createStream();
        parser.write(content);
        parser.end();

        parser.on('m3u', function(m3u) {
            resolve(m3u);
        });

        parser.on('error', function(err) {
            reject(err);
        });
    });
}

async function detectM3U8() {
    const results = [];
    for (const url of urls) {
        console.log(`Fetching URL: ${url}`);
        const content = await fetchM3U8(url);
        if (content) {
            console.log(`M3U8 content found for URL: ${url}`);
            const manifest = await parseM3U8(content);
            results.push({
                url,
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
