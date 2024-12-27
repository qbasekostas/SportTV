from seleniumwire import webdriver
from selenium.webdriver.firefox.service import Service
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities
import time

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

# Initialize the Firefox options
firefox_options = Options()
firefox_options.add_argument("--headless")  # Run in headless mode
firefox_options.add_argument('--no-sandbox')
firefox_options.add_argument('--disable-dev-shm-usage')

# Path to the GeckoDriver
geckodriver_path = '/usr/local/bin/geckodriver'

# Initialize the WebDriver with the correct path to GeckoDriver
service = Service(geckodriver_path)

# Set desired capabilities to increase timeouts
capabilities = DesiredCapabilities.FIREFOX.copy()
capabilities['timeouts'] = {
    'implicit': 30,  # Implicit wait time
    'pageLoad': 60,  # Page load timeout
    'script': 60     # Script timeout
}

driver = webdriver.Firefox(service=service, options=firefox_options, desired_capabilities=capabilities)

# Function to find M3U8 links in a web page using network requests
def find_m3u8_links(url):
    print(f"Opening URL: {url}")
    driver.get(url)
    time.sleep(10)  # Wait for the page to fully load

    # Extract M3U8 links and their Referer from the network requests
    m3u8_links = []
    for request in driver.requests:
        if request.response and '.m3u8' in request.url:
            referer = request.headers.get('Referer', 'N/A')
            m3u8_links.append((request.url, referer))

    print(f"Found {len(m3u8_links)} M3U8 links.")
    return m3u8_links

# Function to create a playlist file
def create_playlist(m3u8_links, filename='playlist.m3u8'):
    with open(filename, 'w', encoding='utf-8') as file:
        file.write("#EXTM3U\n")
        for link, referer in m3u8_links:
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
        create_playlist(all_m3u8_links)
    else:
        print("No M3U8 links found.")

    # Close the WebDriver
    driver.quit()

if __name__ == '__main__':
    main()
