from seleniumwire import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
import chromedriver_autoinstaller
import time
import re

# Automatically install the correct version of ChromeDriver
chromedriver_autoinstaller.install()

# List of URLs to search for M3U8 links
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

# Initialize the Chrome options
chrome_options = Options()
chrome_options.add_argument("--headless")  # Run in headless mode
chrome_options.add_argument('--no-sandbox')
chrome_options.add_argument('--disable-dev-shm-usage')

# Initialize the WebDriver with the correct path to ChromeDriver
driver = webdriver.Chrome(options=chrome_options)

# Function to find M3U8 links in a web page using network requests
def find_m3u8_links(url):
    print(f"Opening URL: {url}")
    driver.get(url)
    time.sleep(10)  # Wait for the page to fully load

    # Extract M3U8 links and their Referer from the network requests
    m3u8_links = set()  # Use a set to store unique links
    for request in driver.requests:
        if request.response and '.m3u8' in request.url:
            referer = request.headers.get('Referer', 'N/A')
            stream_name = request.url.split('/')[-2]  # Extract the stream name from the URL
            m3u8_links.add((stream_name, request.url, referer))

    print(f"Found {len(m3u8_links)} unique M3U8 links.")
    return list(m3u8_links)

# Function to create a playlist file
def create_playlist(m3u8_links, filename='playlist.m3u8'):
    # Pattern to exclude streams starting with "tracks-"
    exclude_pattern = re.compile(r'^tracks-')
    
    with open(filename, 'w', encoding='utf-8') as file:
        file.write("#EXTM3U\n")
        for stream_name, link, referer in m3u8_links:
            # Skip the streams matching the exclude pattern
            if exclude_pattern.match(stream_name):
                continue
            file.write(f"#EXTINF:-1,{stream_name}\n")
            file.write(f"#EXTVLCOPT:http-referrer={referer}\n")
            file.write(f"{link}\n")
    print(f"Playlist created: {filename}")

# Main function to search all URLs and create a playlist
def main():
    all_m3u8_links = []
    for url in urls:
        print(f"Searching M3U8 links in: {url}")
        m3u8_links = find_m3u8_links(url)
        all_m3u8_links.extend(m3u8_links)
    
    if all_m3u8_links:
        # Remove duplicates from the combined list
        unique_m3u8_links = list(set(all_m3u8_links))
        create_playlist(unique_m3u8_links)
    else:
        print("No M3U8 links found.")

    # Close the WebDriver
    driver.quit()

if __name__ == '__main__':
    main()
