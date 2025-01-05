const { chromium, firefox } = require('playwright');
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
     const CLAPPR_TIMEOUT = 20000;

    try {
         console.log("\x1b[34mStarting Playwright with Firefox...\x1b[0m");
        browser = await firefox.launch({ headless: true, args: ['--no-sandbox'] });

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

            page.on('response', async (response) => {
           const url = response.url();
         if (url.includes('tracks-v1a1') && url.endsWith('.m3u8')) {
          const referer = response.request().headers()['referer'] || 'https://foothubhd.org/';
          const streamName = `channel${index + 1}`;
          m3u8Links.add({ streamName, url, referer });
          console.log(`\x1b[32mFound .m3u8 URL:\x1b[0m`, url);
          }
          });

            try {
               console.log("\x1b[34mFetching page content:\x1b[0m", targetUrl);
                 const start = Date.now();
              const response = await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 5000});
                 console.log("\x1b[33m Page loaded with status:\x1b[0m", response.status(), targetUrl, ` in ${Date.now() - start}ms`);

                  // Initialize the console-ban script with some specific options to prevent redirection
                  await page.evaluate(() => {
                    if(window.ConsoleBan && window.ConsoleBan.init){
                       window.ConsoleBan.init({
                         redirect: null,
                           clear:false,
                           debug:false,
                          callback:null,
                          write:null
                     })
                     }
                 });
                console.log("\x1b[32m Console-ban script initialized. \x1b[0m");


                  //Wait for the player's container div
                 try {
                   const playerSelector = '#player > div[data-player]';
                     console.log('\x1b[35m Waiting for Clappr container:', playerSelector,'\x1b[0m');
                     await page.waitForSelector(playerSelector, { timeout: CLAPPR_TIMEOUT });
                       console.log("\x1b[32m Clappr container found.\x1b[0m");
                    } catch (error) {
                      console.log("\x1b[33mTimeout waiting for Clappr container.\x1b[0m",targetUrl);
                      await page.screenshot({ path: `error_screenshot_${Date.now()}.png` });
                      continue;
                  }


                   let decodedM3U8;
                    try{
                      decodedM3U8 = await page.evaluate(() => {
                            try {
                                  if(window.player && window.player.options && window.player.options.source){
                                     return window.player.options.source;
                                  }
                                   return Promise.reject('Could not get the M3U8 URL from player.options.source');
                              } catch (e) {
                                   return  Promise.reject(e);
                             }
                       });
                       console.log(`\x1b[32mFound .m3u8 URL by Clappr source property:\x1b[0m`);
                   } catch (scriptError){
                     console.log("\x1b[33mCould not get the M3U8 url from Clappr source:\x1b[0m",scriptError, targetUrl);
                    await page.screenshot({ path: `error_screenshot_${Date.now()}.png` });
                       continue;
                    }
                     const streamName = new URL(decodedM3U8).pathname.split('/').slice(-2, -1)[0];
                     m3u8Links.add({ streamName, url: decodedM3U8, referer:  'https://foothubhd.org/' });

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
