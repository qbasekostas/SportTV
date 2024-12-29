from seleniumwire import webdriver  # Import from seleniumwire
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException
from webdriver_manager.chrome import ChromeDriverManager
import re
import time

# Λίστα URLs για αναζήτηση M3U8 συνδέσμων
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

# Αρχικοποίηση επιλογών Chrome
chrome_options = Options()
chrome_options.add_argument("--headless")  # Τρέχει σε headless mode για CI/CD
chrome_options.add_argument('--no-sandbox')
chrome_options.add_argument('--disable-dev-shm-usage')

# Αρχικοποίηση WebDriver χρησιμοποιώντας ChromeDriverManager με selenium-wire
driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)

# Συνάρτηση για εύρεση M3U8 συνδέσμων σε μια ιστοσελίδα χρησιμοποιώντας τις αιτήσεις δικτύου
def find_m3u8_links(url):
    print(f"Opening URL: {url}")
    driver.get(url)

    try:
        # Αναμονή για το στοιχείο body για να βεβαιωθούμε ότι η σελίδα έχει φορτώσει πλήρως
        WebDriverWait(driver, 30).until(EC.presence_of_element_located((By.TAG_NAME, 'body')))
        time.sleep(15)  # Πρόσθετη αναμονή για δυναμικά στοιχεία
    except TimeoutException:
        print(f"Timeout while waiting for page to load: {url}")
        return []

    m3u8_links = set()  # Χρησιμοποιούμε set για να αποθηκεύσουμε μοναδικούς συνδέσμους

    # Καταγραφή όλων των αιτήσεων δικτύου
    for request in driver.requests:
        if request.response:
            content_type = request.response.headers.get('Content-Type', '')
            print(f"Request URL: {request.url}")
            print(f"Method: {request.method}")
            print(f"Status Code: {request.response.status_code}")
            print(f"Content-Type: {content_type}")
            if '.m3u8' in request.url or 'application/vnd.apple.mpegurl' in content_type:
                referer = request.headers.get('Referer', 'N/A')
                stream_name = request.url.split('/')[-2]
                m3u8_links.add((stream_name, request.url, referer))
                print(f"Found M3U8 link: {request.url} with referer {referer}")

    if not m3u8_links:
        print("No M3U8 links found in network requests.")

    print(f"Found {len(m3u8_links)} unique M3U8 links.")
    return list(m3u8_links)

# Συνάρτηση για δημιουργία αρχείου playlist
def create_playlist(m3u8_links, filename='playlist.m3u8'):
    # Pattern για να αποκλείσουμε streams που ξεκινούν με "tracks-"
    exclude_pattern = re.compile(r'^tracks-')

    with open(filename, 'w', encoding='utf-8') as file:
        file.write("#EXTM3U\n")
        for stream_name, link, referer in m3u8_links:
            # Παραλείπουμε τα streams που ταιριάζουν με το pattern αποκλεισμού
            if exclude_pattern.match(stream_name):
                continue
            file.write(f"#EXTINF:-1,{stream_name}\n")
            file.write(f"#EXTVLCOPT:http-referrer={referer}\n")
            file.write(f"{link}\n")
    print(f"Playlist created: {filename}")

# Κύρια συνάρτηση για αναζήτηση όλων των URLs και δημιουργία playlist
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
        unique_m3u8_links = list(set(all_m3u8_links))
        create_playlist(unique_m3u8_links)
    else:
        print("No M3U8 links found.")

    driver.quit()

if __name__ == '__main__':
    main()
