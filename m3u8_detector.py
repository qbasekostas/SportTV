from seleniumwire import webdriver
from selenium.webdriver.firefox.service import Service
from selenium.webdriver.firefox.options import Options
from webdriver_manager.firefox import GeckoDriverManager

# URLs για έλεγχο
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

# Εκκίνηση WebDriver
driver = webdriver.Firefox(service=Service, options=firefox_options)

# Ρυθμίσεις Firefox
firefox_options = Options()
firefox_options.add_argument("--headless")  # Εκτέλεση σε headless mode

# Χρήση του GeckoDriverManager για αυτόματη διαχείριση του geckodriver
service = Service(GeckoDriverManager().install())
driver = webdriver.Firefox(service=Service, options=firefox_options)


def find_m3u8_links(url):
    print(f"Άνοιγμα URL: {url}")
    driver.get(url)

    # Περίμενε να φορτώσει πλήρως η σελίδα
    WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.TAG_NAME, "body")))
    time.sleep(5)  # Πρόσθετη καθυστέρηση για AJAX

    # Αναζήτηση για αρχεία M3U8 στα αιτήματα δικτύου
    m3u8_links = []
    for request in driver.requests:
        if request.response and '.m3u8' in request.url:
            referer = request.headers.get('Referer', 'N/A')
            m3u8_links.append((request.url, referer))

    if m3u8_links:
        print(f"Βρέθηκαν {len(m3u8_links)} σύνδεσμοι M3U8:")
        for link, referer in m3u8_links:
            print(f"URL: {link}, Referer: {referer}")
    else:
        print("Δεν βρέθηκαν σύνδεσμοι M3U8.")
    return m3u8_links

def create_playlist(m3u8_links, filename='playlist.m3u8'):
    with open(filename, 'w', encoding='utf-8') as file:
        file.write("#EXTM3U\n")
        for link, referer in m3u8_links:
            file.write(f"#EXTINF:-1,Stream\n")
            file.write(f"#EXTVLCOPT:http-referrer={referer}\n")
            file.write(f"{link}\n")
    print(f"Playlist δημιουργήθηκε: {filename}")

def main():
    all_m3u8_links = []
    for url in urls:
        m3u8_links = find_m3u8_links(url)
        all_m3u8_links.extend(m3u8_links)

    if all_m3u8_links:
        create_playlist(all_m3u8_links)
    else:
        print("Δεν βρέθηκαν σύνδεσμοι M3U8 σε καμία σελίδα.")

    driver.quit()

if __name__ == '__main__':
    main()
