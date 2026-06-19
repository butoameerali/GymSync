const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  page.on('console', msg => {
    console.log(`PAGE LOG [${msg.type()}]:`, msg.text());
  });
  
  page.on('pageerror', error => {
    console.log('PAGE ERROR:', error.message);
  });

  page.on('requestfailed', request => {
    console.log(`REQUEST FAILED: ${request.url()} - ${request.failure()?.errorText}`);
  });

  console.log("Navigating to http://localhost:5173 ...");
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  
  console.log("Navigation complete. Waiting 2 seconds...");
  await new Promise(r => setTimeout(r, 2000));
  
  await browser.close();
})();
