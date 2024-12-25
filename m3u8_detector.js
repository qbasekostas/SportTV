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
        const responseUrl = response.url();
        const contentType = response.headers()['content-type'];
        console.log(`Network response URL: ${responseUrl}, Content-Type: ${contentType}`);
        if (responseUrl.endsWith('.m3u8')) {
            m3u8Url = responseUrl;
        }
    });

    try {
        await page.goto(url, { waitUntil: 'networkidle2' });

        // Wait for a while to ensure all network requests are complete
        await new Promise(resolve => setTimeout(resolve, 5000));

        if (!m3u8Url) {
            // Check for M3U8 URLs in the page content
            const pageContent = await page.content();
            const regex = /(http[s]?:\/\/[^\s]*\.m3u8)/g;
            const matches = pageContent.match(regex);
            if (matches && matches.length > 0) {
                m3u8Url = matches[0];
                console.log(`Found M3U8 URL in page content: ${m3u8Url}`);
            } else {
                console.log(`No M3U8 URL found in page content for ${url}`);
            }
        }

        if (m3u8Url) {
            const response = await page.goto(m3u8Url);
            const contentType = response.headers()['content-type'];

            if (!contentType || contentType !== 'application/vnd.apple.mpegurl' && contentType !== 'application/x-mpegURL') {
                if (!contentType && m3u8Url.endsWith('.m3u8')) {
                    console.log(`Assuming valid M3U8 for URL: ${m3u8Url} with undefined content type`);
                } else {
                    console.log(`Invalid content type for URL: ${m3u8Url}`);
                    await browser.close();
                    return null;
                }
            }

            const content = await response.text();
            await browser.close();
            return m3u8Url;
        }
    } catch (error) {
        console.error(`Error fetching URL ${url}:`, error);
    }

    await browser.close();
    return null;
}

async function detectM3U8() {
    const results = [];
    for (const url of urls) {
        console.log(`Fetching URL: ${url}`);
        const m3u8Url = await fetchM3U8(url);
        if (m3u8Url) {
            console.log(`M3U8 content found for URL: ${url}`);
            results.push(m3u8Url);
        } else {
            console.log(`No M3U8 content found for URL: ${url}`);
        }
    }
    return results;
}

async function saveAsM3UPlaylist(m3u8Urls) {
    const playlistContent = '#EXTM3U\n' + m3u8Urls.map(url => `#EXTINF:-1,${url}\n${url}`).join('\n');
    const outputPath = path.join(__dirname, 'playlist.m3u');
    fs.writeFileSync(outputPath, playlistContent);
    console.log(`M3U playlist written to ${outputPath}`);
}

async function main() {
    const m3u8Urls = await detectM3U8();
    await saveAsM3UPlaylist(m3u8Urls);
}

main().catch(error => {
    console.error('Error running detector:', error);
    process.exit(1);
});
