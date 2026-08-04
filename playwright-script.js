const { firefox } = require('playwright');
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

    const m3u8Links = [];
    let browser;
    const delay = ms => new Promise(res => setTimeout(res, ms));

    try {
        console.log("\x1b[34mStarting Playwright (Frame Search Mode)...\x1b[0m");
        browser = await firefox.launch({ headless: true, args: ['--no-sandbox'] });

        for (const targetUrl of targetUrls) {
            const page = await browser.newPage();
            try {
                console.log("\x1b[34mLoading:\x1b[0m", targetUrl);
                // Περιμένουμε networkidle για να φορτώσουν όλα τα εσωτερικά frames
                await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 30000 });

                let decodedM3U8 = null;
                let foundReferer = null;

                // ΣΑΡΩΣΗ ΟΛΩΝ ΤΩΝ FRAMES ΓΙΑ ΤΟ ΣΩΣΤΟ REFERER ΚΑΙ ΤΟ LINK
                const allFrames = page.frames();
                for (const frame of allFrames) {
                    try {
                        const content = await frame.content();
                        const match = content.match(/window\.atob\('([^']+)'\)/);
                        
                        if (match && match[1]) {
                            decodedM3U8 = Buffer.from(match[1], 'base64').toString('utf-8');
                            // Εδώ βρίσκει το σωστό Referer (π.χ. https://hamis.romponalis.st/)
                            foundReferer = new URL(frame.url()).origin + "/";
                            break; 
                        }
                    } catch (e) {}
                }

                if (decodedM3U8) {
                    // ΑΥΣΤΗΡΑ tracks-v1a1/mono.m3u8
                    if (decodedM3U8.includes('index.m3u8')) {
                        decodedM3U8 = decodedM3U8.replace('index.m3u8', 'tracks-v1a1/mono.m3u8');
                    }

                    // ΟΝΟΜΑΤΟΣΙΑ (channel1, channel2 κλπ)
                    let streamName;
                    const channelMatch = decodedM3U8.match(/channel(\d+)/i);
                    if (channelMatch) {
                        streamName = `channel${channelMatch[1]}`;
                    } else if (targetUrl.includes('f1.php')) {
                        streamName = 'channel_f1';
                    } else {
                        streamName = targetUrl.split('/').pop().replace('.php', '').replace('link', 'channel_');
                    }

                    console.log(`\x1b[32m✅ Found: ${streamName} | Ref: ${foundReferer}\x1b[0m`);
                    m3u8Links.push({ streamName, url: decodedM3U8, referer: foundReferer });
                } else {
                    console.log(`\x1b[31m❌ No link found for: ${targetUrl}\x1b[0m`);
                }

            } catch (err) {
                console.error("\x1b[31mError:\x1b[0m", targetUrl);
            } finally {
                await page.close();
            }
        }

        // Ταξινόμηση και εγγραφή
        const sortedLinks = m3u8Links.sort((a, b) => a.streamName.localeCompare(b.streamName, undefined, {numeric: true}));
        let playlist = "#EXTM3U\n";
        sortedLinks.forEach(item => {
            playlist += `#EXTINF:-1,${item.streamName}\n${item.url}#Referer=${item.referer}\n`;
        });

        fs.writeFileSync('playlist.m3u8', playlist);
        console.log(`\x1b[32m✅ Done! Playlist saved with ${sortedLinks.length} links.\x1b[0m`);

    } catch (error) {
        console.error("Fatal error:", error);
    } finally {
        if (browser) await browser.close();
    }
})();
