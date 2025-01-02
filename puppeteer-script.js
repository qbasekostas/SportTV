const puppeteer = require('puppeteer'); // Εισαγωγή του Puppeteer
const fs = require('fs'); // Εισαγωγή του File System module

(async () => {
  const targetUrls = [
    "https://foothubhd.org/greekchannels/mega.html",
    "https://foothubhd.org/greekchannels/ant1.html",
    "https://foothubhd.org/greekchannels/alphatv.html"
  ]; // Λίστα με τις URLs που θα επισκεφτούμε

  const m3u8Urls = []; // Πίνακας για αποθήκευση των m3u8 URLs που θα βρεθούν

  console.log("\x1b[34mStarting Puppeteer...\x1b[0m"); // Μήνυμα εκκίνησης Puppeteer

  const browser = await puppeteer.launch({ headless: true }); // Εκκίνηση του Puppeteer σε headless mode

  for (const targetUrl of targetUrls) { // Επανάληψη για κάθε URL στη λίστα
    const page = await browser.newPage(); // Δημιουργία νέας καρτέλας

    // Ενεργοποίηση του DevTools Protocol
    const client = await page.target().createCDPSession();
    await client.send('Network.enable'); // Ενεργοποίηση της παρακολούθησης δικτυακών αιτημάτων

    client.on('Network.responseReceived', async (params) => { // Συμβάν για κάθε απάντηση δικτυακού αιτήματος
      const url = params.response.url; // Λήψη της URL της απάντησης
      const status = params.response.status; // Λήψη του κωδικού κατάστασης της απάντησης
      const contentType = params.response.headers['content-type']; // Λήψη του τύπου περιεχομένου της απάντησης
      console.log(`\x1b[34mNetwork response: URL: ${url}, Status: ${status}, Content-Type: ${contentType}\x1b[0m`); // Καταγραφή της απάντησης
      if (url.endsWith('.m3u8')) { // Έλεγχος αν η URL τελειώνει σε .m3u8
        m3u8Urls.push(url); // Προσθήκη της URL στον πίνακα
        console.log("\x1b[32mFound .m3u8 URL:\x1b[0m", url); // Μήνυμα εύρεσης URL
        console.log("\x1b[32mCurrent m3u8Urls array:\x1b[0m", m3u8Urls); // Καταγραφή του πίνακα με τις URLs
      }
    });

    try {
      console.log("\x1b[34mNavigating to page:\x1b[0m", targetUrl); // Μήνυμα πλοήγησης στη σελίδα
      await page.goto(targetUrl, { waitUntil: 'networkidle2' }); // Πλοήγηση στη σελίδα και αναμονή μέχρι να μην υπάρχουν ενεργά δίκτυα

      // Αναμονή για να εξασφαλιστεί ότι όλα τα δικτυακά αιτήματα θα ολοκληρωθούν
      await new Promise(resolve => setTimeout(resolve, 40000)); // Αναμονή για 40 δευτερόλεπτα
    } catch (error) {
      console.error("\x1b[31mError navigating to page:\x1b[0m", error); // Μήνυμα σφάλματος πλοήγησης στη σελίδα
    }

    await page.close(); // Κλείσιμο της καρτέλας
  }

  console.log("\x1b[34mAll network responses:\x1b[0m", m3u8Urls); // Καταγραφή όλων των απαντήσεων

  // Αποθήκευση των αποτελεσμάτων σε αρχείο για αναφορά
  if (m3u8Urls.length) {
    console.log(`\x1b[32m✅ Total .m3u8 URLs found: ${m3u8Urls.length}\x1b[0m`); // Μήνυμα επιτυχούς εύρεσης URLs
    fs.writeFileSync('playlist.m3u8', m3u8Urls.join('\n')); // Αποθήκευση των URLs σε αρχείο
  } else {
    console.log("\x1b[33m⚠️ No .m3u8 URL found.\x1b[0m"); // Μήνυμα μη εύρεσης URLs
    fs.writeFileSync('playlist.m3u8', 'No .m3u8 URL found.'); // Αποθήκευση μηνύματος σε αρχείο
  }

  await browser.close(); // Κλείσιμο του Puppeteer
})();
