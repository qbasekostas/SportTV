import json
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.common.exceptions import NoSuchElementException
from webdriver_manager.chrome import ChromeDriverManager
import time
import re

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
chrome_options.add_argument("--headless")  # Run in headless mode for CI/CD
chrome_options.add_argument('--no-sandbox')
chrome_options.add_argument('--disable-dev-shm-usage')

# Initialize the WebDriver using ChromeDriverManager
driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)

# Function to find M3U8 links in a web page using page content
def find_m3u8_links(url):
    print(f"Opening URL: {url}")
    driver.get(url)
    time.sleep(30)  # Increase wait time to ensure page is fully loaded

    # Extract M3U8 links from page content
    m3u8_links = set()  # Use a set to store unique links
    page_source = driver.page_source
    m3u8_links.update(re.findall(r'(https?://[^\s]+\.m3u8)', page_source))

    # Check iframes for M3U8 links
    def search_iframes():
        iframes = driver.find_elements(By.TAG_NAME, 'iframe')
        for iframe in iframes:
            try:
                driver.switch_to.frame(iframe)
                iframe_source = driver.page_source
                m3u8_links.update(re.findall(r'(https?://[^\s]+\.m3u8)', iframe_source))
                search_iframes()  # Recursively search nested iframes
                driver.switch_to.default_content()
            except NoSuchElementException:
                print("No element found in iframe")

    search_iframes()

    print(f"Found {len(m3u8_links)} unique M3U8 links.")
    if not m3u8_links:
        print(f"Page source for debugging:\n{page_source[:1000]}...")  # Print first 1000 characters for debugging
    return list(m3u8_links)

# Function to create a playlist file
def create_playlist(m3u8_links, filename='playlist.m3u8'):
    # Pattern to exclude streams starting with "tracks-"
    exclude_pattern = re.compile(r'^tracks-')
    
    with open(filename, 'w', encoding='utf-8') as file:
        file.write("#EXTM3U\n")
        for link in m3u8_links:
            # Skip the streams matching the exclude pattern
            if exclude_pattern.match(link):
                continue
            file.write(f"#EXTINF:-1,{link}\n")
            file.write(f"{link}\n")
    print(f"Playlist created: {filename}")

# Main function to search all URLs and create a playlist
def main():
    all_m3u8_links = []
    for url in urls:
        print(f"Searching M3U8 links in: {url}")
        try:
            m3u8_links = find_m3u8_links(url)
            all_m3u8_links.extend(m3u8_links)
        except Exception as e:
            print(f"An error occurred while searching {url}: {e}")
    
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
