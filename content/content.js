(() => {
  const YT_URL_RE =
    /(?:(?:https?:)?\/\/)?(?:www\.)?(?:m\.|music\.)?(?:youtube\.com|youtu\.be)\/[^\s"'<>\\]+/gi;

  function decodeHtmlEntities(input) {
    // 把 &amp; 之类的实体解码回正常字符（避免影响 URL）
    const el = document.createElement("textarea");
    el.innerHTML = input;
    return el.value;
  }

  function normalizeMaybeUrl(raw, baseHref) {
    if (!raw) return null;
    let s = String(raw).trim();
    if (!s) return null;

    // 常见的脚本字符串转义：https:\/\/... 和 \u0026
    s = s.replace(/\\\//g, "/").replace(/\\u0026/gi, "&");
    s = decodeHtmlEntities(s);

    // 去掉尾随标点（常出现在 ) ] } . , ; 等之后）
    // 这里用循环尽量保守地剥离。
    while (/[)\]}.,;'"!?]+$/.test(s)) s = s.replace(/[)\]}.,;'"!?]+$/, "");

    // 处理协议相对 / 无协议
    if (s.startsWith("//")) s = `${location.protocol}${s}`;
    if (/^(youtube\.com|youtu\.be)\//i.test(s)) s = `https://${s}`;

    // 有些页面会把 URL 放到 href/src 里但包含空格（极少见），这里直接过滤
    if (/\s/.test(s)) return null;

    try {
      // 绝对化 + 规范化
      const u = new URL(s, baseHref || location.href);
      // 只保留 YouTube 域名族
      if (!/(^|\.)youtube\.com$/i.test(u.hostname) && !/(^|\.)youtu\.be$/i.test(u.hostname)) {
        return null;
      }
      return u.href;
    } catch {
      return null;
    }
  }

  function isLikelyYouTubeUrl(url) {
    if (!url) return false;
    try {
      const u = new URL(url);
      return (
        /(^|\.)youtube\.com$/i.test(u.hostname) ||
        /(^|\.)youtu\.be$/i.test(u.hostname)
      );
    } catch {
      return false;
    }
  }

  function pickLabelFromAnchor(a) {
    const text = (a.textContent || "").replace(/\s+/g, " ").trim();
    if (text) return text;
    const title = (a.getAttribute("title") || "").trim();
    if (title) return title;
    const aria = (a.getAttribute("aria-label") || "").trim();
    if (aria) return aria;
    return "";
  }

  function extractFromAnchors() {
    const results = [];
    const anchors = document.querySelectorAll("a[href]");
    for (const a of anchors) {
      const href = a.getAttribute("href");
      const normalized = normalizeMaybeUrl(href, location.href);
      if (!normalized) continue;
      if (!isLikelyYouTubeUrl(normalized)) continue;
      results.push({ url: normalized, label: pickLabelFromAnchor(a) });
    }
    return results;
  }

  function extractFromSourceText() {
    const html = document.documentElement ? document.documentElement.outerHTML : "";
    if (!html) return [];

    // 先做一遍轻量清洗，减少漏匹配
    const source = decodeHtmlEntities(html)
      .replace(/\\\//g, "/")
      .replace(/\\u0026/gi, "&");

    const matches = source.match(YT_URL_RE) || [];
    const out = [];
    for (const m of matches) {
      const normalized = normalizeMaybeUrl(m, location.href);
      if (!normalized) continue;
      out.push({ url: normalized, label: "" });
    }
    return out;
  }

  function mergeAndDedupe(items) {
    // Map<url, {url,label}>
    const map = new Map();
    for (const it of items) {
      if (!it || !it.url) continue;
      const url = it.url;
      const label = (it.label || "").trim();
      if (!map.has(url)) {
        map.set(url, { url, label });
      } else if (label && !map.get(url).label) {
        map.get(url).label = label;
      }
    }
    return [...map.values()].map((x) => ({
      url: x.url,
      label: x.label || x.url
    }));
  }

  async function extractYouTubeUrls() {
    const fromAnchors = extractFromAnchors();
    const fromSource = extractFromSourceText();
    return mergeAndDedupe([...fromAnchors, ...fromSource]);
  }

  // popup -> content script
  browser.runtime.onMessage.addListener((msg) => {
    if (!msg || msg.type !== "extract_youtube_urls") return;
    return extractYouTubeUrls();
  });
})();


