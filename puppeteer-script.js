const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const targetUrls = [
    "https://foothubhd.org/greekchannels/mega.html",
    "https://foothubhd.org/greekchannels/ant1.html",
    "https://foothubhd.org/greekchannels/alphatv.html"
  ];

  const m3u8Urls = [];

  console.log("\x1b[34mStarting Puppeteer...\x1b[0m"); // Blue text for startup info

  const browser = await puppeteer.launch({ headless: true });

  for (const targetUrl of targetUrls) {
    const page = await browser.newPage();

    // Enable request interception
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      request.continue();
    });

    // Log network responses
    page.on('response', async (response) => {
      const url = response.url();
      console.log("\x1b[34mNetwork response URL:\x1b[0m", url); // Log all network responses
      if (url.endsWith('.m3u8')) {
        m3u8Urls.push(url);
        console.log("\x1b[32mFound .m3u8 URL:\x1b[0m", url); // Green text for found URL
        console.log("\x1b[32mCurrent m3u8Urls array:\x1b[0m", m3u8Urls); // Log the current state of the m3u8Urls array
      }
    });

    try {
      console.log("\x1b[34mNavigating to page:\x1b[0m", targetUrl);
      await page.goto(targetUrl, { waitUntil: 'networkidle2' });

      // Increase the wait time to ensure all network requests complete
      await new Promise(resolve => setTimeout(resolve, 20000)); // Wait for 20 seconds
    } catch (error) {
      console.error("\x1b[31mError navigating to page:\x1b[0m", error);  // Red text for errors
    }

    await page.close();
  }

  console.log("\x1b[34mAll network responses:\x1b[0m", m3u8Urls);

  // Save results to file for reference
  if (m3u8Urls.length) {
    console.log(`\x1b[32m✅ Total .m3u8 URLs found: ${m3u8Urls.length}\x1b[0m`);
    fs.writeFileSync('puppeteer_output.txt', m3u8Urls.join('\n'));
  } else {
    console.log("\x1b[33m⚠️ No .m3u8 URL found.\x1b[0m");  // Yellow warning for no results
    fs.writeFileSync('puppeteer_output.txt', 'No .m3u8 URL found.');
  }

  await browser.close();
})();
