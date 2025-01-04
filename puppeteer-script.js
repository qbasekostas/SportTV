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

  console.log("\x1b[34mStarting Puppeteer...\x1b[0m");

  const browser = await puppeteer.launch({ headless: true });

  for (const targetUrl of targetUrls) {
    const page = await browser.newPage();

    // Set custom headers
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
    });

    // Enable network interception
    const client = await page.target().createCDPSession();
    await client.send('Network.enable');

    client.on('Network.responseReceived', async (params) => {
      const url = params.response.url;
      if (url.endsWith('.m3u8')) {
        const referer = targetUrl;
        const streamName = url.split('/').slice(-2, -1)[0];
        m3u8Links.add(JSON.stringify({ streamName, url, referer }));
        console.log("\x1b[32mFound .m3u8 URL:\x1b[0m", url);
      }
    });

    try {
      console.log("\x1b[34mNavigating to page:\x1b[0m", targetUrl);
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });

      // Wait for potential async requests
      await page.waitForTimeout(10000); // 10 seconds
    } catch (error) {
      console.error("\x1b[31mError navigating to page:\x1b[0m", error);
    }

    await page.close();
  }

  const parsedLinks = Array.from(m3u8Links).map(JSON.parse);
  parsedLinks.sort((a, b) => a.streamName.localeCompare(b.streamName));

  fs.writeFileSync('playlist.m3u8', '#EXTM3U\n');
  parsedLinks.forEach(entry => {
    fs.appendFileSync('playlist.m3u8', `#EXTINF:-1,${entry.streamName}\n#EXTVLCOPT:http-referrer=${entry.referer}\n${entry.url}\n`);
  });

  if (parsedLinks.length) {
    console.log(`\x1b[32m✅ Total .m3u8 URLs found: ${parsedLinks.length}\x1b[0m`);
  } else {
    console.log("\x1b[33m⚠️ No .m3u8 URL found.\x1b[0m");
  }

  await browser.close();
})();
