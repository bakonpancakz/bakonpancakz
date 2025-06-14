// @ts-check
const { readFileSync, mkdirSync } = require("fs")
const puppeteer = require("puppeteer")
const template = readFileSync("template.html", "utf8")
const manifest = require("./manifest.json")

mkdirSync("generated", { recursive: true });

(async () => {
    const browser = await puppeteer.launch()
    const page = await browser.newPage()
    for (const entry of manifest) {
        // Render Webpage
        const [id, label, color] = entry.split("|").map(e => e.trim())
        const icon = readFileSync(`assets/${id}.svg`, "base64")
        const html = template
            .replaceAll("(color)", color)
            .replaceAll("(label)", label)
            .replaceAll("(image)", `data:image/svg+xml;base64,` + icon)
        await page.setContent(html)

        // Capture Node
        const element = await page.$("div")
        if (!element) throw "HTML Element Not Found"
        await element.screenshot({ path: `generated/${id}.png` })
        console.log("Generated Badge:", label)
    }
    await browser.close()
})();