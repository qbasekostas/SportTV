const fs = require('fs');
const path = require('path');
const axios = require('axios');
const m3u8Parser = require('m3u8-parser');

const urls = [
    "https://sporthd.live/channel/slg-Nova-Sports-Prime?l=0"
    // Add more URLs as needed
];

async function fetchM3U8(url) {
    try {
        const response = await axios.get(url);
        const content = response.data;
        if (content.trim().startsWith("#EXTM3U")) {
            return content;
        }
    } catch (error) {
        console.error(`Error fetching URL ${url}:`, error);
    }
    return null;
}

function parseM3U8(content) {
    const parser = new m3u8Parser.Parser();
    parser.push(content);
    parser.end();
    return parser.manifest;
}

async function detectM3U8() {
    const results = [];
    for (const url of urls) {
        const content = await fetchM3U8(url);
        if (content) {
            const manifest = parseM3u8(content);
            const duration = manifest.segments ? manifest.segments.reduce((acc, seg) => acc + seg.duration, 0) : 0;
            results.push({
                url,
                duration,
                manifest
            });
        } else {
            console.log(`No M3U8 content found for URL: ${url}`);
        }
    }
    return results;
}

async function main() {
    const results = await detectM3U8();
    const outputPath = path.join(__dirname, 'm3u8_results.json');
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`Results written to ${outputPath}`);
}

main().catch(error => {
    console.error('Error running detector:', error);
    process.exit(1);
});
