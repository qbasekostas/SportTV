const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const { execSync } = require('child_process');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = 'qbasekostas';
const REPO_NAME = 'SportTV';
const FILE_PATH = 'playlist.m3u';

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
    const outputPath = path.join(__dirname, FILE_PATH);
    fs.writeFileSync(outputPath, playlistContent);
    console.log(`M3U playlist written to ${outputPath}`);
}

async function commitAndPushChanges() {
    // Configure Git
    execSync('git config --global user.email "your-email@example.com"');
    execSync('git config --global user.name "your-username"');

    // Update the remote URL if it already exists
    execSync(`git remote set-url origin https://qbasekostas:${GITHUB_TOKEN}@github.com/${REPO_OWNER}/${REPO_NAME}.git`);

    execSync('git add .');
    execSync('git commit -m "Add M3U playlist"');
    execSync('git push -u origin main --force');
}

async function main() {
    const m3u8Urls = await detectM3U8();
    await saveAsM3UPlaylist(m3u8Urls);
    await commitAndPushChanges();
}

main().catch(error => {
    console.error('Error running detector:', error);
    process.exit(1);
});
