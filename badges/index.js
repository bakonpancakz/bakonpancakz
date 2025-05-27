const puppeteer = require("puppeteer")
const badges = require("./manifest_badges.json")
const socials = require("./manifest_socials.json")
const { readFileSync, mkdirSync } = require("fs")

mkdirSync("generated", { recursive: true })
const templateBadge = readFileSync("template_badge.html", "utf8")
const templateSocial = readFileSync("template_social.html", "utf8");

(async () => {
    const browser = await puppeteer.launch()
    const page = await browser.newPage()


    for (const entry of badges) {
        // Render Webpage
        const [id, label, color] = entry.split("|").map(e => e.trim())
        const icon = readFileSync(`assets/${id}.svg`, "base64")
        const html = templateBadge
            .replaceAll("{{color}}", color)
            .replaceAll("{{label}}", label)
            .replaceAll("{{image}}", `data:image/svg+xml;base64,` + icon)
        await page.setContent(html)

        // Capture Node
        const element = await page.$("div.badge")
        if (!element) throw "HTML Element Not Found"
        await element.screenshot({ path: `generated/badge_${id}.png` })
        console.log("Generated Badge:", label)
    }

    for (const entry of socials) {
        // Render Webpage
        const [id, label, color] = entry.split("|").map(e => e.trim())
        const icon = readFileSync(`assets/${id}.svg`, "base64")
        const html = templateSocial
            .replaceAll("{{color}}", color)
            .replaceAll("{{label}}", label)
            .replaceAll("{{image}}", `data:image/svg+xml;base64,` + icon)
        await page.setContent(html)

        // Capture Node
        const element = await page.$("div.social")
        if (!element) throw "HTML Element Not Found"
        await element.screenshot({ path: `generated/social_${id}.png` })
        console.log("Generated Social:", label)
    }


    await browser.close()
})();