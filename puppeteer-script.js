const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

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

  console.log("\x1b[34mStarting Puppeteer...\x1b[0m"); // Blue text for startup info

  const browser = await puppeteer.launch({ headless: true });

  for (const targetUrl of targetUrls) {
    const page = await browser.newPage();

    // Enable DevTools Protocol
    const client = await page.target().createCDPSession();
    await client.send('Network.enable');

    client.on('Network.responseReceived', async (params) => {
      const url = params.response.url;
      if (url.endsWith('.m3u8') && !url.includes('/tracks-')) {
        const referer = targetUrl;
        const streamName = url.split('/').slice(-2, -1)[0];
        m3u8Links.add(JSON.stringify({ streamName, url, referer }));
        console.log("\x1b[32mFound .m3u8 URL:\x1b[0m", url); // Green text for found URL
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

  console.log("\x1b[34mAll network responses:\x1b[0m", Array.from(m3u8Links));

  // Convert the set to an array and parse the JSON strings
  const parsedLinks = Array.from(m3u8Links).map(JSON.parse);

  // Sort the links alphabetically by streamName
  parsedLinks.sort((a, b) => a.streamName.localeCompare(b.streamName));

  const finalLinks = [];

  // Analyze the content of each .m3u8 URL to find the best quality stream
  for (const entry of parsedLinks) {
    try {
      const response = await axios.get(entry.url, { headers: { 'Referer': entry.referer } });
      const lines = response.data.split('\n');

      // Find the URL for the 1080p stream
      let bestQualityUrl = entry.url;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('1080p')) {
          bestQualityUrl = new URL(lines[i + 1], entry.url).href; // Combine relative URL with base URL
          break;
        }
      }

      finalLinks.push({ ...entry, url: bestQualityUrl });
    } catch (error) {
      console.error("\x1b[31mError fetching .m3u8 content:\x1b[0m", error);
    }
  }

  // Clear the previous content of the playlist file
  fs.writeFileSync('playlist.m3u8', '#EXTM3U\n');

  // Save results to file for reference
  if (finalLinks.length) {
    console.log(`\x1b[32m✅ Total .m3u8 URLs found: ${finalLinks.length}\x1b[0m`);
    finalLinks.forEach(entry => {
      fs.appendFileSync('playlist.m3u8', `#EXTINF:-1,${entry.streamName}\n#EXTVLCOPT:http-referrer=${entry.referer}\n${entry.url}\n`);
    });
  } else {
    console.log("\x1b[33m⚠️ No .m3u8 URL found.\x1b[0m`);  // Yellow warning for no results
    fs.appendFileSync('playlist.m3u8', '#EXTINF:-1,No .m3u8 URL found.\nNo .m3u8 URL found.');
  }

  await browser.close();
})();
