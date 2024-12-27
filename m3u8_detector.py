from seleniumwire import webdriver
from selenium.webdriver.firefox.service import Service
from selenium.webdriver.firefox.options import Options
import time
import re
import os

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

# Initialize the Firefox options
firefox_options = Options()
firefox_options.add_argument("--headless")  # Run in headless mode

# Specify the path to the Firefox binary if running on Windows
if os.name == 'nt':  # Check if the OS is Windows
    firefox_options.binary_location = r'C:\Program Files\Mozilla Firefox\firefox.exe'  # Adjust this path if necessary

# Path to the GeckoDriver
geckodriver_path = r'C:\geckodriver\geckodriver.exe' if os.name == 'nt' else '/usr/local/bin/geckodriver'  # Adjust this path as necessary for Linux

# Initialize the WebDriver with the correct path to GeckoDriver
service = Service(geckodriver_path)
driver = webdriver.Firefox(service=service, options=firefox_options)

# Function to find M3U8 links in a web page using network requests
def find_m3u8_links(url):
    print(f"Opening URL: {url}")
    driver.get(url)
    time.sleep(10)  # Wait for the page to fully load

    # Extract M3U8 links and their Referer from the network requests
    m3u8_links = set()  # Use a set to store unique links
    for request in driver.requests:
        print(f"Request URL: {request.url}")  # Print all request URLs for debugging
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
