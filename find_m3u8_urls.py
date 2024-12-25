import requests
from bs4 import BeautifulSoup

# List of URLs to check
urls = [
    "https://sporthd.live/channel/slg-Nova-Sports-Prime?l=0",
    "https://sporthd.live/channel/slg-Nova-Sports-1?l=0",
    # Add more URLs as needed
]

def find_m3u8_url(url):
    response = requests.get(url)
    if response.status_code == 200:
        soup = BeautifulSoup(response.text, 'html.parser')
        m3u8_url = soup.find('source', src=True)
        if m3u8_url and m3u8_url['src'].endswith('.m3u8'):
            return m3u8_url['src']
    return None

if __name__ == "__main__":
    for url in urls:
        m3u8_url = find_m3u8_url(url)
        if m3u8_url:
            print(f"Found M3U8 URL for {url}: {m3u8_url}")
        else:
            print(f"No M3U8 URL found for {url}")
