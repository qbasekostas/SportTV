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

  const m3u8Links = new Set();

  console.log("\x1b[34mStarting Puppeteer...\x1b[0m");

  const browser = await puppeteer.launch({ headless: true });

  for (const targetUrl of targetUrls) {
    const page = await browser.newPage();

    // Enable DevTools Protocol
    const client = await page.target().createCDPSession();
    await client.send('Network.enable');

    client.on('Network.responseReceived', async (params) => {
      const url = params.response.url;
      console.log("\x1b[36mNetwork response received:\x1b[0m", url);
      if (url.endsWith('.m3u8') && url.includes('/tracks-v1a1')) {
        const referer = targetUrl;
        const streamName = url.split('/').slice(-2, -1)[0];
        m3u8Links.add(JSON.stringify({ streamName, url, referer }));
        console.log("\x1b[32mFound .m3u8 URL:\x1b[0m", url);
      }
    });

    try {
      console.log("\x1b[34mNavigating to page:\x1b[0m", targetUrl);
      await page.goto(targetUrl, { waitUntil: 'networkidle2' });

      // Increase wait time to ensure all network requests complete
      await new Promise(resolve => setTimeout(resolve, 120000)); // Wait for 120 seconds
    } catch (error) {
      console.error("\x1b[31mError navigating to page:\x1b[0m", error);
    }

    await page.close();
  }

  console.log("\x1b[34mAll network responses:\x1b[0m", Array.from(m3u8Links));

  // Convert the set to an array and parse the JSON strings
  const parsedLinks = Array.from(m3u8Links).map(JSON.parse);

  // Sort the links alphabetically by streamName
  parsedLinks.sort((a, b) => a.streamName.localeCompare(b.streamName));

  const finalLinks = parsedLinks;

  // Clear the previous content of the playlist file
  fs.writeFileSync('playlist.m3u8', '#EXTM3U\n');

  // Save results to file for reference
  if (finalLinks.length) {
    console.log(`\x1b[32m✅ Total .m3u8 URLs found: ${finalLinks.length}\x1b[0m`);
    finalLinks.forEach(entry => {
      fs.appendFileSync('playlist.m3u8', `#EXTINF:-1,${entry.streamName}\n#EXTVLCOPT:http-referrer=${entry.referer}\n${entry.url}\n`);
    });
  } else {
    console.log("\x1b[33m⚠️ No .m3u8 URL found.\x1b[0m");
    fs.appendFileSync('playlist.m3u8', '#EXTINF:-1,No .m3u8 URL found.\nNo .m3u8 URL found.\n');
  }

  await browser.close();
})();
