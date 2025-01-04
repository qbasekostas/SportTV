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
                'Access-Control-Allow-Origin': '*',
            });

            page.on('response', async (response) => {
                try {
                    const url = response.url();
                    const contentType = response.headers()['content-type'];
                    console.log("Response URL:", url);
                    console.log("Response content-type:", contentType);

                    if (url.includes('.json') || contentType?.includes('json')) {
                        const body = await response.text();
                        try {
                            const json = JSON.parse(body);
                            if (json && typeof json === 'object') {
                                const m3u8Url = findM3U8Url(json);
                                if (m3u8Url) {
                                    const referer = targetUrl;
                                    const streamName = new URL(m3u8Url).pathname.split('/').slice(-2, -1)[0];
                                    m3u8Links.add({ streamName, url: m3u8Url, referer });
                                    console.log("\x1b[32mFound .m3u8 URL in json:\x1b[0m", m3u8Url);
                                }
                            }
                        } catch (e) {
                            console.error("\x1b[31mError parsing json:\x1b[0m", url, e);
                        }
                    } else if (contentType?.includes('html')) {
                        const html = await response.text();
                        const scriptTagMatches = html.matchAll(/<script[^>]*type="application\/json"[^>]*>(.*?)<\/script>/gs);
                        for (const match of scriptTagMatches) {
                            try {
                                const json = JSON.parse(match[1]);
                                if (json && typeof json === 'object') {
                                    const m3u8Url = findM3U8Url(json);
                                    if (m3u8Url) {
                                        const referer = targetUrl;
                                        const streamName = new URL(m3u8Url).pathname.split('/').slice(-2, -1)[0];
                                        m3u8Links.add({ streamName, url: m3u8Url, referer });
                                        console.log("\x1b[32mFound .m3u8 URL in script tag:\x1b[0m", m3u8Url);
                                    }
                                }
                            } catch (e) {
                                console.error("\x1b[31mError parsing script tag:\x1b[0m", e);
                            }
                        }
                    }
                } catch (e) {
                    console.error("\x1b[31mError in response handler:\x1b[0m", e);
                }
            });

            try {
                console.log("\x1b[34mNavigating to page:\x1b[0m", targetUrl);
                await page.goto(targetUrl, { waitUntil: 'networkidle2' });

                await page.waitForFunction(() => {
                    const video = document.querySelector('video, video[data-html5-video]');
                    return video && video.src;
                }, { timeout: 30000 });

                const videoElement = await page.$('video, video[data-html5-video]');
                if (videoElement) {
                    const videoSrc = await page.evaluate((el) => el.src, videoElement);
                    if (videoSrc && videoSrc.startsWith('blob:')) {
                        console.log(`\x1b[34mBlob source found:\x1b[0m ${videoSrc}`);
                        page.on('response', async (response) => {
                            if (response.url() === videoSrc) {
                                try {
                                    const m3u8Url = await response.text();
                                    const referer = targetUrl;
                                    const streamName = new URL(m3u8Url).pathname.split('/').slice(-2, -1)[0];
                                    m3u8Links.add({ streamName, url: m3u8Url, referer });
                                    console.log("\x1b[32mFound m3u8 URL from blob response:\x1b[0m", m3u8Url);
                                } catch (error) {
                                    console.error(`\x1b[31mError processing blob response:\x1b[0m`, error, videoSrc);
                                }
                            }
                        });
                    } else {
                        console.log(`\x1b[33mNo blob source found for video element, skipping:\x1b[0m ${targetUrl}`);
                    }
                }

                await page.evaluate(async (time) => {
                    await new Promise((resolve) => setTimeout(resolve, time));
                }, 20000);

                await page.screenshot({ path: `screenshot-${targetUrl.split('/').pop()}.png` });
            } catch (error) {
                console.error("\x1b[31mError navigating to page:\x1b[0m", error, targetUrl);
            } finally {
                try {
                    await page.close();
                } catch (closeError) {
                    console.error("\x1b[31mError closing page:\x1b[0m", closeError, targetUrl);
                }
            }
        }

        const parsedLinks = Array.from(m3u8Links);
        parsedLinks.sort((a, b) => a.streamName.localeCompare(b.streamName));
        let playlistContent = "#EXTM3U\n";
        parsedLinks.forEach(entry => {
            playlistContent += `#EXTINF:-1,${entry.streamName}\n#EXTVLCOPT:http-referrer=${entry.referer}\n${entry.url}\n`;
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
            try {
                await browser.close();
            } catch (browserCloseError) {
                console.error("\x1b[31mError closing browser:\x1b[0m", browserCloseError);
            }
        }
    }
})();

function findM3U8Url(obj) {
    if (typeof obj === 'string' && obj.endsWith('.m3u8')) {
        return obj;
    } else if (typeof obj === 'object') {
        for (const key in obj) {
            const result = findM3U8Url(obj[key]);
            if (result) {
                return result;
            }
        }
    }
    return null;
}
