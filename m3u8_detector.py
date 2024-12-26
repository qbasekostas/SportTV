import requests
import m3u8
import os

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

def fetch_and_download_m3u8(url):
    try:
        response = requests.get(url)
        response.raise_for_status()  # Check if the request was successful
        print(f"Fetching URL: {url}")
        if '#EXTM3U' in response.text:
            print(f"M3U8 content found for URL: {url}")
            m3u8_obj = m3u8.loads(response.text)
            download_segments(m3u8_obj)
        else:
            print(f"No M3U8 content found for URL: {url}")
    except requests.exceptions.RequestException as e:
        print(f"Error fetching URL: {url}, {e}")

def download_segments(m3u8_obj):
    base_uri = m3u8_obj.base_uri
    for segment in m3u8_obj.segments:
        segment_url = segment.uri if segment.uri.startswith('http') else base_uri + segment.uri
        download_segment(segment_url)

def download_segment(url):
    try:
        response = requests.get(url, stream=True)
        response.raise_for_status()
        filename = os.path.basename(url)
        with open(filename, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        print(f"Downloaded segment: {filename}")
    except requests.exceptions.RequestException as e:
        print(f"Error downloading segment: {url}, {e}")

def main():
    for url in urls:
        fetch_and_download_m3u8(url)

if __name__ == '__main__':
    main()
