const puppeteer = require('puppeteer');
const { execSync } = require('child_process');

(async () => {
  const targetUrls = [
    "https://foothubhd.org/cdn3/linka.php",
    "https://foothubhd.org/cdn3/linkb.php",
    "https://foothubhd.org/greekchannels/mega.html"
  ];

  console.log("Starting Puppeteer...");

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  for (const targetUrl of targetUrls) {
    try {
      console.log("Navigating to page:", targetUrl);
      await page.goto(targetUrl, { waitUntil: 'networkidle2' });

      // Extract the page content
      const content = await page.content();
      console.log("Page content extracted");

      // Use yt-dlp to find and download m3u8 URLs
      const command = `yt-dlp -F ${targetUrl}`;
      try {
        const output = execSync(command, { encoding: 'utf-8' });
        console.log("yt-dlp output:", output);

        const m3u8Urls = output.match(/(http|https):\/\/[^\s]+\.m3u8/g);
        if (m3u8Urls) {
          console.log("Found .m3u8 URLs:", m3u8Urls);
          // Save the m3u8 URLs to playlist.m3u8
          const fs = require('fs');
          const playlistFile = 'playlist.m3u8';
          fs.writeFileSync(playlistFile, "#EXTM3U\n" + m3u8Urls.map(url => `#EXTINF:-1,${url}\n${url}`).join('\n'));

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
          console.log("No .m3u8 URL found.");
        }
      } catch (error) {
        console.error("Error executing yt-dlp:", error);
      }
    } catch (error) {
      console.error("Error navigating to page:", error);
    }
  }

  await browser.close();
})();
