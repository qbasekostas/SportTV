const puppeteer = require('puppeteer');
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
    console.log("\x1b[34mStarting Puppeteer...\x1b[0m");
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });

    for (const targetUrl of targetUrls) {
      const page = await browser.newPage();

      await page.setExtraHTTPHeaders({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
        'Referer': 'https://foothubhd.org/',
        'Origin': 'https://foothubhd.org',
        'Accept': '*/*',
        'Accept-Language': 'el-GR,el;q=0.8,en-US;q=0.5,en;q=0.3',
        'Connection': 'keep-alive',
      });

      const client = await page.target().createCDPSession();
      await client.send('Network.enable');

      client.on('Network.responseReceived', async (params) => {
          try {
             const url = params.response.url;
              if (url.endsWith('.m3u8')) {
                  const referer = targetUrl;
                  const streamName = new URL(url).pathname.split('/').slice(-2, -1)[0];
                  m3u8Links.add({ streamName, url, referer });
                  console.log("\x1b[32mFound .m3u8 URL:\x1b[0m", url);
              }
          } catch (error) {
              console.error("\x1b[31mError processing response:\x1b[0m", error, params);
          }
      });

      try {
        console.log("\x1b[34mNavigating to page:\x1b[0m", targetUrl);
        await page.goto(targetUrl, { waitUntil: 'load' });
          await page.waitFor(20000)
        // await page.waitForSelector('body', {timeout: 30000})

        await page.screenshot({ path: `screenshot-${targetUrl.split('/').pop()}.png` });
      } catch (error) {
        console.error("\x1b[31mError navigating to page:\x1b[0m", error, targetUrl);
      } finally {
          try {
              await page.close();
          } catch (closeError) {
              console.error("\x1b[31mError closing page:\x1b[0m", closeError, targetUrl);
          }
      }
    }

    const parsedLinks = Array.from(m3u8Links);
      parsedLinks.sort((a, b) => a.streamName.localeCompare(b.streamName));
      
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
      try {
        await browser.close();
      } catch (browserCloseError) {
          console.error("\x1b[31mError closing browser:\x1b[0m", browserCloseError);
      }
    }
  }
})();
