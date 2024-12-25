import requests
from bs4 import BeautifulSoup

# List of URLs to check
urls = [
"https://s2watch.link/player.php?id=chftknovasportprime",
"https://s2watch.link/player.php?id=chftknovasport1",
"https://s2watch.link/player.php?id=chftknovasport2",
"https://s2watch.link/player.php?id=chftknovasport3",
"https://s2watch.link/player.php?id=chftknovasport4",
"https://s2watch.link/player.php?id=chftknovasport5",
"https://s2watch.link/player.php?id=chftkcosmote1",
"https://s2watch.link/player.php?id=chftkcosmote2",
"https://s2watch.link/player.php?id=chftkcosmote3",
"https://s2watch.link/player.php?id=chftkcosmote4",
"https://s2watch.link/player.php?id=chftkcosmote5",
"https://s2watch.link/player.php?id=chftkcosmote6",
"https://s2watch.link/player.php?id=chftkcosmote7",
"https://s2watch.link/player.php?id=chftkcosmote8",
"https://s2watch.link/player.php?id=chftkcosmote9"
    # Add more URLs as needed
]

def find_m3u8_url(url):
    try:
        response = requests.get(url)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        m3u8_url = soup.find('source', src=True)
        if m3u8_url and m3u8_url['src'].endswith('.m3u8'):
            return m3u8_url['src']
    except requests.RequestException as e:
        print(f"Error fetching {url}: {e}")
    return None

if __name__ == "__main__":
    for url in urls:
        m3u8_url = find_m3u8_url(url)
        if m3u8_url:
            print(f"Found M3U8 URL for {url}: {m3u8_url}")
        else:
            print(f"No M3U8 URL found for {url}")
