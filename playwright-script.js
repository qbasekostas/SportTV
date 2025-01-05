const { chromium } = require('playwright');
const fs = require('fs');
const { getRandomUserAgent } = require('./useragent_generator');

(async () => {
    const targetUrls = [
        'https://foothubhd.org/cdn3/linka.php',
        'https://foothubhd.org/cdn3/linkb.php',
        'https://foothubhd.org/cdn3/linkc.php',
        'https://foothubhd.org/cdn3/linkd.php',
        'https://foothubhd.org/cdn3/linke.php',
        'https://foothubhd.org/cdn3/linkf.php',
        'https://foothubhd.org/cdn3/linkg.php',
        'https://foothubhd.org/cdn3/linkh.php'
    ];

    const m3u8Links = new Set();
    let browser;
     const delay = ms => new Promise(res => setTimeout(res, ms));


    try {
        console.log("\x1b[34mStarting Playwright...\x1b[0m");
        browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });

        for (const targetUrl of targetUrls) {
            const page = await browser.newPage();

           //Random User Agent Header
           const randomUserAgent = getRandomUserAgent();

            await page.setExtraHTTPHeaders({
                'User-Agent': randomUserAgent,
                'Referer': 'https://foothubhd.org/',
                'Origin': 'https://foothubhd.org',
                'Accept': '*/*',
                'Accept-Language': 'el-GR,el;q=0.8,en-US;q=0.5,en;q=0.3',
                'Connection': 'keep-alive',
            });



            try {
                console.log("\x1b[34mFetching page content:\x1b[0m", targetUrl);
               const response = await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
               const content = await response.text();


                // Extract the source from the javascript code
                const sourceMatch = content.match(/source:\s*window\.atob\('(.*?)'\)/);
                if (sourceMatch && sourceMatch[1]) {
                    const decodedM3U8 = Buffer.from(sourceMatch[1], 'base64').toString('utf-8');
                     const streamName = new URL(decodedM3U8).pathname.split('/').slice(-2, -1)[0];
                     m3u8Links.add({ streamName, url: decodedM3U8, referer:  'https://foothubhd.org/' });
                     console.log(`\x1b[32mFound .m3u8 URL:\x1b[0m ${decodedM3U8}`);
                } else {
                    console.log("\x1b[33m⚠️ .m3u8 URL not found in content.\x1b[0m", targetUrl);
                     await page.screenshot({ path: `error_screenshot_${Date.now()}.png` });
                 }
              await delay(5000); // Add delay between page loads.
            } catch (navigationError) {
                console.error("\x1b[31mError processing page:\x1b[0m", navigationError, targetUrl);
            } finally {
                await page.close();
            }
        }

        // Ταξινόμηση και αποθήκευση των URLs
        const parsedLinks = Array.from(m3u8Links).sort((a, b) => a.streamName.localeCompare(b.streamName));
        let playlistContent = "#EXTM3U\n";
        parsedLinks.forEach(entry => {
            playlistContent += `#EXTINF:-1,${entry.streamName}\n#EXTVLCOPT:http-referrer=${entry.referer}\n${entry.url}\n`;
        });
        fs.writeFileSync('playlist.m3u8', playlistContent);

        if (parsedLinks.length) {
            console.log(`\x1b[32m✅ Total .m3u8 URLs found: ${parsedLinks.length}\x1b[0m`);
        } else {
            console.log("\x1b[33m⚠️ No .m3u8 URL found.\x1b[0m");
        }

    } catch (error) {
        console.error("\x1b[31mAn unexpected error occurred:\x1b[0m", error);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
})();
