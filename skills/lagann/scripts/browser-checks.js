// Lagann browser-checks: a quick objective sweep of the rendered page.
// Paste the whole file into the browser pane's javascript_tool (or a DevTools console) on the page under
// test. It returns one JSON object. It reads the page; it changes nothing. Console errors are not
// visible from here: read them with read_console_messages.
await (async () => {
  const vw = innerWidth, vh = innerHeight;
  const visible = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity !== 0; };
  const sel = (el) => { if (el.id) return '#' + el.id; const c = [...el.classList].slice(0, 2).join('.'); return el.tagName.toLowerCase() + (c ? '.' + c : ''); };
  const text = (el) => (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 50);

  // colour parsing through canvas, so oklch/lab/color-mix resolve to sRGB
  const cv = document.createElement('canvas'); cv.width = cv.height = 1; const cx = cv.getContext('2d', { willReadFrequently: true });
  const rgba = (c) => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1); const [r, g, b, a] = cx.getImageData(0, 0, 1, 1).data; return [r, g, b, a / 255]; };
  const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const blend = (fg, bg) => [0, 1, 2].map((i) => fg[i] * fg[3] + bg[i] * (1 - fg[3]));
  const bgOf = (el) => { for (let n = el; n; n = n.parentElement) { const s = getComputedStyle(n); if (s.backgroundImage !== 'none') return null; const c = rgba(s.backgroundColor); if (c[3] > 0.95) return c; } return [255, 255, 255, 1]; };

  // overflow
  const overflowPx = document.documentElement.scrollWidth - vw;
  const overflowCulprits = overflowPx > 1 ? [...document.querySelectorAll('body *')].filter((el) => visible(el) && el.getBoundingClientRect().right > vw + 1).slice(0, 6).map(sel) : [];

  // names and labels
  const nameOf = (el) => (el.getAttribute('aria-label') || '').trim()
    || (el.getAttribute('aria-labelledby') || '').split(/\s+/).map((id) => document.getElementById(id)?.textContent || '').join(' ').trim()
    || (el.labels && [...el.labels].map((l) => l.textContent).join(' ').trim()) || text(el)
    || el.getAttribute('title') || el.querySelector('img[alt]')?.getAttribute('alt') || (el.type === 'submit' || el.type === 'button' ? el.value : '');
  const controls = [...document.querySelectorAll('button, a[href], [role="button"], [role="link"], input:not([type="hidden"]), select, textarea, summary')].filter(visible);
  const unnamed = controls.filter((el) => !nameOf(el)).slice(0, 10).map(sel);
  const placeholderOnly = [...document.querySelectorAll('input, textarea')].filter((el) => visible(el) && el.placeholder && !(el.labels?.length) && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby')).map(sel).slice(0, 8);
  const smallTargets = controls.filter((el) => { const r = (el.labels?.[0] || el).getBoundingClientRect(); const inline = el.tagName === 'A' && getComputedStyle(el).display === 'inline' && el.closest('p, li'); return !inline && (r.width < 24 || r.height < 24); }).slice(0, 10).map((el) => { const r = (el.labels?.[0] || el).getBoundingClientRect(); return `${sel(el)} ${Math.round(r.width)}×${Math.round(r.height)}`; });
  const positiveTabindex = [...document.querySelectorAll('[tabindex]')].filter((el) => +el.getAttribute('tabindex') > 0).map(sel).slice(0, 6);
  const blankTargets = [...document.querySelectorAll('a[target="_blank"]')].filter((a) => a.host && a.host !== location.host && !/noopener|noreferrer/.test(a.rel)).map((a) => a.href).slice(0, 6);
  const deadLinks = [...document.querySelectorAll('a[href="#"], a[href=""]')].filter(visible).map((a) => text(a) || sel(a)).slice(0, 8);

  // images
  const imgs = [...document.images];
  const noAlt = imgs.filter((i) => !i.hasAttribute('alt')).map((i) => i.currentSrc.split('/').pop()).slice(0, 8);
  const broken = imgs.filter((i) => i.complete && i.naturalWidth === 0 && i.currentSrc).map((i) => i.currentSrc).slice(0, 8);
  const unsized = imgs.filter((i) => !i.getAttribute('width') && !i.getAttribute('height') && !getComputedStyle(i).aspectRatio.includes('/')).length;

  // structure
  const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(visible).map((h) => +h.tagName[1]);
  const skips = headings.filter((l, i) => i && l > headings[i - 1] + 1).length;
  const landmarks = Object.fromEntries(['main', 'nav', 'header', 'footer'].map((t) => [t, document.querySelectorAll(`${t}, [role="${t === 'header' ? 'banner' : t === 'footer' ? 'contentinfo' : t === 'nav' ? 'navigation' : 'main'}"]`).length]));

  // contrast sample: visible elements that own text directly
  const textEls = [...document.querySelectorAll('body *')].filter((el) => visible(el) && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1)).slice(0, 600);
  const lowContrast = [];
  for (const el of textEls) {
    const s = getComputedStyle(el); const bg = bgOf(el); if (!bg) continue;
    const fg = blend(rgba(s.color), bg); const L1 = lum(fg), L2 = lum(bg);
    const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const size = parseFloat(s.fontSize), bold = +s.fontWeight >= 700;
    const need = size >= 24 || (bold && size >= 18.66) ? 3 : 4.5;
    if (ratio < need) lowContrast.push(`"${text(el)}" ${ratio.toFixed(2)}:1 (needs ${need}) ${sel(el)}`);
    if (lowContrast.length >= 10) break;
  }
  const tinyText = textEls.filter((el) => parseFloat(getComputedStyle(el).fontSize) < 12).slice(0, 6).map((el) => `"${text(el)}" ${getComputedStyle(el).fontSize}`);

  // motion and fonts
  let reducedRules = 0; for (const sh of document.styleSheets) { try { for (const r of sh.cssRules) if (r.conditionText?.includes('prefers-reduced-motion') || r.media?.mediaText?.includes('prefers-reduced-motion')) reducedRules++; } catch {} }
  await document.fonts.ready;
  const fontsLoaded = [...new Set([...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/"/g, '')))];

  // performance (buffered entries; local numbers are optimistic)
  const entries = (type) => new Promise((res) => { try { const po = new PerformanceObserver(() => {}); po.observe({ type, buffered: true }); setTimeout(() => { res(po.takeRecords()); po.disconnect(); }, 50); } catch { res([]); } });
  const lcpE = await entries('largest-contentful-paint'); const clsE = await entries('layout-shift');
  const nav = performance.getEntriesByType('navigation')[0];

  const meta = (n) => document.querySelector(`meta[name="${n}"], meta[property="${n}"]`)?.content || null;
  return {
    url: location.href, viewport: `${vw}×${vh}`,
    layout: { horizontalOverflowPx: Math.max(0, overflowPx), overflowCulprits },
    a11y: { lang: document.documentElement.lang || null, unnamedControls: unnamed, placeholderOnlyFields: placeholderOnly, smallTargets, positiveTabindex, imagesWithoutAlt: noAlt, h1Count: headings.filter((l) => l === 1).length, headingLevelSkips: skips, landmarks, lowContrast, textUnder12px: tinyText, reducedMotionRules: reducedRules, prefersReducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches },
    content: { brokenImages: broken, imagesWithoutSize: unsized, deadLinks, externalBlankWithoutNoopener: blankTargets, fontsLoaded },
    performance: { lcpMs: lcpE.length ? Math.round(lcpE.at(-1).startTime) : null, lcpElement: lcpE.length && lcpE.at(-1).element ? sel(lcpE.at(-1).element) : null, cls: +clsE.filter((e) => !e.hadRecentInput).reduce((a, e) => a + e.value, 0).toFixed(3), domContentLoadedMs: nav ? Math.round(nav.domContentLoadedEventEnd) : null, loadMs: nav ? Math.round(nav.loadEventEnd) : null, resources: performance.getEntriesByType('resource').length },
    meta: { title: document.title || null, description: meta('description'), ogImage: meta('og:image'), canonical: document.querySelector('link[rel="canonical"]')?.href || null, viewportMeta: meta('viewport'), favicon: !!document.querySelector('link[rel~="icon"]') },
  };
})();
