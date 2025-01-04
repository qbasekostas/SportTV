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

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0');
    await page.setExtraHTTPHeaders({
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.5',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
    });

    const client = await page.target().createCDPSession();
    await client.send('Network.enable');

    client.on('Network.responseReceived', async (params) => {
      const url = params.response.url;
      if (url.includes('.m3u8')) {
        const referer = targetUrl;
        const streamName = url.split('/').slice(-2, -1)[0];
        m3u8Links.add(JSON.stringify({ streamName, url, referer }));
        console.log("\x1b[32mFound .m3u8 URL:\x1b[0m", url);
      }
    });

    try {
      console.log("\x1b[34mNavigating to page:\x1b[0m", targetUrl);
      await page.goto(targetUrl, { waitUntil: 'networkidle2' });
      await new Promise(resolve => setTimeout(resolve, 30000)); // Wait for 30 seconds
    } catch (error) {
      console.error("\x1b[31mError navigating to page:\x1b[0m", error);
    }

    await page.close();
  }

  console.log("\x1b[34mAll network responses:\x1b[0m", Array.from(m3u8Links));

  const parsedLinks = Array.from(m3u8Links).map(JSON.parse);
  parsedLinks.sort((a, b) => a.streamName.localeCompare(b.streamName));

  fs.writeFileSync('playlist.m3u8', '#EXTM3U\n');
  if (parsedLinks.length) {
    console.log(`\x1b[32m✅ Total .m3u8 URLs found: ${parsedLinks.length}\x1b[0m`);
    parsedLinks.forEach(entry => {
      fs.appendFileSync('playlist.m3u8', `#EXTINF:-1,${entry.streamName}\n#EXTVLCOPT:http-referrer=${entry.referer}\n${entry.url}\n`);
    });
  } else {
    console.log("\x1b[33m⚠️ No .m3u8 URL found.\x1b[0m");
  }

  await browser.close();
})();
