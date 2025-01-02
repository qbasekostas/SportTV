const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

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

  const m3u8Urls = [];

  console.log("\x1b[34mStarting Puppeteer...\x1b[0m"); // Blue text for startup info

  const browser = await puppeteer.launch({ headless: true });

  for (const targetUrl of targetUrls) {
    const page = await browser.newPage();

    // Enable DevTools Protocol
    const client = await page.target().createCDPSession();
    await client.send('Network.enable');

    client.on('Network.responseReceived', async (params) => {
      const url = params.response.url;
      const status = params.response.status;
      const contentType = params.response.headers['content-type'];
      console.log(`\x1b[34mNetwork response: URL: ${url}, Status: ${status}, Content-Type: ${contentType}\x1b[0m`); // Log all network responses with status and content type
      if (url.endsWith('.m3u8') && !path.basename(url).startsWith('tracks-')) {
        m3u8Urls.push({ url, referer: targetUrl });
        console.log("\x1b[32mFound .m3u8 URL:\x1b[0m", url); // Green text for found URL
        console.log("\x1b[32mCurrent m3u8Urls array:\x1b[0m", m3u8Urls); // Log the current state of the m3u8Urls array
      }
    });

    try {
      console.log("\x1b[34mNavigating to page:\x1b[0m", targetUrl);
      await page.goto(targetUrl, { waitUntil: 'networkidle2' });

      // Increase the wait time to ensure all network requests complete
      await new Promise(resolve => setTimeout(resolve, 40000)); // Wait for 40 seconds
    } catch (error) {
      console.error("\x1b[31mError navigating to page:\x1b[0m", error);  // Red text for errors
    }

    await page.close();
  }

  console.log("\x1b[34mAll network responses:\x1b[0m", m3u8Urls);

  // Sort URLs alphabetically
  m3u8Urls.sort((a, b) => a.url.localeCompare(b.url));

  // Clear the previous content of the playlist file
  fs.writeFileSync('playlist.m3u8', '#EXTM3U\n');

  // Save results to file for reference
  if (m3u8Urls.length) {
    console.log(`\x1b[32m✅ Total .m3u8 URLs found: ${m3u8Urls.length}\x1b[0m`);
    m3u8Urls.forEach(entry => {
      const name = path.basename(entry.url);
      fs.appendFileSync('playlist.m3u8', `#EXTVLCOPT:http-referrer=${entry.referer}\n${entry.url}\n`);
    });
  } else {
    console.log("\x1b[33m⚠️ No .m3u8 URL found.\x1b[0m");  // Yellow warning for no results
    fs.appendFileSync('playlist.m3u8', '#EXTINF:-1,No .m3u8 URL found.\nNo .m3u8 URL found.');
  }

  await browser.close();
})();
