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
        'https://foothubhd.online/streams/f1.php',
        'https://foothubhd.online/cast/1/f1.php'
        // Add more URLs here if needed
    ];

    const m3u8Links = new Set(); // Using a Set to avoid duplicates based on object content might be tricky, let's use an array and check later or structure the set entry carefully. Let's store objects {streamName, url, referer}.
    const foundLinks = new Map(); // Use a Map to store unique URLs and their associated data {referer, streamName}

    let browser;
    const delay = ms => new Promise(res => setTimeout(res, ms));
    const CLAPPR_TIMEOUT = 20000; // 20 seconds timeout for finding the player

    try {
        console.log("\x1b[34mStarting Playwright with Firefox...\x1b[0m");
        // Using firefox as in the original script
        browser = await firefox.launch({ headless: true, args: ['--no-sandbox'] });
        // Or use chromium if firefox causes issues:
        // browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });

        for (const targetUrl of targetUrls) {
            const page = await browser.newPage();

            // --- AUTOMATIC REFERER DETECTION ---
            // Derive Referer and Origin from the target URL itself
            const urlObject = new URL(targetUrl);
            const dynamicReferer = `${urlObject.origin}/`; // Often, the origin is sufficient as referer for embedded content
            const dynamicOrigin = urlObject.origin;
            console.log(`\x1b[36mUsing dynamic Referer: ${dynamicReferer} for ${targetUrl}\x1b[0m`);
            // --- END AUTOMATIC REFERER DETECTION ---

            const randomUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'; // Keep User-Agent consistent or randomize more if needed

            // Set headers using the dynamic referer and origin
            await page.setExtraHTTPHeaders({
                'User-Agent': randomUserAgent,
                'Referer': dynamicReferer, // Use the dynamic referer
                'Origin': dynamicOrigin, // Use the dynamic origin
                'Accept': '*/*',
                'Accept-Language': 'el-GR,el;q=0.8,en-US;q=0.5,en;q=0.3',
                'Connection': 'keep-alive',
                // Add other headers if necessary, e.g., Sec-Fetch-* might be checked by some sites
                'Sec-Fetch-Dest': 'iframe',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'same-origin', // Adjust if the target is cross-origin relative to the *real* parent page
            });

            // Log JavaScript errors from the page
            page.on('pageerror', (err) => {
                console.log(`\x1b[31m[Page Error - ${targetUrl}]\x1b[0m ${err.message}`);
                // console.error(err.stack); // Uncomment for full stack trace
            });
            // Log console messages from the page (optional, can be verbose)
            /*
            page.on('console', msg => {
                if (msg.type() === 'error') {
                    console.log(`\x1b[31m[Page Console Error - ${targetUrl}]\x1b[0m ${msg.text()}`);
                } else {
                   // console.log(`[Page Console - ${targetUrl}] ${msg.text()}`);
                }
            });
            */

            try {
                console.log(`\x1b[34mFetching page content: ${targetUrl}\x1b[0m`);
                const start = Date.now();
                // Increased timeout for navigation slightly
                const response = await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
                console.log(`\x1b[33mPage loaded with status: ${response?.status()} for ${targetUrl} in ${Date.now() - start}ms\x1b[0m`);

                 // Attempt to disable ConsoleBan or similar anti-debugging measures
                 try {
                    await page.evaluate(() => {
                        if (typeof window.ConsoleBan === 'object' && window.ConsoleBan.init) {
                            window.ConsoleBan.init = () => {}; // Neutralize init
                            console.log('Attempted to neutralize ConsoleBan.init');
                        }
                        // Add other potential anti-debug measures here if needed
                    });
                    console.log("\x1b[32mAnti-debugging neutralization attempted.\x1b[0m");
                 } catch (evalError) {
                    console.log("\x1b[33mCould not execute anti-debug neutralization script:\x1b[0m", evalError.message);
                 }


                try {
                    // Wait for a common Clappr player container selector
                    const playerSelector = '#player, [data-player], .player-container, .clappr-player'; // More generic selector
                    console.log(`\x1b[35mWaiting for Player container (selector: ${playerSelector}) on ${targetUrl}\x1b[0m`);
                    // Wait longer if needed, pages might load slowly
                    await page.waitForSelector(playerSelector, { timeout: CLAPPR_TIMEOUT });
                    console.log("\x1b[32mPlayer container found.\x1b[0m");
                } catch (error) {
                    console.log(`\x1b[31mTimeout or error waiting for Player container on ${targetUrl}.\x1b[0m`);
                    // await page.screenshot({ path: `error_screenshot_player_not_found_${Date.now()}.png` }); // Screenshot on error
                    // continue; // Skip to the next URL if player isn't found
                     // Let's try to proceed anyway, maybe the evaluate will work
                }

                let decodedM3U8;
                try {
                    // Attempt to extract the M3U8 source from common player configurations
                    decodedM3U8 = await page.evaluate(() => {
                        // Check common player variable names and properties
                        const potentialPlayers = [window.player, window.clappr, window.jwplayerInstance, document.querySelector('[data-player]')?.__vue__?.player]; // Add more potential player objects
                        for (const p of potentialPlayers) {
                            if (p && p.options && p.options.source) {
                                return p.options.source; // Clappr style
                            }
                            if (p && p.config && p.config.source) {
                                return p.config.source; // Another common pattern
                            }
                             if (p && p.getSource) { // JW Player style
                                const source = p.getSource();
                                return source?.file;
                            }
                        }
                        // Fallback: Search script tags for m3u8 URLs (less reliable)
                        const scripts = Array.from(document.querySelectorAll('script'));
                        const m3u8Regex = /(https?:\/\/[^\s"']+\.m3u8[^\s"']*)/ig;
                        for (const script of scripts) {
                            if (script.textContent) {
                                const match = script.textContent.match(m3u8Regex);
                                if (match) {
                                    // Prioritize URLs likely related to 'source' or 'file'
                                    if (/source\s*:\s*["'](https?:\/\/[^\s"']+\.m3u8[^\s"']*)["']/i.test(script.textContent)) {
                                        return script.textContent.match(/source\s*:\s*["'](https?:\/\/[^\s"']+\.m3u8[^\s"']*)["']/i)[1];
                                    }
                                     if (/file\s*:\s*["'](https?:\/\/[^\s"']+\.m3u8[^\s"']*)["']/i.test(script.textContent)) {
                                        return script.textContent.match(/file\s*:\s*["'](https?:\/\/[^\s"']+\.m3u8[^\s"']*)["']/i)[1];
                                    }
                                    // Otherwise, return the first found m3u8
                                    return match[0];
                                }
                            }
                        }
                        return null; // Return null if nothing found
                    });

                    if (decodedM3U8 && typeof decodedM3U8 === 'string' && decodedM3U8.includes('.m3u8')) {
                         console.log(`\x1b[32mFound .m3u8 URL: ${decodedM3U8}\x1b[0m`);

                        // Extract a stream name (improved logic)
                        let streamName = "Unknown Stream";
                        try {
                            // Try getting name from URL path segment before .m3u8 or a number/ID
                            const pathSegments = new URL(decodedM3U8).pathname.split('/').filter(Boolean); // Remove empty segments
                            if (pathSegments.length >= 2) {
                                const potentialName = pathSegments[pathSegments.length - 2];
                                // Check if it's not just a number or 'live' or 'index' etc.
                                if (potentialName && isNaN(potentialName) && !['live', 'index', 'chunklist', 'playlist', 'stream'].includes(potentialName.toLowerCase())) {
                                     streamName = potentialName;
                                } else if (pathSegments.length >= 3) {
                                     // Try segment before that if the last one was generic
                                     const secondPotential = pathSegments[pathSegments.length - 3];
                                     if(secondPotential && isNaN(secondPotential)) streamName = secondPotential;
                                }
                            }
                             // Fallback using targetUrl path if m3u8 path didn't yield good name
                             if (streamName === "Unknown Stream") {
                                 const targetPathSegments = urlObject.pathname.split('/').filter(Boolean);
                                 if (targetPathSegments.length > 0) {
                                     const lastSegment = targetPathSegments[targetPathSegments.length - 1];
                                     streamName = lastSegment.replace('.php', ''); // Clean up common extensions
                                 }
                             }

                        } catch (nameError) {
                            console.warn(`\x1b[33mCould not reliably determine stream name for ${decodedM3U8}\x1b[0m`);
                             // Use a fallback based on the original target URL filename
                             const fallbackName = targetUrl.substring(targetUrl.lastIndexOf('/') + 1).replace('.php', '');
                             streamName = fallbackName || "Stream";
                        }


                        // Modify m3u8 URL if needed (keep existing logic)
                        let modifiedM3U8 = decodedM3U8;
                        if (modifiedM3U8.includes('/index.m3u8')) {
                              modifiedM3U8 = modifiedM3U8.replace('/index.m3u8', '/tracks-v1a1/mono.m3u8'); // More specific replacement
                            console.log(`\x1b[33mModified m3u8 URL: ${decodedM3U8} -> ${modifiedM3U8}\x1b[0m`);
                        } else if (modifiedM3U8.includes('/playlist.m3u8')) {
                             modifiedM3U8 = modifiedM3U8.replace('/playlist.m3u8', '/tracks-v1a1/mono.m3u8');
                             console.log(`\x1b[33mModified m3u8 URL: ${decodedM3U8} -> ${modifiedM3U8}\x1b[0m`);
                        }


                        // Store the found link using the modified URL as the key to ensure uniqueness
                        if (!foundLinks.has(modifiedM3U8)) {
                             foundLinks.set(modifiedM3U8, { streamName: streamName.toUpperCase(), url: modifiedM3U8, referer: dynamicReferer });
                             console.log(`\x1b[32mStored unique link: ${streamName.toUpperCase()} - ${modifiedM3U8}\x1b[0m`);
                        } else {
                             console.log(`\x1b[33mLink already found: ${modifiedM3U8}\x1b[0m`);
                        }

                    } else {
                        console.log(`\x1b[31mCould not find a valid .m3u8 URL on ${targetUrl}\x1b[0m`);
                       // await page.screenshot({ path: `error_screenshot_m3u8_not_found_${Date.now()}.png` });
                    }

                } catch (scriptError) {
                    console.log(`\x1b[31mError executing script to find M3U8 on ${targetUrl}:\x1b[0m`, scriptError.message);
                   // await page.screenshot({ path: `error_screenshot_script_error_${Date.now()}.png` });
                }

                await delay(2000); // Reduced delay slightly, adjust if needed

            } catch (navigationError) {
                console.error(`\x1b[31mError processing page ${targetUrl}:\x1b[0m`, navigationError.message);
               // await page.screenshot({ path: `error_screenshot_nav_error_${Date.now()}.png` });
            } finally {
                await page.close();
            }
        } // End of for loop

        // --- Process and save the found links ---
        if (foundLinks.size > 0) {
            // Convert Map values to an array
            const parsedLinks = Array.from(foundLinks.values());

            // Sort by stream name
            parsedLinks.sort((a, b) => a.streamName.localeCompare(b.streamName));

            // Generate M3U8 playlist content
            let playlistContent = "#EXTM3U\n";
            parsedLinks.forEach(entry => {
                // Ensure referer is correctly added for each entry
                playlistContent += `#EXTINF:-1 tvg-id="${entry.streamName}" tvg-name="${entry.streamName}" group-title="Auto Found",${entry.streamName}\n`; // Added tvg tags
                playlistContent += `#EXTVLCOPT:http-referrer=${entry.referer}\n`;
                playlistContent += `#EXTVLCOPT:user-agent=${randomUserAgent}\n`; // Add user-agent too if needed by player/server
                playlistContent += `${entry.url}\n`;
            });

            fs.writeFileSync('playlist_auto_referer.m3u8', playlistContent);
            console.log(`\n\x1b[32m✅ Successfully generated playlist_auto_referer.m3u8 with ${parsedLinks.length} unique links.\x1b[0m`);

        } else {
            console.log("\n\x1b[33m⚠️ No .m3u8 URLs were found across all target pages.\x1b[0m");
        }

    } catch (error) {
        console.error("\x1b[31mAn unexpected error occurred during the process:\x1b[0m", error);
    } finally {
        if (browser) {
            console.log("\x1b[34mClosing browser...\x1b[0m");
            await browser.close();
        }
    }
})();
