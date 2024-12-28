import json
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities
from selenium.common.exceptions import NoSuchElementException
from webdriver_manager.chrome import ChromeDriverManager
import time
import re

# Ορισμός των capabilities μέσω του chrome_options
chrome_options = Options()
capabilities = {
    "browserName": "chrome",
    "browserVersion": "latest",
    "platformName": "any"
}
for key, value in capabilities.items():
    chrome_options.set_capability(key, value)
  chrome_options.add_argument("--headless")  # Run in headless mode for CI/CD
chrome_options.add_argument('--no-sandbox')
chrome_options.add_argument('--disable-dev-shm-usage')

driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)


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

# Enable logging for network requests
capabilities = DesiredCapabilities.CHROME
capabilities["goog:loggingPrefs"] = {"performance": "ALL"}

# Function to find M3U8 links in a web page using network requests and page content
def find_m3u8_links(url):
    print(f"Opening URL: {url}")
    driver.get(url)
    time.sleep(20)  # Wait for the page to fully load

    # Extract M3U8 links from network requests
    m3u8_links = set()  # Use a set to store unique links
    logs = driver.get_log("performance")
    for log in logs:
        message = log["message"]
        # Parse log message as JSON
        message_json = json.loads(message)["message"]
        if message_json["method"] == "Network.responseReceived":
            request_url = message_json["params"]["response"]["url"]
            if ".m3u8" in request_url:
                referer = message_json["params"]["response"]["requestHeaders"].get("Referer", "N/A")
                stream_name = request_url.split('/')[-2]  # Extract the stream name from the URL
                m3u8_links.add((stream_name, request_url, referer))

    # Additionally, search the page content for M3U8 links
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
