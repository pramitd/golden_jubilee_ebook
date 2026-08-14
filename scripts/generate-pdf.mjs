import { chromium } from "playwright";
import { resolve } from "path";

const BASE_URL = "http://127.0.0.1:4173";
const PDF_URL = `${BASE_URL}/?pdf=1`;

const OUTPUT = resolve(
  "public/golden_jubilee_ebook.pdf"
);

console.log("========================================");
console.log("GENERATING GOLDEN JUBILEE PDF");
console.log("========================================");

const browser = await chromium.launch({
  headless: true
});

try {
  const page = await browser.newPage({
    viewport: {
      width: 1600,
      height: 1000
    },
    deviceScaleFactor: 1
  });

  console.log(`Opening: ${PDF_URL}`);

  await page.goto(PDF_URL, {
    waitUntil: "networkidle"
  });

  /*
   * Wait for the React PDF rendering to appear.
   */
  await page.waitForSelector(".pdf-export");

  /*
   * Give images/fonts a moment to finish loading.
   */
  await page.waitForTimeout(1000);

  /*
   * Ensure all images have completed.
   */
  await page.evaluate(async () => {
    const images = Array.from(document.images);

    await Promise.all(
      images.map(img => {
        if (img.complete) return Promise.resolve();

        return new Promise(resolve => {
          img.addEventListener("load", resolve, {
            once: true
          });

          img.addEventListener("error", resolve, {
            once: true
          });
        });
      })
    );
  });

  console.log("Rendering PDF...");

  await page.pdf({
    path: OUTPUT,

    /*
     * Our e-book is approximately 3:2 landscape.
     */
    width: "10in",
    height: "6.6667in",

    printBackground: true,

    margin: {
      top: "0",
      right: "0",
      bottom: "0",
      left: "0"
    },

    preferCSSPageSize: true
  });

  console.log("");
  console.log("PDF GENERATED SUCCESSFULLY");
  console.log(`Output: ${OUTPUT}`);
  console.log("========================================");

} finally {
  await browser.close();
}