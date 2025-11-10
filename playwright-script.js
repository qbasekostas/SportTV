const { chromium, firefox } = require('playwright');
const fs = require('fs');

(async () => {
    const targetUrls = [
        'https://foothubhd.online/cdn3/linka.php',
        'https://foothubhd.online/cdn3/linkb.php',
        'https://foothubhd.online/cdn3/linkc.php',
        'https://foothubhd.online/cdn3/linkd.php',
        'https://foothubhd.online/cdn3/linke.php',
        'https://foothubhd.online/cdn3/linkf.php',
        'https://foothubhd.online/cdn3/linkg.php',
        'https://foothubhd.online/cdn3/linkh.php',
        'https://foothubhd.online/cdn3/linki.php',
        'https://foothubhd.online/streams/f1.php'
    ];

    const m3u8Links = new Set();
    let browser;
    const delay = ms => new Promise(res => setTimeout(res, ms));
    const CLAPPR_TIMEOUT = 20000;

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

            page.on('pageerror', (err) => {
                console.log("\x1b[31m Javascript error:\x1b[0m", err.message, err.stack, targetUrl)
            });

            try {
                console.log("\x1b[34mFetching page content:\x1b[0m", targetUrl);
                const start = Date.now();
                const response = await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
                console.log("\x1b[33m Page loaded with status:\x1b[0m", response.status(), targetUrl, ` in ${Date.now() - start}ms`);

                const referer = response.url();
                console.log("\x1b[32mReferer detected:\x1b[0m", referer);

                // ====================== START OF CHANGES ======================
                
                let decodedM3U8;
                try {
                    // Παίρνουμε όλο το HTML της σελίδας
                    const pageContent = await page.content();
                    
                    // Ψάχνουμε για το pattern "window.atob('...')" για να βρούμε το Base64 URL
                    const base64Regex = /window\.atob\('([^']+)'\)/;
                    const match = pageContent.match(base64Regex);

                    if (match && match[1]) {
                        const base64Url = match[1];
                        // Αποκωδικοποιούμε το Base64 URL χρησιμοποιώντας τη Buffer του Node.js
                        decodedM3U8 = Buffer.from(base64Url, 'base64').toString('utf-8');
                        console.log(`\x1b[32mFound and decoded .m3u8 URL: ${decodedM3U8}\x1b[0m`);
                    } else {
                        // Αν δεν βρεθεί, πετάμε σφάλμα για να πάει στο catch block
                        throw new Error('Could not find Base64 encoded M3U8 URL in page content.');
                    }

                } catch (scriptError) {
                    console.log("\x1b[31mERROR: Could not get the M3U8 url from the page content:\x1b[0m", scriptError.message, targetUrl);
                    await page.screenshot({ path: `error_screenshot_${Date.now()}.png` });
                    continue; // Προχωράμε στο επόμενο URL
                }
                
                // ======================= END OF CHANGES =======================

                // Η υπόλοιπη λογική παραμένει ίδια
                let streamName;
                try {
                    streamName = new URL(decodedM3U8).pathname.split('/')[1];
                } catch(e) {
                    // Fallback in case of invalid URL
                    streamName = `Stream_${Math.random().toString(36).substring(2, 10)}`;
                }
                
                if (!streamName || streamName.trim() === '') {
                    streamName = `Stream_${Math.random().toString(36).substring(2, 10)}`;
                    console.log("\x1b[33mGenerated random stream name:\x1b[0m", streamName);
                }

                // Modify m3u8 URL
                let modifiedM3U8 = decodedM3U8;
                if (modifiedM3U8.includes('index.m3u8')) {
                    modifiedM3U8 = modifiedM3U8.replace('index.m3u8', 'tracks-v1a1/mono.m3u8');
                    console.log("\x1b[33mModified m3u8 URL:\x1b[0m", decodedM3U8, " \x1b[32mto:\x1b[0m", modifiedM3U8);
                }

                m3u8Links.add({ streamName, url: modifiedM3U8, referer });

                await delay(1000); // Μείωσα λίγο την καθυστέρηση

            } catch (navigationError) {
                console.error("\x1b[31mError processing page:\x1b[0m", navigationError, targetUrl);
                await page.screenshot({ path: `error_screenshot_${Date.now()}.png` });
            } finally {
                await page.close();
            }
        }

        const parsedLinks = Array.from(m3u8Links).sort((a, b) => a.streamName.localeCompare(b.streamName));
        let playlistContent = "#EXTM3U\n";
        parsedLinks.forEach(entry => {
            // Προσθέτουμε το Referer στο τέλος, όπως το είχατε
            playlistContent += `#EXTINF:-1,${entry.streamName}\n${entry.url}#Referer=${entry.referer}\n`;
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
