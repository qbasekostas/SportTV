const { chromium, firefox } = require('playwright');
const fs = require('fs');

(async () => {
    const targetUrls = [
        'https://foothubhd.st/cdn3/linka.php',
        'https://foothubhd.st/cdn3/linkb.php',
        'https://foothubhd.st/cdn3/linkc.php',
        'https://foothubhd.st/cdn3/linkd.php',
        'https://foothubhd.st/cdn3/linke.php',
        'https://foothubhd.st/cdn3/linkf.php',
        'https://foothubhd.st/cdn3/linkg.php',
        'https://foothubhd.st/cdn3/linkh.php',
        'https://foothubhd.st/cdn3/linki.php',
        'https://foothubhd.st/streams/f1.php'
    ];

    const m3u8Links = new Set();
    let browser;
    const delay = ms => new Promise(res => setTimeout(res, ms));

    try {
        console.log("\x1b[34mStarting Playwright with Firefox...\x1b[0m");
        browser = await firefox.launch({ headless: true, args: ['--no-sandbox'] });

        for (const targetUrl of targetUrls) {
            const page = await browser.newPage();

            const randomUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
            await page.setExtraHTTPHeaders({
                'User-Agent': randomUserAgent,
                'Accept': '*/*',
                'Accept-Language': 'el-GR,el;q=0.8,en-US;q=0.5,en;q=0.3',
                'Connection': 'keep-alive',
            });

            try {
                console.log("\x1b[34mFetching page content:\x1b[0m", targetUrl);
                await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });

                // Ορίζουμε το Referer που ζήτησες
                const fixedReferer = "https://foothubhd.st/";

                let decodedM3U8;
                const pageContent = await page.content();
                
                // Εύρεση Base64
                const base64Regex = /window\.atob\('([^']+)'\)/;
                const match = pageContent.match(base64Regex);

                if (match && match[1]) {
                    decodedM3U8 = Buffer.from(match[1], 'base64').toString('utf-8');
                    console.log(`\x1b[32mFound URL: ${decodedM3U8}\x1b[0m`);
                } else {
                    console.log(`\x1b[31mNo Base64 found for: ${targetUrl}\x1b[0m`);
                    await page.close();
                    continue;
                }

                // --- ΛΟΓΙΚΗ ΟΝΟΜΑΤΟΔΟΣΙΑΣ ---
                let streamName;
                
                // 1. Ψάχνουμε αν το URL περιέχει "channel" + αριθμό (π.χ. channel1)
                const channelMatch = decodedM3U8.match(/(channel\d+)/i);
                
                if (channelMatch) {
                    streamName = channelMatch[1].toLowerCase(); // π.χ. channel1
                } else if (targetUrl.includes('f1.php')) {
                    streamName = 'channel_f1'; // Ειδική ονομασία για το f1
                } else {
                    // Αν δεν βρει τίποτα, παίρνει το τελευταίο κομμάτι του targetUrl για να ξέρουμε ποιο είναι
                    streamName = targetUrl.split('/').pop().replace('.php', '');
                }

                m3u8Links.add({ streamName, url: decodedM3U8, referer: fixedReferer });

                await delay(500);

            } catch (navigationError) {
                console.error("\x1b[31mError processing page:\x1b[0m", targetUrl);
            } finally {
                await page.close();
            }
        }

        // Ταξινόμηση και αποθήκευση
        const parsedLinks = Array.from(m3u8Links).sort((a, b) => a.streamName.localeCompare(b.streamName, undefined, {numeric: true}));
        
        let playlistContent = "#EXTM3U\n";
        parsedLinks.forEach(entry => {
            playlistContent += `#EXTINF:-1,${entry.streamName}\n${entry.url}#Referer=${entry.referer}\n`;
        });
        
        fs.writeFileSync('playlist.m3u8', playlistContent);
        console.log(`\x1b[32m✅ Playlist created with ${parsedLinks.length} links.\x1b[0m`);

    } catch (error) {
        console.error("\x1b[31mAn unexpected error occurred:\x1b[0m", error);
    } finally {
        if (browser) await browser.close();
    }
})();
