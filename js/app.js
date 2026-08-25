/* ===== 应用主逻辑 =====
 * 流程：粘贴原文 → 智能清洗 → 结构解析 → 模板渲染 → 预览 → 一键复制（含 HTML 富文本）
 */
(function () {
  "use strict";
  var $ = function (s) { return document.querySelector(s); };
  var input = $("#input"), preview = $("#preview");
  var tplId = "nvidia";
  var blocks = [], lastHtml = "", lastPlain = "", lastCleaned = "", stale = false;
  var CFT_KEY = "cft_custom_color";
  /* 敏感词定位状态：当前词、预览内 mark 列表、当前定位序号 */
  var locState = { word: null, marks: [], cur: 0 };
  var checkBodyBound = false;

  /* 恢复用户保存过的自定义品牌色 */
  (function () {
    try {
      var saved = localStorage.getItem(CFT_KEY);
      if (saved && /^#[0-9a-f]{6}$/i.test(saved)) TEMPLATES.custom = buildCustomTemplate(saved);
    } catch (e) { /* 隐私模式等场景忽略 */ }
  })();

  var RAW_SAMPLE = [
    "NVIDIA 英伟达 | 加速一切计算的新纪元",
    "",
    "",
    "",
    "   ",
    "在生成式 AI 席卷全球的今天,算力已经成为比石油更稀缺的资源。作为 AI 计算领域的开拓者,NVIDIA 英伟达正在用一张张 GPU,为世界搭建通向未来的算力底座。",
    "",
    "",
    "# 从图形到智能:一场长达三十年的蓄力",
    "",
    "1993 年,三位工程师在加州的一间餐车咖啡馆里,写下了改变图形计算的第一行代码。三十年后,这家公司已经成为全球市值最高的半导体企业之一。",
    "",
    "**无论是自动驾驶、药物研发,还是大语言模型的每一次推理,背后都跳动着 NVIDIA 的算力核心。**",
    "",
    '> "我们不是在制造芯片,而是在制造能够理解世界的智能。"',
    "",
    "",
    "# 三大技术支柱,撑起 AI 时代",
    "",
    "- 加速计算平台:CUDA 生态与 RTX 系列",
    "- 全栈式 AI 平台:从训练到推理的一体化方案",
    "- 开放生态战略:与全球开发者共同进化",
    "",
    "",
    "## 给开发者的三个建议",
    "",
    "1. 先把 benchmark 跑起来,再谈优化",
    "2. 用 profiler 定位瓶颈,而不是靠猜",
    "3. 保持与 CUDA 社区同步,新特性往往意味着新机会",
    "",
    "",
    "",
    "---",
    "",
    "面向未来:让每个人都能参与 AI",
    "",
    "2025 年,NVIDIA 英伟达发布了新一代计算架构,把推理成本再降低一个数量级。",
    "",
    "这套架构在能效比上做到了行业顶级,是目前市场上最先进的推理方案,绝对是开发者的首选。",
    "",
    "未来已来,而我们才刚刚开始。欢迎持续关注 NVIDIA 英伟达官方账号,与我们一起见证智能时代的每一个瞬间!!",
    "",
    "文 | NVIDIA 英伟达  编辑 | 品牌市场部"
  ].join("\n");

  var SAMPLE_TEXT = [
    "NVIDIA 英伟达 | 加速一切计算的新纪元",
    "",
    "在生成式 AI 席卷全球的今天，算力已经成为比石油更稀缺的资源。作为 AI 计算领域的开拓者，NVIDIA 英伟达正在用一张张 GPU，为世界搭建通向未来的算力底座。",
    "",
    "# 从图形到智能：一场长达三十年的蓄力",
    "",
    "1993 年，三位工程师在加州的一间餐车咖啡馆里，写下了改变图形计算的第一行代码。三十年后，这家公司已经成为全球市值最高的半导体企业之一。",
    "",
    "**无论是自动驾驶、药物研发，还是大语言模型的每一次推理，背后都跳动着 NVIDIA 的算力核心。**",
    "",
    "> “我们不是在制造芯片，而是在制造能够理解世界的智能。”",
    "",
    "# 三大技术支柱，撑起 AI 时代",
    "",
    "- 加速计算平台：CUDA 生态与 RTX 系列",
    "- 全栈式 AI 平台：从训练到推理的一体化方案",
    "- 开放生态战略：与全球开发者共同进化",
    "",
    "## 给开发者的三个建议",
    "",
    "1. 先把 benchmark 跑起来，再谈优化",
    "2. 用 profiler 定位瓶颈，而不是靠猜",
    "3. 保持与 CUDA 社区同步，新特性往往意味着新机会",
    "",
    "---",
    "",
    "面向未来：让每个人都能参与 AI",
    "",
    "2025 年，NVIDIA 英伟达发布了新一代计算架构，把推理成本再降低一个数量级。",
    "",
    "这套架构在能效比上做到了行业顶级，是目前市场上最先进的推理方案，绝对是开发者的首选。",
    "",
    "未来已来，而我们才刚刚开始。欢迎持续关注 NVIDIA 英伟达官方账号，与我们一起见证智能时代的每一个瞬间！",
    "",
    "文｜NVIDIA 英伟达　编辑｜品牌市场部"
  ].join("\n");

  function tpl() { return TEMPLATES[tplId]; }

  /* 将 #RRGGBB 转为 rgba(r,g,b,a) */
  function hexToRgba(hex, alpha) {
    var h = hex.replace("#", "");
    if (h.length === 3) h = h.split("").map(function (c) { return c + c; }).join("");
    var n = parseInt(h, 16);
    return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + alpha + ")";
  }

  /* 同步模板品牌色到 CSS 变量（Logo、主按钮、步骤标、光晕等） */
  function updateThemeVars() {
    var t = tpl();
    var root = document.documentElement;
    root.style.setProperty("--accent", t.accent);
    root.style.setProperty("--accent-deep", t.accentDeep);
    root.style.setProperty("--accent-bg", t.quoteBg);
    root.style.setProperty("--accent-alpha", hexToRgba(t.accent, 0.28));
    root.style.setProperty("--accent-button-text", t.buttonText || "#FFFFFF");
  }

  /* ---------- 顶栏模板切换 ---------- */
  function renderTplPills() {
    var wrap = $("#tplPills");
    wrap.innerHTML = "";
    Object.keys(TEMPLATES).forEach(function (id) {
      var t = TEMPLATES[id];
      var b = document.createElement("button");
      var custom = id === "custom";
      b.className = "tpl-pill" + (custom ? " custom-pill" : "") + (id === tplId ? " active" : "");
      b.type = "button";
      b.innerHTML = '<i style="background:' + t.accent + '"></i>' + (custom ? "自定义" : t.name);
      b.title = t.desc;
      b.onclick = function () { setTemplate(id); };
      wrap.appendChild(b);
    });
  }

  function setTemplate(id) {
    tplId = id;
    var panel = $("#customPanel");
    if (panel) panel.hidden = id !== "custom";
    updateThemeVars();
    renderTplPills();
    updateSpec();
    if (blocks.length) renderPreview();
  }

  /* ---------- 自定义品牌配色 ---------- */
  function updateSwatches() {
    var t = TEMPLATES.custom;
    $("#cpSwA").style.background = t.accent;
    $("#cpSwD").style.background = t.accentDeep;
    $("#cpSwQ").style.background = t.quoteBg;
    var btn = $("#cpSwBtn");
    btn.style.background = t.accent;
    btn.style.color = t.buttonText;
    btn.textContent = "按钮文字 · 自动适配";
  }

  function applyCustomColor(hex) {
    var norm = String(hex || "").trim();
    if (norm.charAt(0) !== "#") norm = "#" + norm;
    if (norm.length === 4) norm = "#" + norm.slice(1).split("").map(function (c) { return c + c; }).join("");
    if (!/^#[0-9a-f]{6}$/i.test(norm)) { toast("色值格式不对，请输入 #RRGGBB 十六进制色"); return; }
    norm = norm.toUpperCase();
    TEMPLATES.custom = buildCustomTemplate(norm);
    try { localStorage.setItem(CFT_KEY, norm); } catch (e) { /* ignore */ }
    $("#cpColor").value = norm;
    $("#cpHex").value = norm;
    updateSwatches();
    setTemplate("custom");
    toast("自定义配色已应用，界面与预览同步更新");
  }

  /* ---------- 模板规格说明 ---------- */
  function updateSpec() {
    var t = tpl();
    var alignName = t.align === "justify" ? "两端对齐" : "左对齐";
    var chips = [
      { k: "标题 " + t.titleSize + "px · 加粗" },
      { k: "小标题 " + t.h2Size + "px · 品牌色竖条" },
      { k: "正文 " + t.bodySize + "px · 行距 " + t.lineHeight },
      { k: "字色 " + t.bodyColor },
      { k: "对齐 " + alignName },
      { k: "引文 " + t.quoteBg + "底 · 品牌色边" },
      { k: "重点强调 " + t.accentDeep },
      { k: "底色 " + t.bg }
    ];
    $("#specChips").innerHTML = chips.map(function (c) { return '<span class="chip k">' + c.k + "</span>"; }).join("");
    $("#tplMeta").textContent = t.name + " · 预览即复制内容";
  }

  /* ---------- 结构识别说明 ---------- */
  var TYPE_LABEL = { title: "标题", h2: "小标题", h3: "三级小标题", h4: "四级小标题", para: "正文", quote: "引文", callout: "重点强调", list: "列表", divider: "分隔线", caption: "文末注" };

  function renderStruct() {
    var counts = {};
    blocks.forEach(function (b) {
      var k = b.type === "list" ? "list" : b.type;
      counts[k] = (counts[k] || 0) + 1;
    });
    var html = Object.keys(counts)
      .filter(function (k) { return counts[k] > 0; })
      .map(function (k) { return '<span class="chip">' + (TYPE_LABEL[k] || k) + " ×" + counts[k] + "</span>"; })
      .join("");
    $("#structChips").innerHTML = html ? "自动识别：" + html : "";
  }

  /* ---------- 渲染预览（iframe srcdoc，内容与复制产物一致） ---------- */
  function renderPreview() {
    locState.word = null; locState.marks = []; locState.cur = 0;
    var doc = "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><style>html,body{margin:0;padding:0;background:#ffffff;}body{word-wrap:break-word;}</style></head><body>" + lastHtml + "</body></html>";
    preview.srcdoc = doc;
  }

  /* ---------- 敏感词定位：点击右侧检查项 → 预览内高亮 + 滚动 ---------- */
  function clearMarks() {
    var doc = preview.contentDocument;
    if (!doc) { locState.marks = []; return; }
    locState.marks.forEach(function (m) {
      if (m && m.parentNode) {
        var txt = doc.createTextNode(m.textContent);
        m.parentNode.replaceChild(txt, m);
      }
    });
    locState.marks = [];
  }

  function highlightWord(word) {
    var doc = preview.contentDocument;
    var marks = [];
    var walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, null);
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (n) {
      var idx = n.nodeValue.indexOf(word);
      while (idx !== -1) {
        var rest = n.splitText(idx);            // rest 从 word 处开始
        var tail = rest.splitText(word.length); // rest 只剩 word，tail 为剩余
        var mark = doc.createElement("mark");
        mark.style.cssText = "background:#FFE082;color:#4E342E;border-radius:3px;padding:0 2px;";
        rest.parentNode.replaceChild(mark, rest);
        mark.appendChild(rest);
        marks.push(mark);
        n = tail;
        idx = n.nodeValue.indexOf(word);
      }
    });
    return marks;
  }

  function locateInInput(word, occ) {
    var v = input.value, from = 0;
    for (var i = 0; i <= occ; i++) {
      var idx = v.indexOf(word, from);
      if (idx === -1) return;
      from = idx + word.length;
    }
    input.focus();
    input.setSelectionRange(from - word.length, from);
    var lineHeight = 24.5; /* 14px × 1.75 */
    var lines = v.slice(0, from - word.length).split("\n").length;
    input.scrollTop = Math.max(0, (lines - 8) * lineHeight);
  }

  function locateWord(word) {
    if (!blocks.length) { toast("请先点击「一键排版」"); return; }
    var doc = preview.contentDocument;
    if (!doc || !doc.body) { toast("预览未就绪，请稍候"); return; }
    if (locState.word === word && locState.marks.length) {
      /* 同一词再点：跳到下一次出现 */
      locState.cur = (locState.cur + 1) % locState.marks.length;
    } else {
      clearMarks();
      locState.marks = highlightWord(word);
      locState.word = word;
      locState.cur = 0;
      if (!locState.marks.length) { toast("预览中未找到「" + word + "」，请重新排版"); return; }
    }
    var m = locState.marks[locState.cur];
    if (!m) return;
    try { m.scrollIntoView({ behavior: "smooth", block: "center" }); } catch (e) { m.scrollIntoView(); }
    locState.marks.forEach(function (x, i) {
      x.style.background = i === locState.cur ? "#FFC94D" : "#FFE082";
      x.style.outline = i === locState.cur ? "2px solid #FF8F00" : "none";
    });
    locateInInput(word, locState.cur);
    toast("已定位「" + word + "」 " + (locState.cur + 1) + "/" + locState.marks.length);
  }

  /* ---------- 统计 ---------- */
  function updateStats() {
    var v = input.value;
    var chars = v.replace(/\s/g, "").length;
    var lines = v ? v.split("\n").length : 0;
    var cjk = (v.match(/[\u4e00-\u9fff]/g) || []).length;
    var mins = Math.max(1, Math.ceil(cjk / 350));
    $("#stats").textContent = chars + " 字 · " + lines + " 行 · 约读 " + mins + " 分钟";
  }

  /* ---------- 发布前敏感词检查 ---------- */
  function runCheck(text) {
    var box = $("#checkBox");
    if (!box || !window.SensitiveWords) { if (box) box.hidden = true; return; }
    $("#checkIdle").hidden = true;
    var res = SensitiveWords.check(text || "");
    if (res.ok) {
      box.hidden = false;
      box.className = "check-box ok";
      $("#checkIco").textContent = "✓";
      $("#checkTitle").textContent = "发布前检查 · 未发现广告法违禁表述";
      $("#checkBody").innerHTML = '<span class="chip ok-note">安全</span><span class="hint">文案不含极限词 / 夸大词 / 诱导词，可放心发布</span>';
    } else {
      box.hidden = false;
      box.className = "check-box risk";
      $("#checkIco").textContent = "!";
      $("#checkTitle").textContent = "发布前检查 · 发现 " + res.total + " 处敏感表述（" + res.hits[0].group + " 等）";
      $("#checkBody").innerHTML = res.hits.map(function (h) {
        return '<button type="button" class="chip risk" data-word="' + escAttr(h.word) + '" title="点击在预览中定位并高亮 · 分类：' + escAttr(h.group) + '">' +
          escHtml(h.word) + " ×" + h.count + " → 建议 " + (h.suggest && h.suggest[0] ? escHtml(h.suggest[0]) : "避免绝对化用语") + "</button>";
      }).join("");
      /* 点击检查项 → 预览内定位高亮 */
      if (!checkBodyBound) {
        checkBodyBound = true;
        $("#checkBody").addEventListener("click", function (e) {
          var t = e.target.closest("[data-word]");
          if (t) locateWord(t.getAttribute("data-word"));
        });
      }
    }
  }

  /* HTML 属性/文本转义（防止词库内容破坏标记） */
  function escAttr(s) { return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;"); }
  function escHtml(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  /* ---------- 一键排版 ---------- */
  function format(scrollToPreview) {
    var raw = input.value;
    if (!raw.trim()) { toast("请先粘贴或输入文字"); return; }
    var cleaned = Cleaner.cleanText(raw);
    blocks = Formatter.parseBlocks(cleaned.text);
    lastHtml = Formatter.renderHtml(blocks, tpl());
    lastPlain = Formatter.htmlToPlain(lastHtml);
    input.value = Formatter.blocksToText(blocks);
    lastCleaned = input.value;
    stale = false;
    renderPreview();
    renderStruct();
    var rawLines = raw.split("\n").filter(function (l) { return l.trim(); }).length;
    $("#cleanNote").hidden = false;
    $("#cleanNote").textContent = "已智能清洗：去除 " + cleaned.stats.blankLines + " 处多余空行 · 规范 " +
      cleaned.stats.punctFixes + " 处标点 · 原文 " + rawLines + " 行 → 识别为 " + blocks.length + " 个内容块";
    runCheck(input.value);
    toast("排版完成 ✦ 预览已更新，可切换右上角模板");
    /* 手机上排版后自动滚动到预览，方便立刻查看成品 */
    if (scrollToPreview && window.innerWidth <= 640) {
      var pv = document.querySelector(".preview-panel");
      if (pv) pv.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  /* ---------- 复制到公众号（富文本，样式不丢失） ---------- */
  function copyFormatted(html, plain) {
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        return navigator.clipboard.write([
          new ClipboardItem({
            "text/html": new Blob([html], { type: "text/html" }),
            "text/plain": new Blob([plain], { type: "text/plain" })
          })
        ]).then(function () { return true; }, function () { return fallbackCopy(html); });
      }
    } catch (e) { /* 走兜底 */ }
    return Promise.resolve(fallbackCopy(html));
  }

  function fallbackCopy(html) {
    try {
      var holder = document.getElementById("copyHolder");
      holder.innerHTML = html;
      var range = document.createRange();
      range.selectNodeContents(holder);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      var ok = document.execCommand("copy");
      sel.removeAllRanges();
      holder.innerHTML = "";
      return ok;
    } catch (e) { return false; }
  }

  function onCopy() {
    if (!lastHtml || stale) format();
    if (!lastHtml) { toast("请先粘贴或输入内容"); return; }
    copyFormatted(lastHtml, lastPlain).then(function (ok) {
      toast(ok ? "已复制 ✅ 到公众号编辑器 Ctrl/Cmd + V 粘贴即可，样式会保留" : "复制失败：请手动选中预览区内容后 Ctrl/Cmd + C");
    });
  }

  /* ---------- 下载 HTML ---------- */
  function onDownload() {
    if (!lastHtml) { toast("请先点击「一键排版」"); return; }
    var blob = new Blob(['<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><title>公众号排版成品</title></head><body>' + lastHtml + "</body></html>"], { type: "text/html;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "公众号排版成品.html";
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    toast("已下载 HTML 文件");
  }

  /* ---------- Toast ---------- */
  var toastTimer = null;
  function toast(msg) {
    var el = $("#toast");
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, 3000);
  }

  /* ---------- 初始化 ---------- */
  function init() {
    $("#cpColor").value = TEMPLATES.custom.accent;
    $("#cpHex").value = TEMPLATES.custom.accent;
    updateSwatches();
    updateThemeVars();
    renderTplPills();
    updateSpec();
    $("#btnFormat").onclick = function () { format(true); };
    $("#btnCopy").onclick = onCopy;
    $("#btnDownload").onclick = onDownload;
    $("#btnSample").onclick = function () {
      input.value = RAW_SAMPLE;
      lastCleaned = "";
      stale = true;
      updateStats();
      toast("已载入示例原文（含多余空行/半角标点，可直接点击「一键排版」体验清洗效果）");
    };
    $("#btnClear").onclick = function () {
      input.value = ""; lastHtml = ""; blocks = []; lastCleaned = ""; stale = false;
      $("#cleanNote").hidden = true;
      $("#structChips").innerHTML = "";
      $("#checkBox").hidden = true;
      $("#checkIdle").hidden = false;
      preview.srcdoc = "about:blank";
      updateStats();
    };

    /* 自定义配色面板 */
    $("#cpColor").addEventListener("input", function () { applyCustomColor(this.value); });
    $("#cpHex").addEventListener("change", function () { applyCustomColor(this.value); });
    $("#cpHex").addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); applyCustomColor(this.value); this.blur(); }
    });
    $("#cpReset").onclick = function () {
      try { localStorage.removeItem(CFT_KEY); } catch (e) { /* ignore */ }
      TEMPLATES.custom = buildCustomTemplate("#76B900");
      $("#cpColor").value = "#76B900";
      $("#cpHex").value = "#76B900";
      updateSwatches();
      setTemplate("nvidia");
      toast("已恢复内置模板");
    };

    input.addEventListener("input", function () {
      updateStats();
      if (input.value !== lastCleaned && lastHtml) stale = true;
    });
    document.addEventListener("keydown", function (e) {
      if (e.ctrlKey && e.key === "Enter") { e.preventDefault(); format(); }
    });

    var q = new URLSearchParams(location.search);
    if (q.get("demo") === "formatted") {
      input.value = RAW_SAMPLE;
      updateStats();
      setTimeout(format, 300);
    } else if (q.get("demo") === "raw") {
      input.value = RAW_SAMPLE;
      updateStats();
    }
    var customColor = q.get("custom");
    if (customColor && /^#?[0-9a-f]{3,6}$/i.test(customColor)) {
      setTimeout(function () { applyCustomColor(customColor); }, 400);
    }
    updateStats();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
