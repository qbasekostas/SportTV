const { Builder, Browser } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const { Options } = require('selenium-webdriver/chrome');
const {  ProxyAgent } = require('selenium-wire');
const fs = require('fs');


(async () => {
    const targetUrls = [
      'https://foothubhd.org/cdn3/linka.php',
      'https://foothubhd.org/cdn3/linkb.php',
        // ... other URLs
    ];

    const m3u8Links = new Set();
    let driver;


     try {
         console.log("\x1b[34mStarting Selenium Wire...\x1b[0m");

         const chromeOptions = new Options();
         chromeOptions.addArguments('--headless', '--no-sandbox');
         const proxyOptions = {  http: 'http://localhost:8080', https: 'https://localhost:8080' }
         const proxy = new ProxyAgent(proxyOptions);


         driver = await new Builder()
              .forBrowser(Browser.CHROME)
             .setChromeOptions(chromeOptions)
              .setProxy(proxy)
             .build();

        for (const targetUrl of targetUrls) {
          try{

                console.log("\x1b[34mNavigating to page:\x1b[0m", targetUrl);
                await driver.get(targetUrl);

                //Interception of responses to get the M3U8
                 await driver.manage().timeouts().implicitlyWait(10000);


                const scriptContent = await driver.executeScript( () => {
                     try{
                        const sourceMatch = document.querySelector('#player > div > script').textContent.match(/source:\s*window\.atob\('(.*?)'\)/);
                       if (sourceMatch && sourceMatch[1]) {
                            return window.atob(sourceMatch[1]);
                        }
                      } catch (e){
                           return null;
                      }
                });
                if(scriptContent){
                    const streamName = new URL(scriptContent).pathname.split('/').slice(-2, -1)[0];
                    m3u8Links.add({ streamName, url: scriptContent, referer:  'https://foothubhd.org/' });
                    console.log(`\x1b[32mFound .m3u8 URL:\x1b[0m ${scriptContent}`);
                 } else{
                   const pageContent = await driver.getPageSource();
                       const genericMatch = pageContent.match(/https:\/\/.*\.m3u8/);
                          if (genericMatch && genericMatch[0]) {
                             const streamName = new URL(genericMatch[0]).pathname.split('/').slice(-2, -1)[0];
                             m3u8Links.add({ streamName, url: genericMatch[0], referer:  'https://foothubhd.org/' });
                              console.log(`\x1b[32mFound .m3u8 URL using fallback:\x1b[0m`);
                            }else{
                             console.log("\x1b[33m⚠️ Could not get the M3U8 url by generic regex.\x1b[0m",targetUrl);
                          }
                 }




         } catch (navigationError) {
              console.error("\x1b[31mError processing page:\x1b[0m", navigationError, targetUrl);
          }
       }
         // Taξιvόμηση και αποθήκευση των URLs
        const parsedLinks = Array.from(m3u8Links).sort((a, b) => a.streamName.localeCompare(b.streamName));
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
       if (driver) {
          await driver.quit();
      }
    }
})();
