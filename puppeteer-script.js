const puppeteer = require('puppeteer');
const fs = require('fs');
const { execSync } = require('child_process');

(async () => {
  const targetUrls = [
    "https://foothubhd.org/cdn3/linka.php",
    "https://foothubhd.org/cdn3/linkb.php",
    "https://foothubhd.org/cdn3/linkc.php",
    "https://foothubhd.org/cdn3/linkd.php",
    "https://foothubhd.org/cdn3/linke.php",
    "https://foothubhd.org/cdn3/linkf.php",
    "https://foothubhd.org/cdn3/linkg.php",
    "https://foothubhd.org/cdn3/linkh.php"
  ];

  const m3u8Urls = [];

  console.log("\x1b[34mStarting Puppeteer...\x1b[0m"); // Blue text for startup info

  const browser = await puppeteer.launch({ headless: true });

  for (const targetUrl of targetUrls) {
    const page = await browser.newPage();

    // Enable request interception
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      if (request.resourceType() === 'preflight') {
        request.abort();
      } else {
        request.continue();
      }
    });

    // Log network responses
    page.on('response', async (response) => {
      const url = response.url();
      const headers = response.headers();
      try {
        const responseBody = await response.text();
        console.log("\x1b[34mNetwork response URL:\x1b[0m", url); // Log all network responses
        console.log("\x1b[34mResponse Headers:\x1b[0m", headers); // Log headers
        if (url.endsWith('.m3u8') && headers['content-type'] === 'application/vnd.apple.mpegurl') {
          m3u8Urls.push(url);
          console.log("\x1b[32mFound .m3u8 URL:\x1b[0m", url); // Green text for found URL
          console.log("\x1b[32mCurrent m3u8Urls array:\x1b[0m", m3u8Urls); // Log the current state of the m3u8Urls array
        }
      } catch (error) {
        console.error("\x1b[31mError loading response body:\x1b[0m", error);
      }
    });

    try {
      console.log("\x1b[34mNavigating to page:\x1b[0m", targetUrl);
      await page.goto(targetUrl, { waitUntil: 'networkidle2' });

      // Increase the wait time to ensure all network requests complete
      await new Promise(resolve => setTimeout(resolve, 30000)); // Wait for 30 seconds
    } catch (error) {
      console.error("\x1b[31mError navigating to page:\x1b[0m", error);  // Red text for errors
    }

    await page.close();
  }

  console.log("\x1b[34mAll network responses:\x1b[0m", m3u8Urls);

  // Create or update playlist.m3u8 file
  const playlistFile = 'playlist.m3u8';
  if (fs.existsSync(playlistFile)) {
    fs.unlinkSync(playlistFile);
    console.log("Deleted old playlist.m3u8 file.");
  }

  if (m3u8Urls.length) {
    fs.writeFileSync(playlistFile, "#EXTM3U\n" + m3u8Urls.map(url => `#EXTINF:-1,${url}\n${url}`).join('\n'));
    console.log(`\x1b[32m\u2705 Total .m3u8 URLs found: ${m3u8Urls.length}\x1b[0m`);
  } else {
    fs.writeFileSync(playlistFile, 'No .m3u8 URL found.');
    console.log("\x1b[33m\u26a0\ufe0f No .m3u8 URL found.\x1b[0m");
  }

  await browser.close();

  // Git operations
  try {
    console.log("\x1b[34mConfiguring git...\x1b[0m");
    execSync('git config --global user.email "qbasekostas@yahoo.com"');
    execSync('git config --global user.name "qbasekostas"');

    console.log("\x1b[34mAdding changes to git...\x1b[0m");
    execSync('git add playlist.m3u8');

    console.log("\x1b[34mCommitting changes...\x1b[0m");
    execSync('git commit -m "Update playlist.m3u8 with new entries"');

    console.log("\x1b[34mPulling latest changes...\x1b[0m");
    execSync('git pull --rebase');

    console.log("\x1b[34mPushing changes to repository...\x1b[0m");
    execSync('git push https://GITHUB_TOKEN@github.com/qbasekostas/SportTV.git');
  } catch (error) {
    console.error("\x1b[31mError during git operations:\x1b[0m", error);
  }
})();
