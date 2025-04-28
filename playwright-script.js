const { firefox } = require('playwright');
const fs = require('fs');

(async () => {
    const targetUrls = [
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
                console.log("\x1b[31m Ignored JavaScript error:\x1b[0m", err.message);
            });

            try {
                console.log("\x1b[34mFetching page content:\x1b[0m", targetUrl);
                const start = Date.now();
                const response = await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
                console.log("\x1b[33m Page loaded with status:\x1b[0m", response.status(), targetUrl, ` in ${Date.now() - start}ms`);

                // Check if document.body exists
                const bodyExists = await page.evaluate(() => !!document.body);
                if (!bodyExists) {
                    console.error("\x1b[31m document.body is null. Skipping this URL.\x1b[0m");
                    continue;
                }

                console.log("\x1b[32mDocument body is available.\x1b[0m");

                // Additional logic for Clappr or m3u8 extraction can be added here...

            } catch (navigationError) {
                console.error("\x1b[31mError processing page:\x1b[0m", navigationError, targetUrl);
            } finally {
                await page.close();
            }
        }

    } catch (error) {
        console.error("\x1b[31mAn unexpected error occurred:\x1b[0m", error);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
})();
