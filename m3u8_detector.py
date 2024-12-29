from seleniumwire import webdriver
from selenium.webdriver.firefox.service import Service
from selenium.webdriver.firefox.options import Options
from webdriver_manager.firefox import GeckoDriverManager
import time
import re

# Λίστα URLs για αναζήτηση M3U8 links
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

# Ρυθμίσεις για το Firefox
firefox_options = Options()
firefox_options.add_argument("--headless")  # Εκτέλεση σε headless mode

# Δημιουργία του WebDriver με χρήση GeckoDriverManager
service = Service(GeckoDriverManager().install())
driver = webdriver.Firefox(service=service, options=firefox_options)

# Συνάρτηση για εύρεση M3U8 links σε μια σελίδα
def find_m3u8_links(url):
    print(f"Opening URL: {url}")
    driver.get(url)
    time.sleep(10)  # Αναμονή για να φορτώσει πλήρως η σελίδα

    # Εξαγωγή M3U8 links από τα network requests
    m3u8_links = set()  # Χρήση set για μοναδικά links
    for request in driver.requests:
        if request.response and '.m3u8' in request.url:
            referer = request.headers.get('Referer', 'N/A')
            stream_name = request.url.split('/')[-2]  # Εξαγωγή ονόματος stream από το URL
            m3u8_links.add((stream_name, request.url, referer))

    print(f"Found {len(m3u8_links)} unique M3U8 links.")
    return list(m3u8_links)

# Συνάρτηση για δημιουργία αρχείου playlist
def create_playlist(m3u8_links, filename='playlist.m3u8'):
    # Πρότυπο για εξαιρούμενα streams
    exclude_pattern = re.compile(r'^tracks-')
    
    with open(filename, 'w', encoding='utf-8') as file:
        file.write("#EXTM3U\n")
        for stream_name, link, referer in m3u8_links:
            # Παράβλεψη streams που ταιριάζουν στο πρότυπο
            if exclude_pattern.match(stream_name):
                continue
            file.write(f"#EXTINF:-1,{stream_name}\n")
            file.write(f"#EXTVLCOPT:http-referrer={referer}\n")
            file.write(f"{link}\n")
    print(f"Playlist created: {filename}")

# Κύρια συνάρτηση
def main():
    all_m3u8_links = []
    for url in urls:
        print(f"Searching M3U8 links in: {url}")
        m3u8_links = find_m3u8_links(url)
        all_m3u8_links.extend(m3u8_links)
    
    if all_m3u8_links:
        # Αφαίρεση διπλότυπων links
        unique_m3u8_links = list(set(all_m3u8_links))
        create_playlist(unique_m3u8_links)
    else:
        print("No M3U8 links found.")

    # Κλείσιμο του WebDriver
    driver.quit()

if __name__ == '__main__':
    main()
