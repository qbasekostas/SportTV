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
                await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 25000 });

                let decodedM3U8 = null;
                let dynamicReferer = null;

                // --- ΨΑΧΝΟΥΜΕ ΜΕΣΑ ΣΕ ΟΛΑ ΤΑ FRAMES (IFRAMES) ---
                const allFrames = page.frames();
                for (const frame of allFrames) {
                    try {
                        const content = await frame.content();
                        const match = content.match(/window\.atob\('([^']+)'\)/);
                        
                        if (match && match[1]) {
                            decodedM3U8 = Buffer.from(match[1], 'base64').toString('utf-8');
                            // Ο σωστός referer είναι το URL του frame που βρήκαμε το link!
                            dynamicReferer = new URL(frame.url()).origin + "/";
                            break; // Το βρήκαμε, σταματάμε το ψάξιμο στα frames
                        }
                    } catch (e) {
                        // Κάποια frames μπορεί να μπλοκάρουν την πρόσβαση, τα αγνοούμε
                    }
                }

                if (decodedM3U8) {
                    // --- ΔΙΟΡΘΩΣΗ: ΑΠΟ index.m3u8 ΣΕ mono.m3u8 ---
                    if (decodedM3U8.includes('index.m3u8')) {
                        decodedM3U8 = decodedM3U8.replace('index.m3u8', 'mono.m3u8');
                    }

                    // --- ΟΝΟΜΑΤΟΣΙΑ (channel1, channel2 κλπ) ---
                    let streamName;
                    const channelMatch = decodedM3U8.match(/channel(\d+)/i);
                    if (channelMatch) {
                        streamName = `channel${channelMatch[1]}`;
                    } else if (targetUrl.includes('f1.php')) {
                        streamName = 'channel_f1';
                    } else {
                        streamName = targetUrl.split('/').pop().replace('.php', '').replace('link', 'channel_');
                    }

                    console.log(`\x1b[32m✅ Found Referer: ${dynamicReferer}\x1b[0m`);
                    console.log(`\x1b[32m✅ Added: ${streamName} (${decodedM3U8})\x1b[0m`);
                    
                    m3u8Links.add({ streamName, url: decodedM3U8, referer: dynamicReferer });
                } else {
                    console.log(`\x1b[31m❌ No link found in any frame for: ${targetUrl}\x1b[0m`);
                }

                await delay(500);
            } catch (navigationError) {
                console.error("\x1b[31mError processing:\x1b[0m", targetUrl);
            } finally {
                await page.close();
            }
        }

        const parsedLinks = Array.from(m3u8Links).sort((a, b) => a.streamName.localeCompare(b.streamName, undefined, {numeric: true}));
        
        let playlistContent = "#EXTM3U\n";
        parsedLinks.forEach(entry => {
            playlistContent += `#EXTINF:-1,${entry.streamName}\n${entry.url}#Referer=${entry.referer}\n`;
        });
        
        fs.writeFileSync('playlist.m3u8', playlistContent);
        console.log(`\x1b[32m✅ Playlist created with correct referers and mono.m3u8\x1b[0m`);

    } catch (error) {
        console.error("\x1b[31mAn unexpected error occurred:\x1b[0m", error);
    } finally {
        if (browser) await browser.close();
    }
})();
