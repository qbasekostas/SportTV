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

  console.log("\x1b[34mStarting Puppeteer...\x1b[0m"); // Μπλε κείμενο για πληροφορίες εκκίνησης

  const browser = await puppeteer.launch({ headless: true });

  for (const targetUrl of targetUrls) {
    const page = await browser.newPage();

    // Ενεργοποίηση του DevTools Protocol
    const client = await page.target().createCDPSession();
    await client.send('Network.enable');

    client.on('Network.responseReceived', async (params) => {
      const url = params.response.url;
      console.log("\x1b[36mNetwork response received:\x1b[0m", url); // Κυανό κείμενο για κάθε λήψη δικτυακής απόκρισης
      if (url.endsWith('.m3u8') && url.includes('/tracks-v1a1')) {
        const referer = targetUrl;
        const streamName = url.split('/').slice(-2, -1)[0];
        m3u8Links.add(JSON.stringify({ streamName, url, referer }));
        console.log("\x1b[32mFound .m3u8 URL:\x1b[0m", url); // Πράσινο κείμενο για βρεθείσα URL
      }
    });

    try {
      console.log("\x1b[34mNavigating to page:\x1b[0m", targetUrl);
      await page.goto(targetUrl, { waitUntil: 'networkidle2' });

      // Αύξηση του χρόνου αναμονής για να εξασφαλιστεί ότι ολοκληρώνονται όλα τα αιτήματα δικτύου
      await page.waitForTimeout(120000); // Αναμονή για 120 δευτερόλεπτα
    } catch (error) {
      console.error("\x1b[31mError navigating to page:\x1b[0m", error);  // Κόκκινο κείμενο για σφάλματα
    }

    await page.close();
  }

  console.log("\x1b[34mAll network responses:\x1b[0m", Array.from(m3u8Links));

  // Μετατροπή του set σε array και ανάλυση των JSON strings
  const parsedLinks = Array.from(m3u8Links).map(JSON.parse);

  // Ταξινόμηση των συνδέσμων αλφαβητικά κατά streamName
  parsedLinks.sort((a, b) => a.streamName.localeCompare(b.streamName));

  const finalLinks = parsedLinks;

  // Καθαρισμός του προηγούμενου περιεχομένου του αρχείου playlist
  fs.writeFileSync('playlist.m3u8', '#EXTM3U\n');

  // Αποθήκευση αποτελεσμάτων στο αρχείο για αναφορά
  if (finalLinks.length) {
    console.log(`\x1b[32m✅ Total .m3u8 URLs found: ${finalLinks.length}\x1b[0m`);
    finalLinks.forEach(entry => {
      fs.appendFileSync('playlist.m3u8', `#EXTINF:-1,${entry.streamName}\n#EXTVLCOPT:http-referrer=${entry.referer}\n${entry.url}\n`);
    });
  } else {
    console.log("\x1b[33m⚠️ No .m3u8 URL found.\x1b[0m");  // Κίτρινη προειδοποίηση για κανένα αποτέλεσμα
    fs.appendFileSync('playlist.m3u8', '#EXTINF:-1,No .m3u8 URL found.\nNo .m3u8 URL found.\n');
  }

  await browser.close();
})();
