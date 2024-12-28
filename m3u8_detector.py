from seleniumwire import webdriver  # Import from seleniumwire
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import NoSuchElementException, TimeoutException
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

# Initialize the WebDriver using ChromeDriverManager with selenium-wire
driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)

# Function to find M3U8 links in a web page using page content
def find_m3u8_links(url):
    print(f"Opening URL: {url}")
    driver.get(url)

    try:
        # Wait for the body element to be present
        WebDriverWait(driver, 30).until(EC.presence_of_element_located((By.TAG_NAME, 'body')))
    except TimeoutException:
        print(f"Timeout while waiting for page to load: {url}")
        return []

    # Extract M3U8 links from network requests
    m3u8_links = set()  # Use a set to store unique links
    for request in driver.requests:
        if request.response and '.m3u8' in request.url:
            m3u8_links.add(request.url)

    print(f"Found {len(m3u8_links)} unique M3U8 links.")
    return list(m3u8_links)

# Function to create a playlist file
def create_playlist(m3u8_links, filename='playlist.m3u8'):
    with open(filename, 'w', encoding='utf-8') as file:
        file.write("#EXTM3U\n")
        for link in m3u8_links:
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
        unique_m3u8_links = list(set(all_m3u8_links))
        create_playlist(unique_m3u8_links)
    else:
        print("No M3U8 links found.")

    driver.quit()

if __name__ == '__main__':
    main()
