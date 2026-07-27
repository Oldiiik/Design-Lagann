import path from "node:path";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { slugify, writeJson } from "../../shared/src/index.mjs";

export const DEFAULT_VIEWPORTS = {
  desktop: { width: 1440, height: 1000 },
  tablet: { width: 1024, height: 900 },
  mobile: { width: 390, height: 844 }
};

async function loadPlaywright() {
  if (process.env.DESIGN_LAGANN_PLAYWRIGHT_PATH) {
    return import(pathToFileURL(path.resolve(process.env.DESIGN_LAGANN_PLAYWRIGHT_PATH)).href);
  }
  for (const packageName of ["playwright", "playwright-core"]) {
    try {
      return await import(packageName);
    } catch (error) {
      if (error?.code !== "ERR_MODULE_NOT_FOUND") throw error;
    }
  }
  throw new Error("Playwright is not resolvable. Install `playwright` in the Design Lagann plugin before using capture.");
}

function systemBrowserExecutable() {
  const configured = process.env.DESIGN_LAGANN_BROWSER_EXECUTABLE;
  if (configured) return configured;
  const candidates = process.platform === "win32"
    ? [
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
        "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
      ]
    : process.platform === "darwin"
      ? ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"]
      : ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/microsoft-edge"];
  return candidates.find(existsSync) || null;
}

export async function captureUrl({ url, outDir, viewports = DEFAULT_VIEWPORTS, id }) {
  const { chromium } = await loadPlaywright();
  const executablePath = systemBrowserExecutable();
  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {})
  });
  const referenceId = slugify(id || new URL(url).hostname);
  const destination = path.resolve(outDir, referenceId);
  await mkdir(destination, { recursive: true });
  const captures = [];
  try {
    const captured = await Promise.all(Object.entries(viewports).map(async ([name, viewport]) => {
      const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
      const consoleErrors = [];
      const pageErrors = [];
      const failedRequests = [];
      const svgNetworkRequests = [];
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text().slice(0, 500));
      });
      page.on("pageerror", (error) => pageErrors.push(error.message.slice(0, 500)));
      page.on("requestfailed", (request) => {
        failedRequests.push({
          url: request.url(),
          resourceType: request.resourceType(),
          error: request.failure()?.errorText || "request failed"
        });
      });
      page.on("request", (request) => {
        if (/\.svg(?:[?#]|$)/i.test(request.url())) {
          svgNetworkRequests.push({
            url: request.url(),
            resourceType: request.resourceType(),
            signal: "svg-url"
          });
        }
      });
      page.on("response", (response) => {
        const contentType = response.headers()["content-type"] || "";
        if (/image\/svg\+xml/i.test(contentType)) {
          svgNetworkRequests.push({
            url: response.url(),
            status: response.status(),
            contentType,
            signal: "svg-mime"
          });
        }
      });
      await page.goto(url, { waitUntil: "networkidle", timeout: 45_000 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.evaluate(async () => {
        if (!document.fonts?.ready) return;
        await Promise.race([
          document.fonts.ready,
          new Promise((resolve) => setTimeout(resolve, 8_000))
        ]);
      });
      const screenshot = path.join(destination, `${name}.png`);
      await page.screenshot({ path: screenshot, fullPage: true });
      const evidence = await page.evaluate(() => {
        const textLineCount = (element) => {
          try {
            const range = document.createRange();
            range.selectNodeContents(element);
            const lines = new Set(
              [...range.getClientRects()]
                .filter((rect) => rect.width > 0 && rect.height > 0)
                .map((rect) => Math.round(rect.top * 2) / 2)
            );
            return lines.size;
          } catch {
            return null;
          }
        };
        const elements = [...document.querySelectorAll("body *")].slice(0, 600);
        const styles = elements.map((element) => {
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          const text = (element.textContent || "").replace(/\s+/g, " ").trim().slice(0, 160);
          return {
            tag: element.tagName.toLowerCase(),
            id: element.id || null,
            classes: [...element.classList].slice(0, 6),
            text,
            color: style.color,
            backgroundColor: style.backgroundColor,
            fontFamily: style.fontFamily,
            fontSize: style.fontSize,
            fontWeight: style.fontWeight,
            fontStyle: style.fontStyle,
            fontStretch: style.fontStretch,
            fontOpticalSizing: style.fontOpticalSizing,
            fontVariationSettings: style.fontVariationSettings,
            fontFeatureSettings: style.fontFeatureSettings,
            fontSynthesis: style.fontSynthesis,
            lineHeight: style.lineHeight,
            letterSpacing: style.letterSpacing,
            textTransform: style.textTransform,
            borderRadius: style.borderRadius,
            borderColor: style.borderColor,
            boxShadow: style.boxShadow,
            display: style.display,
            gap: style.gap,
            position: style.position,
            objectFit: style.objectFit,
            overflowX: style.overflowX,
            x: Math.round(rect.left + window.scrollX),
            y: Math.round(rect.top + window.scrollY),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            visible: rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none"
          };
        });
        const describe = (element) => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return {
            tag: element.tagName.toLowerCase(),
            id: element.id || null,
            classes: [...element.classList].slice(0, 6),
            text: (element.textContent || "").replace(/\s+/g, " ").trim().slice(0, 220),
            x: Math.round(rect.left + window.scrollX),
            y: Math.round(rect.top + window.scrollY),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            display: style.display,
            gridColumns: style.gridTemplateColumns,
            flexDirection: style.flexDirection,
            backgroundColor: style.backgroundColor,
            color: style.color,
            fontSize: style.fontSize,
            fontWeight: style.fontWeight,
            fontFamily: style.fontFamily,
            fontStyle: style.fontStyle,
            fontStretch: style.fontStretch,
            fontOpticalSizing: style.fontOpticalSizing,
            fontVariationSettings: style.fontVariationSettings,
            fontFeatureSettings: style.fontFeatureSettings,
            fontSynthesis: style.fontSynthesis,
            lineHeight: style.lineHeight,
            letterSpacing: style.letterSpacing,
            textTransform: style.textTransform,
            lineCount: textLineCount(element)
          };
        };
        const sections = [...document.querySelectorAll("main > section, main > article, body > section, [data-section]")]
          .filter((element) => element.getBoundingClientRect().height > 40)
          .slice(0, 40)
          .map((element, index) => ({ index, ...describe(element) }));
        const headings = [...document.querySelectorAll("h1,h2,h3")]
          .filter((element) => element.getBoundingClientRect().height > 0)
          .slice(0, 60)
          .map(describe);
        const typeRoleSelectors = {
          display: "[data-type-role='display'], h1, [role='heading'][aria-level='1']",
          body: "[data-type-role='body'], main p, article p, p",
          utility: "[data-type-role='utility'], nav a, button, label, .eyebrow, .kicker",
          data: "[data-type-role='data'], time, data, .price, [class*='price'], [class*='date'], [class*='stat']"
        };
        const roleTypography = Object.fromEntries(
          Object.entries(typeRoleSelectors).map(([role, selector]) => {
            const candidates = [...document.querySelectorAll(selector)]
              .filter((element) => {
                const rect = element.getBoundingClientRect();
                const style = getComputedStyle(element);
                return rect.width > 0
                  && rect.height > 0
                  && style.display !== "none"
                  && style.visibility !== "hidden"
                  && (element.textContent || "").trim();
              });
            const explicit = candidates.find((element) =>
              element.getAttribute("data-type-role") === role
            );
            const selected = explicit || candidates[0] || null;
            return [role, selected ? describe(selected) : null];
          })
        );
        const images = [...document.querySelectorAll("img,picture,video,canvas")]
          .filter((element) => element.getBoundingClientRect().height > 20)
          .slice(0, 80)
          .map(describe);
        const inlineSvg = [...document.querySelectorAll("svg")].slice(0, 40).map(describe);
        const svgReferences = [...document.querySelectorAll("img,source,object,embed,use,image")]
          .flatMap((element) => ["src", "srcset", "href", "data", "xlink:href"]
            .map((attribute) => ({
              tag: element.tagName.toLowerCase(),
              attribute,
              value: element.getAttribute(attribute)
            }))
            .filter((entry) => /(?:\.svg(?:[?#]|$)|data:image\/svg\+xml)/i.test(String(entry.value || ""))))
          .slice(0, 40);
        const svgComputedStyles = elements
          .map((element) => {
            const style = getComputedStyle(element);
            return {
              tag: element.tagName.toLowerCase(),
              id: element.id || null,
              classes: [...element.classList].slice(0, 4),
              values: [style.backgroundImage, style.maskImage, style.borderImageSource, style.content]
                .filter((value) => /(?:\.svg(?:[?#"'()]|$)|data:image\/svg\+xml)/i.test(String(value || "")))
            };
          })
          .filter((entry) => entry.values.length)
          .slice(0, 40);
        const loadedFonts = document.fonts
          ? [...document.fonts].slice(0, 80).map((face) => ({
              family: face.family,
              status: face.status,
              weight: face.weight,
              style: face.style,
              stretch: face.stretch,
              unicodeRange: face.unicodeRange
            }))
          : [];
        const fontChecks = document.fonts
          ? Object.fromEntries([...new Set(
              loadedFonts
                .map((face) => String(face.family || "").replace(/^["']|["']$/g, "").trim())
                .filter(Boolean)
            )].map((family) => [
              family,
              document.fonts.check(`16px "${family.replaceAll('"', '\\"')}"`)
            ]))
          : {};
        const unnamedInteractive = [...document.querySelectorAll("button,a[href],input,select,textarea,[role=button]")]
          .filter((element) => {
            const label = element.getAttribute("aria-label") ||
              element.getAttribute("title") ||
              element.labels?.[0]?.textContent ||
              element.textContent ||
              element.getAttribute("alt") ||
              element.getAttribute("placeholder");
            return !String(label || "").trim();
          })
          .slice(0, 30)
          .map((element) => ({
            tag: element.tagName.toLowerCase(),
            id: element.id || null,
            classes: [...element.classList].slice(0, 4)
          }));
        const missingAlt = [...document.querySelectorAll("img:not([alt])")]
          .slice(0, 30)
          .map((element) => element.currentSrc || element.src || "img");
        const ids = [...document.querySelectorAll("[id]")].map((element) => element.id);
        const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))].slice(0, 30);
        return {
          title: document.title,
          language: document.documentElement.lang || null,
          landmarks: {
            headings: document.querySelectorAll("h1,h2,h3,h4,h5,h6").length,
            links: document.querySelectorAll("a").length,
            buttons: document.querySelectorAll("button,[role=button]").length,
            sections: document.querySelectorAll("main,section,article").length
          },
          scroll: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
          viewport: { width: window.innerWidth, height: window.innerHeight },
          sections,
          headings,
          images,
          typography: {
            fontSetStatus: document.fonts?.status || "unsupported",
            loadedFonts,
            fontChecks,
            roleTypography,
            headingLineCounts: headings.map((heading) => ({
              tag: heading.tag,
              id: heading.id,
              text: heading.text,
              lineCount: heading.lineCount,
              width: heading.width,
              fontFamily: heading.fontFamily,
              fontSize: heading.fontSize,
              lineHeight: heading.lineHeight,
              letterSpacing: heading.letterSpacing
            }))
          },
          prohibitedSvg: {
            inline: inlineSvg,
            references: svgReferences,
            computedStyles: svgComputedStyles,
            total: inlineSvg.length + svgReferences.length + svgComputedStyles.length
          },
          styles,
          accessibility: { unnamedInteractive, missingAlt, duplicateIds }
        };
      });
      evidence.runtime = { consoleErrors, pageErrors, failedRequests };
      evidence.prohibitedSvg.network = svgNetworkRequests;
      evidence.prohibitedSvg.total += svgNetworkRequests.length;
      await page.close();
      return { name, viewport, screenshot, evidence, capturedAt: new Date().toISOString() };
    }));
    captures.push(...captured);
  } finally {
    await browser.close();
  }
  const manifest = { version: "0.4.0", id: referenceId, url, captures };
  await writeJson(path.join(destination, "capture.json"), manifest);
  return manifest;
}

export async function captureRegions({
  url,
  outDir,
  regions,
  viewport = DEFAULT_VIEWPORTS.mobile,
  id = "regional-review"
}) {
  if (!Array.isArray(regions) || !regions.length) {
    throw new Error("captureRegions requires at least one selector-bound region");
  }
  const { chromium } = await loadPlaywright();
  const executablePath = systemBrowserExecutable();
  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {})
  });
  const destination = path.resolve(outDir, slugify(id));
  await mkdir(destination, { recursive: true });
  try {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: "networkidle", timeout: 45_000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const fullScreenshot = path.join(destination, "full-page.png");
    await page.screenshot({ path: fullScreenshot, fullPage: true });
    const fullSha256 = createHash("sha256")
      .update(await readFile(fullScreenshot))
      .digest("hex");
    const documentSize = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight
    }));
    const captures = [];
    for (const [index, region] of regions.entries()) {
      const selector = String(region?.selector || "").trim();
      if (!selector) throw new Error(`regions[${index}].selector is required`);
      const locator = page.locator(selector);
      const count = await locator.count();
      if (count !== 1) {
        throw new Error(`${selector} must resolve to exactly one element; found ${count}`);
      }
      const box = await locator.boundingBox();
      if (!box || box.width < 1 || box.height < 1) {
        throw new Error(`${selector} does not have a capturable bounding box`);
      }
      const suppliedPadding = Number(region.padding ?? 24);
      if (!Number.isFinite(suppliedPadding)) {
        throw new Error(`regions[${index}].padding must be a finite number`);
      }
      const padding = Math.max(0, Math.min(160, suppliedPadding));
      const clip = {
        x: Math.max(0, Math.floor(box.x - padding)),
        y: Math.max(0, Math.floor(box.y - padding)),
        width: 0,
        height: 0
      };
      clip.width = Math.max(
        1,
        Math.min(documentSize.width - clip.x, Math.ceil(box.width + padding * 2))
      );
      clip.height = Math.max(
        1,
        Math.min(documentSize.height - clip.y, Math.ceil(box.height + padding * 2))
      );
      const regionId = slugify(region.id || selector || `region-${index + 1}`);
      const screenshot = path.join(destination, `${regionId}.png`);
      await page.screenshot({ path: screenshot, clip });
      const sha256 = createHash("sha256")
        .update(await readFile(screenshot))
        .digest("hex");
      captures.push({
        id: regionId,
        selector,
        viewport,
        elementBounds: {
          x: Math.round(box.x),
          y: Math.round(box.y),
          width: Math.round(box.width),
          height: Math.round(box.height)
        },
        padding,
        clip,
        screenshot,
        sha256,
        fullScreenshotSha256: fullSha256
      });
    }
    await page.close();
    const manifest = {
      version: "0.5.0",
      id: slugify(id),
      url,
      viewport,
      fullScreenshot: {
        path: fullScreenshot,
        sha256: fullSha256,
        documentSize
      },
      captures,
      acceptanceBoundary: "Region crops support bounded diagnosis and repair. Final acceptance still requires fresh full-page desktop, tablet, and mobile evidence."
    };
    await writeJson(path.join(destination, "regions.json"), manifest);
    return manifest;
  } finally {
    await browser.close();
  }
}
