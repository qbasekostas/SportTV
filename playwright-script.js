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

    const m3u8Links = [];
    let browser;
    const delay = ms => new Promise(res => setTimeout(res, ms));

    try {
        console.log("\x1b[34mStarting Playwright (Network Interceptor mode)...\x1b[0m");
        browser = await firefox.launch({ headless: true, args: ['--no-sandbox'] });

        for (const targetUrl of targetUrls) {
            const page = await browser.newPage();
            let foundData = null;

            // --- NETWORK INTERCEPTION: Ψάχνει τον σωστό Referer ---
            await page.route('**/*.m3u8*', async (route) => {
                const request = route.request();
                const url = request.url();
                const headers = request.headers();
                
                // ΕΔΩ ΕΙΝΑΙ ΤΟ SEARCH: Αγνοούμε το foothubhd για να βρει τον πραγματικό referer
                if (url.includes('.m3u8') && headers['referer'] && !headers['referer'].includes('foothubhd.st')) {
                    foundData = {
                        url: url,
                        referer: headers['referer']
                    };
                    console.log(`\x1b[32m[MATCH] URL: ${url.substring(0, 60)}...\x1b[0m`);
                    console.log(`\x1b[32m[MATCH] Referer: ${headers['referer']}\x1b[0m`);
                }
                route.continue();
            });

            try {
                console.log("\x1b[34mLoading:\x1b[0m", targetUrl);
                await page.goto(targetUrl, { waitUntil: 'load', timeout: 30000 });
                
                await delay(4000);

                if (foundData) {
                    let finalUrl = foundData.url;
                    
                    // ΑΥΣΤΗΡΑ tracks-v1a1/mono.m3u8
                    if (finalUrl.includes('index.m3u8')) {
                        finalUrl = finalUrl.replace('index.m3u8', 'tracks-v1a1/mono.m3u8');
                    }

                    let streamName;
                    const channelMatch = finalUrl.match(/channel(\d+)/i);
                    if (channelMatch) {
                        streamName = `channel${channelMatch[1]}`;
                    } else if (targetUrl.includes('f1.php')) {
                        streamName = 'channel_f1';
                    } else {
                        streamName = targetUrl.split('/').pop().replace('.php', '').replace('link', 'channel_');
                    }

                    m3u8Links.push({ 
                        streamName, 
                        url: finalUrl, 
                        referer: foundData.referer 
                    });
                } else {
                    console.log(`\x1b[31m❌ Could not catch .m3u8 request for: ${targetUrl}\x1b[0m`);
                }

            } catch (err) {
                console.error("\x1b[31mError:\x1b[0m", targetUrl);
            } finally {
                await page.close();
            }
        }

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
