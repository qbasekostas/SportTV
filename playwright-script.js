const { firefox } = require('playwright');
const fs = require('fs');

(async () => {
    const targetUrls = [
        'https://foothubhd.info/cdn3/linka.php',
        'https://foothubhd.info/cdn3/linkb.php',
        'https://foothubhd.info/cdn3/linkc.php',
        'https://foothubhd.info/cdn3/linkd.php',
        'https://foothubhd.info/cdn3/linke.php',
        'https://foothubhd.info/cdn3/linkf.php',
        'https://foothubhd.info/cdn3/linkg.php',
        'https://foothubhd.info/cdn3/linkh.php',
        'https://foothubhd.info/cdn3/linki.php',
        'https://foothubhd.info/streams/f1.php'
    ];

    const m3u8Links = new Set();
    let browser;
    const delay = ms => new Promise(res => setTimeout(res, ms));

    try {
        console.log("\x1b[34mStarting Playwright with Firefox...\x1b[0m");
        // Headless: true για το GitHub Actions
        browser = await firefox.launch({ headless: true });
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0'
        });

        for (const targetUrl of targetUrls) {
            const page = await context.newPage();
            let foundInNetwork = false;

            // Παράλληλα με το atob, ακούμε και το δίκτυο μήπως πιάσουμε το link από εκεί
            page.on('request', request => {
                const url = request.url();
                if (url.includes('.m3u8')) {
                    const streamName = new URL(targetUrl).pathname.split('/').pop().replace('.php', '').toUpperCase();
                    m3u8Links.add({ streamName, url: url, referer: targetUrl });
                    foundInNetwork = true;
                }
            });

            try {
                console.log("\x1b[34mProcessing:\x1b[0m", targetUrl);
                const response = await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 20000 });
                
                if (!response || response.status() !== 200) {
                    console.log("\x1b[31m Page failed to load or blocked:\x1b[0m", targetUrl);
                    await page.close();
                    continue;
                }

                // Προσπάθεια εύρεσης μέσω window.atob στο HTML
                const pageContent = await page.content();
                const base64Regex = /window\.atob\('([^']+)'\)/;
                const match = pageContent.match(base64Regex);

                if (match && match[1]) {
                    const decodedUrl = Buffer.from(match[1], 'base64').toString('utf-8');
                    let streamName = new URL(targetUrl).pathname.split('/').pop().replace('.php', '').toUpperCase();
                    
                    if (!streamName) streamName = "STREAM_" + Math.floor(Math.random() * 100);

                    console.log(`\x1b[32m Found via atob: ${decodedUrl}\x1b[0m`);
                    m3u8Links.add({ streamName, url: decodedUrl, referer: targetUrl });
                } else if (!foundInNetwork) {
                    console.log("\x1b[33m No atob pattern found, checking network...\x1b[0m");
                    // Περιμένουμε λίγο μήπως φορτώσει ο player
                    await delay(3000);
                }

            } catch (error) {
                console.error("\x1b[31m Error on page:\x1b[0m", targetUrl, error.message);
            } finally {
                await page.close();
            }
        }

        // Δημιουργία της λίστας M3U8
        if (m3u8Links.size > 0) {
            const parsedLinks = Array.from(m3u8Links);
            let playlistContent = "#EXTM3U\n";

            parsedLinks.forEach(entry => {
                // Χρήση EXTINF και VLCOPT για καλύτερη συμβατότητα με VLC
                playlistContent += `#EXTINF:-1,${entry.streamName}\n`;
                playlistContent += `#EXTVLCOPT:http-referrer=${entry.referer}\n`;
                playlistContent += `${entry.url}\n`;
            });

            fs.writeFileSync('playlist.m3u8', playlistContent);
            console.log(`\x1b[32m✅ Successfully found ${m3u8Links.size} links and saved to playlist.m3u8\x1b[0m`);
        } else {
            console.log("\x1b[31m❌ No links found. The site might be blocking GitHub Actions IPs.\x1b[0m");
        }

    } catch (globalError) {
        console.error("\x1b[31m Fatal Error:\x1b[0m", globalError);
    } finally {
        if (browser) await browser.close();
    }
})();
