import requests

urls = [
    'https://foothubhd.org/cdn3/linka.php',
    'https://foothubhd.org/cdn3/linkb.php',
    'https://foothubhd.org/cdn3/linkc.php',
    'https://foothubhd.org/cdn3/linkd.php',
    'https://foothubhd.org/cdn3/linke.php',
    'https://foothubhd.org/cdn3/linkf.php',
    'https://foothubhd.org/cdn3/linkg.php',
    'https://foothubhd.org/cdn3/linkh.php',
]

def fetch_m3u8_content(url):
    try:
        response = requests.get(url)
        response.raise_for_status()  # Check if the request was successful
        print(f"Fetching URL: {url}")
        if '#EXTM3U' in response.text:
            print(f"M3U8 content found for URL: {url}")
            return response.text
        else:
            print(f"No M3U8 content found for URL: {url}")
            return None
    except requests.exceptions.RequestException as e:
        print(f"Error fetching URL: {url}, {e}")
        return None

def main():
    playlist = ''
    for url in urls:
        content = fetch_m3u8_content(url)
        if content:
            playlist += content + '\n'
    if playlist:
        with open('playlist.m3u', 'w') as file:
            file.write(playlist)
        print('M3U playlist written to playlist.m3u')
    else:
        print('No M3U8 content found in any URLs.')

if __name__ == '__main__':
        main()
