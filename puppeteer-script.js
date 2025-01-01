// ==UserScript==
// @name         M3U8 Video Detector and Downloader
// @version      1.4.1
// @description  Automatically detect the m3u8 video of the page and download it completely.
// @icon         https://tools.thatwind.com/favicon.png
// @author       allFull
// @namespace    https://tools.thatwind.com/
// @homepage     https://tools.thatwind.com/tool/m3u8downloader
// @match        *://foothubhd.org/cdn3/linka.php
// @match        *://foothubhd.org/cdn3/linkb.php
// @match        *://foothubhd.org/cdn3/linkc.php
// @match        *://www.defendersportstreams.com/play/75
// @grant        GM_xmlhttpRequest
// @grant        GM.xmlHttpRequest
// @grant        GM_download
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    const { execSync } = require('child_process');
    const fs = require('fs');

    async function saveM3U8Urls(m3u8Urls) {
        const playlistFile = 'playlist.m3u8';
        if (fs.existsSync(playlistFile)) {
            fs.unlinkSync(playlistFile);
            console.log("Deleted old playlist.m3u8 file.");
        }

        if (m3u8Urls.length) {
            fs.writeFileSync(playlistFile, "#EXTM3U\n" + m3u8Urls.map(url => `#EXTINF:-1,${url}\n${url}`).join('\n'));
            console.log(`Total .m3u8 URLs found: ${m3u8Urls.length}`);

            // Git operations
            try {
                console.log("Configuring git...");
                execSync('git config --global user.email "qbasekostas@yahoo.com"');
                execSync('git config --global user.name "qbasekostas"');

                console.log("Adding changes to git...");
                execSync('git add playlist.m3u8');

                console.log("Committing changes...");
                execSync('git commit -m "Update playlist.m3u8 with new entries"');

                console.log("Pulling latest changes...");
                execSync('git pull --rebase');

                console.log("Pushing changes to repository...");
                execSync('git push https://GITHUB_TOKEN@github.com/qbasekostas/SportTV.git');
            } catch (error) {
                console.error("Error during git operations:", error);
            }
        } else {
            fs.writeFileSync(playlistFile, 'No .m3u8 URL found.');
            console.log("No .m3u8 URL found.");
        }
    }

    // Main function to detect m3u8 URLs and save them
    async function detectAndSaveM3U8Urls() {
        const m3u8Urls = [];

        window.addEventListener('load', () => {
            const requests = performance.getEntriesByType('resource');
            requests.forEach(request => {
                if (request.initiatorType === 'xmlhttprequest' && request.name.endsWith('.m3u8')) {
                    m3u8Urls.push(request.name);
                }
            });

            if (m3u8Urls.length > 0) {
                saveM3U8Urls(m3u8Urls);
            }
        });
    }

    detectAndSaveM3U8Urls();
})();
