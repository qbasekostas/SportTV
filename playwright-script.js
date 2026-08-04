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

            await page.setExtraHTTPHeaders({
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            });

            try {
                console.log("\x1b[34mFetching page:\x1b[0m", targetUrl);
                // Πηγαίνουμε στη σελίδα και περιμένουμε να φορτώσει
                await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });

                // --- ΕΔΩ ΨΑΧΝΕΙ ΤΟΝ REFERER ΔΥΝΑΜΙΚΑ ---
                // Παίρνει το domain της σελίδας που είναι ανοιχτή εκείνη τη στιγμή (μετά από redirects)
                const dynamicReferer = new URL(page.url()).origin + "/";
                console.log(`\x1b[36mFound Referer: ${dynamicReferer}\x1b[0m`);

                const pageContent = await page.content();
                const base64Regex = /window\.atob\('([^']+)'\)/;
                const match = pageContent.match(base64Regex);

                if (match && match[1]) {
                    const decodedM3U8 = Buffer.from(match[1], 'base64').toString('utf-8');
                    
                    // --- ΟΝΟΜΑΤΟΣΙΑ (channel1, channel2 κλπ) ---
                    let streamName;
                    const channelMatch = decodedM3U8.match(/channel(\d+)/i);
                    
                    if (channelMatch) {
                        streamName = `channel${channelMatch[1]}`;
                    } else if (targetUrl.includes('f1.php')) {
                        streamName = 'channel_f1';
                    } else {
                        // Αν δεν βρει "channelX" στο link, παίρνει το όνομα από το targetUrl
                        streamName = targetUrl.split('/').pop().replace('.php', '').replace('link', 'channel_');
                    }

                    console.log(`\x1b[32mAdded: ${streamName}\x1b[0m`);
                    m3u8Links.add({ streamName, url: decodedM3U8, referer: dynamicReferer });

                } else {
                    console.log(`\x1b[31mNo Base64 found for: ${targetUrl}\x1b[0m`);
                }

                await delay(500);

            } catch (navigationError) {
                console.error("\x1b[31mError processing:\x1b[0m", targetUrl);
            } finally {
                await page.close();
            }
        }

        // Ταξινόμηση αριθμητικά (1, 2, 3...)
        const parsedLinks = Array.from(m3u8Links).sort((a, b) => a.streamName.localeCompare(b.streamName, undefined, {numeric: true}));
        
        let playlistContent = "#EXTM3U\n";
        parsedLinks.forEach(entry => {
            playlistContent += `#EXTINF:-1,${entry.streamName}\n${entry.url}#Referer=${entry.referer}\n`;
        });
        
        fs.writeFileSync('playlist.m3u8', playlistContent);
        console.log(`\x1b[32m✅ Playlist created with dynamic referers.\x1b[0m`);

    } catch (error) {
        console.error("\x1b[31mAn unexpected error occurred:\x1b[0m", error);
    } finally {
        if (browser) await browser.close();
    }
})();
