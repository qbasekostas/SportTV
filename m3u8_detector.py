import os
import chromedriver_autoinstaller
from seleniumwire import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time

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
    'https://foothubhd.org/cdn3/linkh.php'
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

    try:
        # Wait for the page to fully load by waiting for a specific element to appear
        WebDriverWait(driver, 30).until(
            EC.presence_of_element_located((By.TAG_NAME, 'body'))
        )
        time.sleep(10)  # Additional wait time to ensure all network requests are completed

        # Execute JavaScript to trigger any dynamic content
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(5)  # Wait for additional content to load
    except Exception as e:
        print(f"Error loading page: {e}")
        return []

    # Extract M3U8 links and their Referer from the network requests
    m3u8_links = []
    for request in driver.requests:
        print(f"Request URL: {request.url}")  # Print all request URLs for debugging
        if request.response and '.m3u8' in request.url:
            referer = request.headers.get('Referer', 'N/A')
            stream_name = request.url.split('/')[-2]  # Extract the stream name from the URL
            m3u8_links.append((stream_name, request.url, referer))

    print(f"Found {len(m3u8_links)} M3U8 links.")
    return m3u8_links

# Function to create a playlist file
def create_playlist(m3u8_links, filename='playlist.m3u8'):
    # Names to exclude from the playlist
    exclude_names = ['tracks-v1', 'tracks-a1']
    
    # Get the full path of the file
    full_path = os.path.abspath(filename)
    with open(full_path, 'w', encoding='utf-8') as file:
        file.write("#EXTM3U\n")
        for stream_name, link, referer in m3u8_links:
            # Skip the excluded stream names
            if stream_name in exclude_names:
                continue
            file.write(f"#EXTINF:-1,{stream_name}\n")
            file.write(f"#EXTVLCOPT:http-referrer={referer}\n")
            file.write(f"{link}\n")
    print(f"Playlist created: {filename}")
    print(f"Full path of the playlist: {full_path}")

# Main function to search all URLs and create a playlist
def main():
    all_m3u8_links = []
    for url in urls:
        print(f"Searching M3U8 links in: {url}")
        m3u8_links = find_m3u8_links(url)
        all_m3u8_links.extend(m3u8_links)
    
    if all_m3u8_links:
        create_playlist(all_m3u8_links)
    else:
        print("No M3U8 links found.")

    # Close the WebDriver
    driver.quit()

if __name__ == '__main__':
    main()
