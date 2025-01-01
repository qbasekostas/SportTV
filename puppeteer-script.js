const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const targetUrls = [
"https://foothubhd.org/cdn3/linka.php",
"https://foothubhd.org/cdn3/linkb.php",
"https://foothubhd.org/cdn3/linkc.php",
"https://foothubhd.org/cdn3/linkd.php",
"https://foothubhd.org/cdn3/linke.php",
"https://foothubhd.org/cdn3/linkf.php",
"https://foothubhd.org/cdn3/linkg.php",
"https://foothubhd.org/cdn3/linkh.php",
"https://foothubhd.org/cast/1/eurosport1gr.php",
"https://foothubhd.org/cast/1/eurosport2gr.php"
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
      if (url.endsWith('.m3u8')) {
        m3u8Urls.push(url);
        console.log("\x1b[32mFound .m3u8 URL:\x1b[0m", url); // Green text for found URL
      }
    });

    try {
      console.log("\x1b[34mNavigating to page:\x1b[0m", targetUrl);
      await page.goto(targetUrl, { waitUntil: 'networkidle2' });

      // Replace waitForTimeout with a delay using setTimeout
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait for 10 seconds
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
    console.log("\x1b[33m⚠️ No .m3u8 URL found.\x1b[0m`);  // Yellow warning for no results
    fs.writeFileSync('puppeteer_output.txt', 'No .m3u8 URL found.');
  }

  await browser.close();
})();
