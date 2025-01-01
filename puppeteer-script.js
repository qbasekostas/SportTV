const puppeteer = require('puppeteer');
const fs = require('fs');
const { execSync } = require('child_process');

(async () => {
  const targetUrls = [
    "https://foothubhd.org/cdn3/linka.php",
    "https://foothubhd.org/cdn3/linkb.php",
    "https://foothubhd.org/greekchannels/mega.html"
  ];

  const m3u8Urls = [];

  console.log("Starting Puppeteer...");

  const browser = await puppeteer.launch({ headless: true });

  for (const targetUrl of targetUrls) {
    const page = await browser.newPage();

    // Enable request interception
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      console.log("Request made:", request.url());
      request.continue();
    });

    // Log network responses and capture m3u8 URLs
    page.on('response', async (response) => {
      const url = response.url();
      const headers = response.headers();
      console.log("Network response URL:", url);
      console.log("Response Headers:", headers);
      if (url.endsWith('.m3u8') && headers['content-type'] === 'application/vnd.apple.mpegurl') {
        m3u8Urls.push(url);
        console.log("Found .m3u8 URL:", url);
      }
    });

    try {
      console.log("Navigating to page:", targetUrl);
      await page.goto(targetUrl, { waitUntil: 'networkidle2' });

      // Increase the wait time to ensure all network requests complete
      await new Promise(resolve => setTimeout(resolve, 30000)); // Wait for 30 seconds
    } catch (error) {
      console.error("Error navigating to page:", error);
    }

    await page.close();
  }

  console.log("All network responses:", m3u8Urls);

  // Create or update playlist.m3u8 file
  const playlistFile = 'playlist.m3u8';
  if (fs.existsSync(playlistFile)) {
    fs.unlinkSync(playlistFile);
    console.log("Deleted old playlist.m3u8 file.");
  }

  if (m3u8Urls.length) {
    fs.writeFileSync(playlistFile, "#EXTM3U\n" + m3u8Urls.map(url => `#EXTINF:-1,${url}\n${url}`).join('\n'));
    console.log(`Total .m3u8 URLs found: ${m3u8Urls.length}`);

    // Git operations
    try {
      console.log("Configuring git...");
      execSync('git config --global user.email "qbasekostas@yahoo.com"');
      execSync('git config --global user.name "qbasekostas"');

      console.log("Adding changes to git...");
      execSync('git add playlist.m3u8');

      console.log("Committing changes...");
      execSync('git commit -m "Update playlist.m3u8 with new entries"');

      console.log("Pulling latest changes...");
      execSync('git pull --rebase');

      console.log("Pushing changes to repository...");
      execSync('git push https://GITHUB_TOKEN@github.com/qbasekostas/SportTV.git');
    } catch (error) {
      console.error("Error during git operations:", error);
    }
  } else {
    fs.writeFileSync(playlistFile, 'No .m3u8 URL found.');
    console.log("No .m3u8 URL found.");
  }

  await browser.close();
})();
