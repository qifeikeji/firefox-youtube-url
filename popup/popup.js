const api = globalThis.browser || globalThis.chrome;

const statusEl = document.getElementById("status");
const listEl = document.getElementById("list");
const summaryEl = document.getElementById("summary");
const rescanBtn = document.getElementById("rescan");
const copyAllBtn = document.getElementById("copyAll");

function setStatus(text, kind) {
  statusEl.textContent = text;
  statusEl.classList.remove("error", "ok");
  if (kind) statusEl.classList.add(kind);
  statusEl.hidden = false;
  listEl.hidden = true;
}

function showList() {
  statusEl.hidden = true;
  listEl.hidden = false;
}

async function getActiveTab() {
  const tabs = await api.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

async function safeCopy(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // fallback（少数环境下 clipboard API 不可用）
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

function render(items) {
  listEl.innerHTML = "";

  summaryEl.textContent = items.length ? `共找到 ${items.length} 个链接` : "未找到链接";
  copyAllBtn.disabled = items.length === 0;

  for (const it of items) {
    const itemEl = document.createElement("section");
    itemEl.className = "item";

    const title = document.createElement("a");
    title.className = "itemTitle";
    title.href = it.url;
    title.target = "_blank";
    title.rel = "noreferrer";
    title.textContent = it.label || it.url;
    itemEl.appendChild(title);

    const row = document.createElement("div");
    row.className = "row";

    const pre = document.createElement("pre");
    pre.className = "code";
    const code = document.createElement("code");
    code.textContent = it.url;
    pre.appendChild(code);
    row.appendChild(pre);

    const copyBtn = document.createElement("button");
    copyBtn.className = "btn btn-secondary copyBtn";
    copyBtn.type = "button";
    copyBtn.textContent = "复制";
    copyBtn.addEventListener("click", async () => {
      const ok = await safeCopy(it.url);
      copyBtn.textContent = ok ? "已复制" : "复制失败";
      setTimeout(() => (copyBtn.textContent = "复制"), 900);
    });
    row.appendChild(copyBtn);

    itemEl.appendChild(row);
    listEl.appendChild(itemEl);
  }
}

async function scan() {
  setStatus("正在扫描当前页面…");
  summaryEl.textContent = "";
  copyAllBtn.disabled = true;

  let tab;
  try {
    tab = await getActiveTab();
  } catch {
    setStatus("无法获取当前标签页。", "error");
    return;
  }

  if (!tab || !tab.id) {
    setStatus("未找到可用的标签页。", "error");
    return;
  }

  try {
    const items = await api.tabs.sendMessage(tab.id, { type: "extract_youtube_urls" });
    if (!Array.isArray(items)) throw new Error("bad response");
    render(items);
    showList();
    if (items.length === 0) {
      setStatus("未在页面源码中找到 YouTube 链接。", "ok");
    }
  } catch (e) {
    // about: / moz-extension: / file: 等页面可能无法注入/访问
    setStatus("此页面无法访问（Firefox 限制或缺少权限）。请换一个普通网页重试。", "error");
  }
}

rescanBtn.addEventListener("click", scan);
copyAllBtn.addEventListener("click", async () => {
  const urls = [...listEl.querySelectorAll("pre.code code")].map((el) => el.textContent);
  const ok = await safeCopy(urls.join("\n"));
  setStatus(ok ? "已复制全部 URL（以换行分隔）。" : "复制失败。", ok ? "ok" : "error");
  setTimeout(scan, 650);
});

scan();


