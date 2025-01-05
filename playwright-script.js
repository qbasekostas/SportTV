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

            //Try a different user agent
              const randomUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
              await page.setExtraHTTPHeaders({
               'User-Agent': randomUserAgent,
                'Referer': 'https://foothubhd.org/',
               'Origin': 'https://foothubhd.org',
               'Accept': '*/*',
              'Accept-Language': 'el-GR,el;q=0.8,en-US;q=0.5,en;q=0.3',
                'Connection': 'keep-alive',
            });


             page.on('pageerror', (err) => {
                 console.log("\x1b[31m Javascript error:\x1b[0m", err.message, err.stack, targetUrl)
              });

            try {
               console.log("\x1b[34mFetching page content:\x1b[0m", targetUrl);
               const start = Date.now();
              const response = await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 5000, javaScriptEnabled:false });
              console.log("\x1b[33m Page loaded with status:\x1b[0m", response.status(), targetUrl, ` in ${Date.now() - start}ms`);
                 const pageContent = await page.content();

                    const genericMatch = pageContent.match(/https:\/\/.*\.m3u8/);
                    if (genericMatch && genericMatch[0]) {
                       const decodedM3U8=genericMatch[0];
                         const streamName = new URL(decodedM3U8).pathname.split('/').slice(-2, -1)[0];
                         m3u8Links.add({ streamName, url: decodedM3U8, referer:  'https://foothubhd.org/' });
                         console.log(`\x1b[32mFound .m3u8 URL by generic regex:\x1b[0m`,decodedM3U8);
                     } else {
                       console.log("\x1b[33m⚠️ Could not get the M3U8 url by generic regex.\x1b[0m",targetUrl);
                        await page.screenshot({ path: `error_screenshot_${Date.now()}.png` });
                      }
                   await delay(5000); // Add delay between page loads.
            } catch (navigationError) {
               console.error("\x1b[31mError processing page:\x1b[0m", navigationError, targetUrl);
               await page.screenshot({ path: `error_screenshot_${Date.now()}.png` });
           } finally {
                await page.close();
            }
       }

        // Taξιvόμηση και αποθήκευση των URLs
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
