const { chromium } = require('playwright');
const fs = require('fs');

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

    try {
        console.log("\x1b[34mStarting Playwright...\x1b[0m");
        browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });

        for (const targetUrl of targetUrls) {
            const page = await browser.newPage();

            // Προσαρμοσμένες κεφαλίδες
            await page.setExtraHTTPHeaders({
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://foothubhd.org/',
                'Origin': 'https://foothubhd.org',
                'Accept': '*/*',
                'Accept-Language': 'el-GR,el;q=0.8,en-US;q=0.5,en;q=0.3',
                'Connection': 'keep-alive',
            });

            // Επεξεργασία απαντήσεων δικτύου
            page.on('response', async (response) => {
                const url = response.url();
                if (url.endsWith('.m3u8')) {
                     if (!response.ok()) {
                         console.log('\x1b[31m Failed Response:\x1b[0m', response.status(), url);
                         return;
                     }
                    const referer = response.request().headers()['referer'] || 'N/A';
                    const streamName = new URL(url).pathname.split('/').slice(-2, -1)[0];
                    m3u8Links.add({ streamName, url, referer });
                    console.log(`\x1b[32mFound .m3u8 URL:\x1b[0m ${url}`);
                }
            });


            try {
                console.log("\x1b[34mNavigating to page:\x1b[0m", targetUrl);
                await page.goto(targetUrl, { waitUntil: 'networkidle' });


                 // Wait for the player to load
                 const videoSelector = '#jwplayer_0 > div > div.jw-media.jw-reset > video';
                 console.log('\x1b[35m Waiting for Player Element:', videoSelector,'\x1b[0m');
                 try{
                   await page.waitForSelector(videoSelector,{timeout: 10000});
                   console.log("\x1b[32mPlayer loaded.\x1b[0m", targetUrl)
                 }
                 catch(waitError){
                   console.log("\x1b[33mTimeout waiting for player:\x1b[0m", targetUrl);
                   await page.screenshot({ path: `error_screenshot_${Date.now()}.png` });
                   continue; // Skip the page and continue with the next.
                 }


                 // Attempt to play the video (simulate a click on the play button - this sometimes triggers the m3u8)
                 const playButtonSelector = '#jwplayer_0 > div > div.jw-controls.jw-reset > div.jw-button-container.jw-reset > div.jw-icon.jw-icon-display.jw-button-color.jw-reset'

                 console.log('\x1b[35m Waiting for Play Button:', playButtonSelector,'\x1b[0m');

                 try {
                    await page.click(playButtonSelector,{timeout: 10000});
                    console.log("\x1b[32mClicked Play button\x1b[0m");
                   } catch (clickError){
                     console.log("\x1b[33mCould not click Play button or not present:\x1b[0m", targetUrl);
                       await page.screenshot({ path: `error_screenshot_${Date.now()}.png` });
                   }


                await page.waitForTimeout(10000); // Keep this to allow time for the m3u8 request


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
