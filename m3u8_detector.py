from seleniumwire import webdriver
from selenium.webdriver.firefox.service import Service
from selenium.webdriver.firefox.options import Options
import time
import re

# Λίστα URLs για ανίχνευση
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

# Ρυθμίσεις Firefox
firefox_options = Options()
firefox_options.add_argument("--headless")  # Λειτουργία χωρίς GUI

# Διαδρομή προς το εκτελέσιμο του geckodriver
geckodriver_path = '/usr/local/bin/geckodriver'  # Προσαρμόστε τη διαδρομή αν χρειάζεται

# WebDriver Service
service = Service(executable_path=geckodriver_path)

# Δημιουργία WebDriver
driver = webdriver.Firefox(service=service, options=firefox_options)

# Λειτουργία για εύρεση M3U8 links
def find_m3u8_links(url):
    print(f"Opening URL: {url}")
    driver.get(url)
    time.sleep(15)  # Αναμονή για φόρτωση σελίδας

    # Έλεγχος για M3U8 links στα requests
    m3u8_links = set()
    for request in driver.requests:
        if request.response and '.m3u8' in request.url:
            referer = request.headers.get('Referer', 'N/A')
            stream_name = request.url.split('/')[-2]  # Απόσπαση ονόματος ροής
            m3u8_links.add((stream_name, request.url, referer))

    # Έλεγχος του DOM για links
    page_source = driver.page_source
    if '.m3u8' in page_source:
        print("M3U8 link found in page source!")

    print(f"Found {len(m3u8_links)} unique M3U8 links.")
    return list(m3u8_links)

# Δημιουργία playlist
def create_playlist(m3u8_links, filename='playlist.m3u8'):
    exclude_pattern = re.compile(r'^tracks-')

    with open(filename, 'w', encoding='utf-8') as file:
        file.write("#EXTM3U\n")
        for stream_name, link, referer in m3u8_links:
            if exclude_pattern.match(stream_name):
                continue
            file.write(f"#EXTINF:-1,{stream_name}\n")
            file.write(f"#EXTVLCOPT:http-referrer={referer}\n")
            file.write(f"{link}\n")
    print(f"Playlist created: {filename}")

# Κύρια λειτουργία
def main():
    all_m3u8_links = []
    for url in urls:
        print(f"Searching M3U8 links in: {url}")
        m3u8_links = find_m3u8_links(url)
        all_m3u8_links.extend(m3u8_links)

    if all_m3u8_links:
        unique_m3u8_links = list(set(all_m3u8_links))
        create_playlist(unique_m3u8_links)
    else:
        print("No M3U8 links found.")

    driver.quit()

if __name__ == '__main__':
    main()
