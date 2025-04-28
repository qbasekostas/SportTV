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
        'https://foothubhd.online/streams/f1.php', // This one might still fail if the page is broken/slow
        'https://foothubhd.online/cast/1/f1.php'  // This one likely has an iframe
        // Add more URLs here if needed
    ];

    const foundLinks = new Map(); // Use a Map to store unique URLs and their associated data {referer, streamName}
    let browser;
    const delay = ms => new Promise(res => setTimeout(res, ms));
    const PAGE_LOAD_TIMEOUT = 30000; // Increased page load timeout to 30 seconds
    const CLAPPR_TIMEOUT = 25000; // Increased player timeout slightly

    // --- DEFINE randomUserAgent OUTSIDE THE LOOP ---
    const randomUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    try {
        console.log("\x1b[34mStarting Playwright with Firefox...\x1b[0m");
        browser = await firefox.launch({ headless: true, args: ['--no-sandbox'] });
        // browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] }); // Option to try Chromium

        for (const targetUrl of targetUrls) {
            const page = await browser.newPage();

            const urlObject = new URL(targetUrl);
            const dynamicReferer = `${urlObject.origin}/`;
            const dynamicOrigin = urlObject.origin;
            console.log(`\x1b[36mUsing dynamic Referer: ${dynamicReferer} for ${targetUrl}\x1b[0m`);

            await page.setExtraHTTPHeaders({
                'User-Agent': randomUserAgent,
                'Referer': dynamicReferer,
                'Origin': dynamicOrigin,
                'Accept': '*/*',
                'Accept-Language': 'el-GR,el;q=0.8,en-US;q=0.5,en;q=0.3',
                'Connection': 'keep-alive',
                'Sec-Fetch-Dest': 'iframe', // Keep this, might be relevant for iframes
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'same-origin', // Or 'cross-site' if iframe src is different domain
            });

            page.on('pageerror', (err) => {
                // Ignore common, often harmless errors if they clutter logs too much
                if (!err.message.includes('favicon.ico')) { // Example: ignore favicon errors
                   console.log(`\x1b[31m[Page Error - ${targetUrl}]\x1b[0m ${err.message}`);
                }
            });
             /*
            page.on('console', msg => {
                 if (msg.type() === 'error' && !msg.text().includes('favicon')) {
                     console.log(`\x1b[31m[Page Console Error - ${targetUrl}]\x1b[0m ${msg.text()}`);
                 }
            });
            */

            let pageClosed = false; // Flag to prevent operations on closed page

            try {
                console.log(`\x1b[34mFetching page content: ${targetUrl}\x1b[0m`);
                const start = Date.now();
                // --- ADJUSTED GOTO ---
                const response = await page.goto(targetUrl, {
                    waitUntil: 'load', // Changed from 'domcontentloaded' to 'load'
                    timeout: PAGE_LOAD_TIMEOUT // Use increased timeout
                });
                console.log(`\x1b[33mPage loaded with status: ${response?.status()} for ${targetUrl} in ${Date.now() - start}ms\x1b[0m`);

                 try {
                    await page.evaluate(() => {
                        if (typeof window.ConsoleBan === 'object' && window.ConsoleBan.init) {
                            window.ConsoleBan.init = () => {};
                            console.log('Attempted to neutralize ConsoleBan.init');
                        }
                    });
                    console.log("\x1b[32mAnti-debugging neutralization attempted.\x1b[0m");
                 } catch (evalError) {
                    // Ignore errors here, page might navigate away or close during eval
                    if (!pageClosed) {
                        console.log("\x1b[33mCould not execute anti-debug neutralization script (might be ok):\x1b[0m", evalError.message);
                    }
                 }

                // --- IFRAME HANDLING ---
                let playerContext = page; // Default to page context
                let isFrame = false;
                // Try to find a likely iframe candidate
                // Common selectors: iframe containing 'player', 'stream', 'video', or inside a #player div
                const iframeSelector = '#player iframe, iframe[id*="player"], iframe[name*="player"], iframe[src*="player"], iframe[src*="stream"]';
                try {
                    console.log(`\x1b[35mChecking for potential player iframe (selector: ${iframeSelector}) on ${targetUrl}\x1b[0m`);
                    const playerFrame = page.frameLocator(iframeSelector).first(); // Use .first() to avoid ambiguity if multiple match
                    await playerFrame.waitFor({ state: 'attached', timeout: 5000 }); // Wait briefly for iframe to attach
                    console.log("\x1b[32mPotential player iframe found. Targeting frame context.\x1b[0m");
                    playerContext = playerFrame; // Switch context to the frame
                    isFrame = true;
                } catch (iframeError) {
                    console.log(`\x1b[33mNo specific player iframe found or timed out waiting. Assuming player is on main page or iframe detection failed.\x1b[0m`);
                    // Keep playerContext as 'page'
                }
                // --- END IFRAME HANDLING ---


                let m3u8Url = null;
                try {
                    const playerSelector = '#player, [data-player], .player-container, .clappr-player, video'; // Added 'video' tag
                    console.log(`\x1b[35mWaiting for Player element (selector: ${playerSelector}) in ${isFrame ? 'iframe' : 'main page'} context on ${targetUrl}\x1b[0m`);
                    // Use playerContext (either page or frame) for waiting and evaluating
                    await playerContext.locator(playerSelector).first().waitFor({ timeout: CLAPPR_TIMEOUT });
                    console.log("\x1b[32mPlayer element found.\x1b[0m");

                    // Attempt to extract the M3U8 source using evaluate on the correct context
                    console.log(`\x1b[35mAttempting to extract M3U8 from ${isFrame ? 'iframe' : 'main page'} context...\x1b[0m`);
                    m3u8Url = await playerContext.evaluate(() => {
                        const potentialPlayers = [window.player, window.clappr, window.jwplayerInstance, document.querySelector('[data-player]')?.__vue__?.player];
                        for (const p of potentialPlayers) {
                            if (p && p.options && p.options.source && typeof p.options.source === 'string' && p.options.source.includes('.m3u8')) return p.options.source;
                            if (p && p.config && p.config.source && typeof p.config.source === 'string' && p.config.source.includes('.m3u8')) return p.config.source;
                             if (p && typeof p.getSource === 'function') {
                                const source = p.getSource();
                                if (source?.file && typeof source.file === 'string' && source.file.includes('.m3u8')) return source.file;
                            }
                        }
                         // Fallback: Check video tag source
                        const videoElement = document.querySelector('video');
                        if (videoElement && videoElement.src && videoElement.src.includes('.m3u8')) {
                             return videoElement.src;
                        }
                         if (videoElement) {
                             const sourceElement = videoElement.querySelector('source[src*=".m3u8"]');
                             if (sourceElement) return sourceElement.src;
                         }

                        // Fallback: Search script tags (less reliable)
                        const scripts = Array.from(document.querySelectorAll('script'));
                        const m3u8Regex = /(https?:\/\/[^\s"']+\.m3u8[^\s"']*)/ig;
                        let foundInScript = null;
                        for (const script of scripts) {
                            if (script.textContent) {
                                const match = script.textContent.match(m3u8Regex);
                                if (match) {
                                     if (/source\s*:\s*["'](https?:\/\/[^\s"']+\.m3u8[^\s"']*)["']/i.test(script.textContent)) {
                                         foundInScript = script.textContent.match(/source\s*:\s*["'](https?:\/\/[^\s"']+\.m3u8[^\s"']*)["']/i)[1];
                                         break; // Prioritize source:
                                     }
                                      if (!foundInScript && /file\s*:\s*["'](https?:\/\/[^\s"']+\.m3u8[^\s"']*)["']/i.test(script.textContent)) {
                                          foundInScript = script.textContent.match(/file\s*:\s*["'](https?:\/\/[^\s"']+\.m3u8[^\s"']*)["']/i)[1];
                                      }
                                      if (!foundInScript) foundInScript = match[0]; // Take first match as last resort
                                }
                            }
                        }
                        if(foundInScript) return foundInScript;

                        return null;
                    });

                } catch (playerError) {
                    if (!pageClosed) { // Check if page might have closed unexpectedly
                       console.log(`\x1b[31mTimeout or error finding/interacting with player element on ${targetUrl}:\x1b[0m ${playerError.message}`);
                       // Optional: Screenshot on error
                       // try { await page.screenshot({ path: `error_screenshot_player_${Date.now()}.png` }); } catch (ssError) {}
                    }
                }

                // Process the found URL (if any)
                 if (m3u8Url && typeof m3u8Url === 'string' && m3u8Url.includes('.m3u8')) {
                     console.log(`\x1b[32mFound .m3u8 URL: ${m3u8Url}\x1b[0m`);

                     let streamName = "Unknown Stream";
                     try {
                        const urlPath = new URL(m3u8Url).pathname;
                        const pathSegments = urlPath.split('/').filter(Boolean);
                         if (pathSegments.length >= 2) {
                             const potentialName = pathSegments[pathSegments.length - 2];
                              if (potentialName && isNaN(potentialName) && !['live', 'index', 'chunklist', 'playlist', 'stream', 'hls'].includes(potentialName.toLowerCase())) {
                                 streamName = potentialName;
                             } else if (pathSegments.length >= 3) {
                                 const secondPotential = pathSegments[pathSegments.length - 3];
                                 if(secondPotential && isNaN(secondPotential) && !['live', 'index', 'chunklist', 'playlist', 'stream', 'hls'].includes(secondPotential.toLowerCase())) streamName = secondPotential;
                             }
                         }
                          if (streamName === "Unknown Stream") {
                             const targetPathSegments = urlObject.pathname.split('/').filter(Boolean);
                             if (targetPathSegments.length > 0) {
                                 const lastSegment = targetPathSegments[targetPathSegments.length - 1];
                                 streamName = lastSegment.replace(/\.(php|html?)$/i, ''); // Clean up common extensions
                             }
                         }
                     } catch (nameError) {
                         console.warn(`\x1b[33mCould not reliably determine stream name for ${m3u8Url}. Using fallback.\x1b[0m`);
                         const fallbackName = targetUrl.substring(targetUrl.lastIndexOf('/') + 1).replace(/\.(php|html?)$/i, '');
                         streamName = fallbackName || "Stream";
                     }


                     let modifiedM3U8 = m3u8Url;
                      // Refined modification logic
                     if (modifiedM3U8.endsWith('/index.m3u8')) {
                         modifiedM3U8 = modifiedM3U8.replace('/index.m3u8', '/tracks-v1a1/mono.m3u8');
                         console.log(`\x1b[33mModified m3u8 URL (index): ${m3u8Url} -> ${modifiedM3U8}\x1b[0m`);
                     } else if (modifiedM3U8.endsWith('/playlist.m3u8')) {
                          modifiedM3U8 = modifiedM3U8.replace('/playlist.m3u8', '/tracks-v1a1/mono.m3u8');
                          console.log(`\x1b[33mModified m3u8 URL (playlist): ${m3u8Url} -> ${modifiedM3U8}\x1b[0m`);
                     }


                     if (!foundLinks.has(modifiedM3U8)) {
                          foundLinks.set(modifiedM3U8, { streamName: streamName.toUpperCase(), url: modifiedM3U8, referer: dynamicReferer });
                          console.log(`\x1b[32mStored unique link: ${streamName.toUpperCase()} - ${modifiedM3U8} (Referer: ${dynamicReferer})\x1b[0m`);
                     } else {
                          console.log(`\x1b[33mLink already found: ${modifiedM3U8}\x1b[0m`);
                     }

                 } else if (!playerError) { // Only log 'not found' if there wasn't a preceding error finding the player
                     console.log(`\x1b[31mCould not find a valid .m3u8 URL on ${targetUrl} via evaluation.\x1b[0m`);
                 }

                await delay(1500); // Slightly reduced delay

            } catch (navigationOrSetupError) {
                // Catch errors during goto or initial setup before player search
                if (!pageClosed) { // Check if page might have closed
                    console.error(`\x1b[31mError processing page ${targetUrl}:\x1b[0m`, navigationOrSetupError.message);
                     // Optional: Screenshot on error
                     // try { await page.screenshot({ path: `error_screenshot_nav_${Date.now()}.png` }); } catch (ssError) {}
                }
            } finally {
                if (!page.isClosed()) {
                   await page.close();
                }
                pageClosed = true; // Mark page as closed
            }
        } // End of for loop

        // --- Process and save the found links ---
        if (foundLinks.size > 0) {
            const parsedLinks = Array.from(foundLinks.values());
            parsedLinks.sort((a, b) => a.streamName.localeCompare(b.streamName));

            let playlistContent = "#EXTM3U\n";
            parsedLinks.forEach(entry => {
                playlistContent += `#EXTINF:-1 tvg-id="${entry.streamName}" tvg-name="${entry.streamName}" group-title="Auto Found",${entry.streamName}\n`;
                playlistContent += `#EXTVLCOPT:http-referrer=${entry.referer}\n`;
                // --- USE THE CORRECT randomUserAgent VARIABLE (defined outside loop) ---
                playlistContent += `#EXTVLCOPT:user-agent=${randomUserAgent}\n`;
                playlistContent += `${entry.url}\n`;
            });

            fs.writeFileSync('playlist_auto_referer.m3u8', playlistContent);
            console.log(`\n\x1b[32m✅ Successfully generated playlist_auto_referer.m3u8 with ${parsedLinks.length} unique links.\x1b[0m`);

        } else {
            console.log("\n\x1b[33m⚠️ No .m3u8 URLs were found across all target pages.\x1b[0m");
        }

    } catch (error) {
        // Catch top-level errors (e.g., browser launch failed)
        console.error("\x1b[31mAn unexpected top-level error occurred:\x1b[0m", error);
    } finally {
        if (browser) {
            console.log("\x1b[34mClosing browser...\x1b[0m");
            await browser.close();
        }
    }
})();
