import subprocess
import sys

# Εγκατάσταση των απαραίτητων πακέτων αν δεν είναι ήδη εγκατεστημένα
def install_packages():
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pyppeteer", "pyppeteer_stealth"])

install_packages()

import asyncio
from pyppeteer import launch
from pyppeteer_stealth import stealth
import re

# Λίστα URLs για αναζήτηση M3U8 συνδέσμων
urls = [
    'https://foothubhd.org/cdn3/linka.php',
    'https://foothubhd.org/cdn3/linkb.php',
    'https://foothubhd.org/cdn3/linkc.php',
    'https://foothubhd.org/cdn3/linkd.php',
    'https://foothubhd.org/cdn3/linke.php',
    'https://foothubhd.org/cdn3/linkf.php',
    'https://foothubhd.org/cdn3/linkg.php',
    'https://foothubhd.org/cdn3/linkh.php',
    'https://foothubhd.org/cast/1/eurosport1gr.php',
    'https://foothubhd.org/cast/1/eurosport2gr.php'
]

async def find_m3u8_links(url):
    browser = await launch(headless=True)
    page = await browser.newPage()
    await stealth(page)

    m3u8_links = set()

    async def intercept_request(request):
        if '.m3u8' in request.url or 'application/vnd.apple.mpegurl' in request.headers.get('Content-Type', ''):
            referer = request.headers.get('Referer', 'N/A')
            stream_name = request.url.split('/')[-2]
            # Αποκλεισμός των συνδέσμων που ξεκινούν με "tracks-"
            if not re.match(r'^tracks-', stream_name):
                m3u8_links.add((stream_name, request.url, referer))
                print(f"Found M3U8 link: {request.url} with referer {referer}")
        await request.continue_()

    await page.setRequestInterception(True)
    page.on('request', lambda req: asyncio.ensure_future(intercept_request(req)))

    try:
        await page.goto(url, {'waitUntil': 'networkidle2', 'timeout': 60000})  # Αύξηση του χρονικού ορίου σε 60 δευτερόλεπτα
        await asyncio.sleep(20)  # Πρόσθετη αναμονή για δυναμικά στοιχεία
    except Exception as e:
        print(f"An error occurred while loading {url}: {e}")

    await browser.close()
    return list(m3u8_links)

async def create_playlist(m3u8_links, filename='playlist.m3u8'):
    with open(filename, 'w', encoding='utf-8') as file:
        file.write("#EXTM3U\n")
        for stream_name, link, referer in m3u8_links:
            file.write(f"#EXTINF:-1,{stream_name}\n")
            file.write(f"#EXTVLCOPT:http-referrer={referer}\n")
            file.write(f"{link}\n")
    print(f"Playlist created: {filename}")

async def main():
    all_m3u8_links = []
    for url in urls:
        print(f"Searching M3U8 links in: {url}")
        try:
            m3u8_links = await find_m3u8_links(url)
            all_m3u8_links.extend(m3u8_links)
        except Exception as e:
            print(f"An error occurred while searching {url}: {e}")

    if all_m3u8_links:
        unique_m3u8_links = list(set(all_m3u8_links))
        await create_playlist(unique_m3u8_links)
    else:
        print("No M3U8 links found.")

if __name__ == '__main__':
    asyncio.get_event_loop().run_until_complete(main())
