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
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.5',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
    });

    // Enable DevTools Protocol
    const client = await page.target().createCDPSession();
    await client.send('Network.enable');

    // Capture network responses
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
      await page.goto(targetUrl, { waitUntil: 'networkidle2' });

      // Wait for potential dynamic content
      await new Promise(r => setTimeout(r, 30000)); // 30 seconds
    } catch (error) {
      console.error("\x1b[31mError navigating to page:\x1b[0m", error);
    }

    // Check for .m3u8 links in the DOM
    const domLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href*=".m3u8"]')).map(link => link.href);
    });

    domLinks.forEach(link => {
      const referer = targetUrl;
      const streamName = link.split('/').slice(-2, -1)[0];
      m3u8Links.add(JSON.stringify({ streamName, url: link, referer }));
    });

    await page.close();
  }

  // Convert and sort the links
  const parsedLinks = Array.from(m3u8Links).map(JSON.parse);
  parsedLinks.sort((a, b) => a.streamName.localeCompare(b.streamName));

  // Save the playlist
  fs.writeFileSync('playlist.m3u8', '#EXTM3U\n');
  parsedLinks.forEach(entry => {
    fs.appendFileSync('playlist.m3u8', `#EXTINF:-1,${entry.streamName}\n#EXTVLCOPT:http-referrer=${entry.referer}\n${entry.url}\n`);
  });

  if (parsedLinks.length) {
    console.log(`\x1b[32m✅ Total .m3u8 URLs found: ${parsedLinks.length}\x1b[0m`);
  } else {
    console.log("\x1b[33m⚠️ No .m3u8 URL found.\x1b[0m`);
  }

  await browser.close();
})();
