from seleniumwire import webdriver
from selenium.webdriver.firefox.service import Service
from selenium.webdriver.firefox.options import Options
import time
import requests
import base64

# List of URLs to search for M3U8 links
urls = [
    'https://foothubhd.org/cdn3/linka.php'
]

# GitHub repository details
GITHUB_TOKEN = 'GITHUB_TOKEN'  # Replace with your GitHub token
GITHUB_REPO = 'qbasekostas/SportTV '  # Replace with your repository
GITHUB_BRANCH = 'main'  # Replace with the branch you want to upload to
GITHUB_FILE_PATH = 'playlist.m3u8'  # The path in the repository where the file will be saved

# Initialize the Firefox options
firefox_options = Options()
firefox_options.add_argument("--headless")  # Run in headless mode

# Path to the GeckoDriver
geckodriver_path = '/usr/local/bin/geckodriver'

# Initialize the WebDriver with the correct path to GeckoDriver
service = Service(geckodriver_path)
driver = webdriver.Firefox(service=service, options=firefox_options)

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
    return filename

# Function to upload the playlist file to GitHub
def upload_to_github(filename):
    with open(filename, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # Encode the content to base64
    encoded_content = base64.b64encode(content.encode()).decode()

    # GitHub API URL for creating or updating a file
    url = f"https://api.github.com/repos/{GITHUB_REPO}/contents/{GITHUB_FILE_PATH}"

    # Get the SHA of the existing file (if any)
    response = requests.get(url, headers={'Authorization': f'token {GITHUB_TOKEN}'})
    if response.status_code == 200:
        sha = response.json()['sha']
    else:
        sha = None

    # Create or update the file on GitHub
    data = {
        "message": "Update playlist.m3u8",
        "content": encoded_content,
        "branch": GITHUB_BRANCH
    }
    if sha:
        data["sha"] = sha
    
    response = requests.put(url, json=data, headers={'Authorization': f'token {GITHUB_TOKEN}'})
    
    if response.status_code in [200, 201]:
        print(f"File '{filename}' successfully uploaded to GitHub.")
    else:
        print(f"Failed to upload file to GitHub: {response.status_code}, {response.text}")

# Main function to search all URLs and create a playlist
def main():
    all_m3u8_links = []
    for url in urls:
        print(f"Searching M3U8 links in: {url}")
        m3u8_links = find_m3u8_links(url)
        all_m3u8_links.extend(m3u8_links)
    
    if all_m3u8_links:
        filename = create_playlist(all_m3u8_links)
        upload_to_github(filename)
    else:
        print("No M3U8 links found.")

    # Close the WebDriver
    driver.quit()

if __name__ == '__main__':
    main()
