import requests
from bs4 import BeautifulSoup
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

# Function to find M3U8 links in a web page using requests and BeautifulSoup
def find_m3u8_links(url):
    print(f"Opening URL: {url}")
    response = requests.get(url)
    print(f"Response status code: {response.status_code}")
    if response.status_code != 200:
        print(f"Failed to retrieve the page: {url}")
        return []

    # Parse the HTML content
    soup = BeautifulSoup(response.content, 'html.parser')
    m3u8_links = set()  # Use a set to store unique links

    # Find all script tags
    for script in soup.find_all('script'):
        if script.string:
            print(f"Script content: {script.string[:100]}...")  # Print the first 100 characters for debugging
            # Search for M3U8 links in the script content
            matches = re.findall(r'https?://[^\s]+\.m3u8', script.string)
            for match in matches:
                print(f"Found M3U8 link: {match}")
                # Extract the referer if available
                referer = url
                stream_name = match.split('/')[-2]  # Extract the stream name from the URL
                m3u8_links.add((stream_name, match, referer))

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
        print(f"Found links: {m3u8_links}")  # Print found links for debugging
        all_m3u8_links.extend(m3u8_links)
    
    if all_m3u8_links:
        # Remove duplicates from the combined list
        unique_m3u8_links = list(set(all_m3u8_links))
        create_playlist(unique_m3u8_links)
    else:
        print("No M3U8 links found.")

if __name__ == '__main__':
    main()
