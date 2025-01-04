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
  let browser;

  try {
    console.log("\x1b[34mStarting Puppeteer...\x1b[0m");
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });

    for (const targetUrl of targetUrls) {
      const page = await browser.newPage();
      await page.setExtraHTTPHeaders({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://foothubhd.org/',
        'Origin': 'https://foothubhd.org',
        'Accept': '*/*',
        'Accept-Language': 'el-GR,el;q=0.8,en-US;q=0.5,en;q=0.3',
        'Connection': 'keep-alive',
      });

      // Handle different m3u8 link extraction methods
      let foundM3u8Url = await extractM3u8FromPage(page, targetUrl);

      if (!foundM3u8Url) {
        console.log("\x1b[33mNo m3u8 URL found using default methods.\x1b[0m");

        // Additional attempts to find m3u8 links (optional)
        // You can uncomment these and implement your logic here
        // foundM3u8Url = await tryOtherM3u8ExtractionMethods(page, targetUrl);
      }

      if (foundM3u8Url) {
        const streamName = new URL(foundM3u8Url).pathname.split('/').slice(-2, -1)[0];
        m3u8Links.add({ streamName, url: foundM3u8Url, referer: targetUrl });
        console.log("\x1b[32mFound .m3u8 URL:\x1b[0m", foundM3u8Url);
      }

      await page.close();
    }

    const parsedLinks = Array.from(m3u8Links);
    parsedLinks.sort((a, b) => a.streamName.localeCompare(b.streamName));

    let playlistContent = "#EXTM3U\n";
    parsedLinks.forEach(entry => {
      playlistContent += `#EXTINF:-1,<span class="math-inline">\{entry\.streamName\}\\n\#EXTVLCOPT\:http\-referrer\=</span>{entry.referer}\n${entry.url}\n`;
    });
    fs.writeFileSync('playlist.m3u8', playlistContent);

    if (parsedLinks.length) {
      console.log(`\x1b[32m✅ Total .m3u8 URLs found: ${parsedLinks.length}\x1b[0m`);
    } else {
      console.log("\x1b[33m⚠️ No .m3u8 URL found.\x1b[0m");
    }
  } catch (error) {
    console.error("\x1b[31mAn unexpected error occurred:\x1b[0m", error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
})();

// This function encapsulates the logic
