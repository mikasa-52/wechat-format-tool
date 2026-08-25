/* ===== 排版引擎 =====
 * 职责：
 *  1) parseBlocks：把清洗后的文本解析为结构化块（标题/小标题/正文/引文/重点/列表/分隔线/文末注）
 *  2) renderHtml：按模板把块渲染为「公众号兼容的内联样式 HTML」（全部 inline style，复制不丢样式）
 *  3) blocksToText / htmlToPlain：还原可编辑的带标记文本、以及复制用的纯文本
 *
 * 结构识别规则（按优先级）：
 *  显式标记：# / ## / ### 标题，> 引文，**整行** 重点框，- / 1. 列表，--- 分隔线，文|图|来源… 文末注
 *  自动识别：首行短句→标题；短句(≤24字)且后接空行且不以句末标点结尾→小标题
 *  正文内 **加粗** 渲染为品牌色强调。
 */
(function (global) {

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  /* ---------- 结构解析 ---------- */
  function parseBlocks(cleaned) {
    const lines = String(cleaned || "").split("\n");
    const blocks = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i].trim();
      if (!line) { i++; continue; }
      let m;

      // 1) 显式标题 # ## ###
      if ((m = line.match(/^(#{1,3})\s+(.+)$/))) {
        const lv = m[1].length;
        blocks.push({ type: lv === 1 ? "h2" : lv === 2 ? "h3" : "h4", text: m[2].trim() });
        i++; continue;
      }
      // 2) 引文 > ...
      if (line.indexOf(">") === 0) {
        const buf = [line.replace(/^>\s?/, "")];
        i++;
        while (i < lines.length && lines[i].trim().indexOf(">") === 0) {
          buf.push(lines[i].trim().replace(/^>\s?/, ""));
          i++;
        }
        blocks.push({ type: "quote", text: buf.join("\n") });
        continue;
      }
      // 3) 列表 - / • / 1.
      if (/^[-•·*]\s+/.test(line) || /^\d+[.、]\s+/.test(line)) {
        const items = [];
        while (i < lines.length) {
          const l = lines[i].trim();
          if (/^[-•·*]\s+/.test(l)) { items.push(l.replace(/^[-•·*]\s+/, "")); i++; }
          else if (/^\d+[.、]\s+/.test(l)) { items.push(l.replace(/^\d+[.、]\s+/, "")); i++; }
          else break;
        }
        blocks.push({ type: "list", items: items });
        continue;
      }
      // 4) 分隔线 ---
      if (line === "---" || /^—{2,}$/.test(line)) { blocks.push({ type: "divider" }); i++; continue; }
      // 5) 文末注（文｜/ 图｜/ 来源 / 编辑…）
      if (/^(文|图|来源|编辑|撰文|排版)\s*[|｜：:]\s*/.test(line)) { blocks.push({ type: "caption", text: line }); i++; continue; }
      // 6) 整行 ** ** → 重点强调框
      if ((m = line.match(/^\*\*(.+)\*\*$/))) { blocks.push({ type: "callout", text: m[1].trim() }); i++; continue; }

      // 7) 自动识别：首行短句 → 标题
      const next = i + 1 < lines.length ? lines[i + 1].trim() : "";
      const endsSent = /[。！？；，、：]$/.test(line);
      if (blocks.length === 0 && line.length <= 30 && !endsSent && (next === "" || next.length > 24)) {
        blocks.push({ type: "title", text: line }); i++; continue;
      }
      // 8) 自动识别：短句 + 后接空行 + 非句末标点 → 小标题
      if (line.length <= 24 && !endsSent && next === "") {
        blocks.push({ type: "h2", text: line }); i++; continue;
      }
      // 9) 正文段落（连续行合并为一个段落，内部用 <br>）
      const buf = [];
      while (i < lines.length && lines[i].trim()) { buf.push(lines[i].trim()); i++; }
      blocks.push({ type: "para", text: buf.join("\n") });
    }
    return blocks;
  }

  /* ---------- 内联文本（处理 **加粗** 与换行） ---------- */
  function inline(s, tpl) {
    const parts = String(s).split(/\*\*(.+?)\*\*/g);
    let out = "";
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (p == null || p === "") continue;
      if (i % 2 === 1) {
        out += '<strong style="color:' + tpl.accentDeep + ';font-weight:700;">' + esc(p) + "</strong>";
      } else {
        out += esc(p);
      }
    }
    return out.replace(/\n/g, "<br/>");
  }

  /* ---------- 单块渲染（全部内联样式，公众号可保留） ---------- */
  function blockHtml(b, tpl) {
    const A = tpl.align;
    const base = "margin:0 0 14px;font-size:" + tpl.bodySize + "px;line-height:" + tpl.lineHeight +
      ";color:" + tpl.bodyColor + ";text-align:" + A + ";";
    switch (b.type) {
      case "title":
        return '<p style="margin:0 0 16px;font-size:' + tpl.titleSize + 'px;font-weight:700;line-height:1.55;color:' +
          tpl.headingColor + ";text-align:" + A + ';">' + inline(b.text, tpl) + "</p>";
      case "h2":
        return '<p style="margin:26px 0 14px;font-size:' + tpl.h2Size + 'px;font-weight:700;line-height:1.6;color:' +
          tpl.headingColor + ";text-align:" + A + ";border-left:4px solid " + tpl.accent + ';padding-left:10px;">' + inline(b.text, tpl) + "</p>";
      case "h3":
        return '<p style="margin:22px 0 12px;font-size:' + tpl.h3Size + 'px;font-weight:700;line-height:1.6;color:' +
          tpl.accentDeep + ";text-align:" + A + ';">' + inline(b.text, tpl) + "</p>";
      case "h4":
        return '<p style="margin:20px 0 10px;font-size:' + tpl.h4Size + 'px;font-weight:600;line-height:1.6;color:#5A6268;text-align:' +
          A + ';">' + inline(b.text, tpl) + "</p>";
      case "para":
        return '<p style="' + base + '">' + inline(b.text, tpl) + "</p>";
      case "quote":
        return '<p style="margin:18px 0;padding:14px 16px;background:' + tpl.quoteBg + ";border-left:4px solid " +
          tpl.quoteBar + ";font-size:" + tpl.quoteSize + "px;line-height:" + tpl.lineHeight +
          ";color:#4A4F54;text-align:" + A + ';">' + inline(b.text, tpl) + "</p>";
      case "callout":
        return '<p style="margin:18px 0;padding:14px 16px;background:' + tpl.calloutBg + ";border-radius:" +
          tpl.radius + "px;font-size:" + tpl.bodySize + "px;line-height:" + tpl.lineHeight +
          ";color:" + tpl.accentDeep + ";font-weight:700;text-align:" + A + ';">' + inline(b.text, tpl) + "</p>";
      case "list":
        return b.items.map(function (it) {
          return '<p style="margin:0 0 8px;font-size:' + tpl.bodySize + "px;line-height:" + tpl.lineHeight +
            ";color:" + tpl.bodyColor + ';text-align:left;padding-left:4px;"><span style="color:' +
            tpl.accent + ';font-weight:700;">•</span>&nbsp;' + inline(it, tpl) + "</p>";
        }).join("");
      case "divider":
        return '<p style="margin:22px 0;text-align:center;color:' + tpl.dividerColor +
          ";letter-spacing:10px;font-size:" + tpl.bodySize + 'px;line-height:1;">' + tpl.divider + "</p>";
      case "caption":
        return '<p style="margin:20px 0 4px;font-size:' + tpl.captionSize + "px;line-height:1.7;color:" +
          tpl.captionColor + ';text-align:left;">' + inline(b.text, tpl) + "</p>";
      default:
        return "";
    }
  }

  /* 整篇 HTML：外层 section 提供统一内边距与字体栈 */
  function renderHtml(blocks, tpl) {
    const body = blocks.map(function (b) { return blockHtml(b, tpl); }).join("\n");
    return '<section style="padding:18px 14px;font-family:-apple-system,BlinkMacSystemFont,\'PingFang SC\',\'Hiragino Sans GB\',\'Microsoft YaHei\',sans-serif;">\n' + body + "\n</section>";
  }

  /* 块 → 带标记的可编辑文本（可再次排版，结构不丢） */
  function blocksToText(blocks) {
    return blocks.map(function (b) {
      switch (b.type) {
        case "title": case "h2": case "h3": case "h4":
        case "para": case "caption": return b.text;
        case "quote": return "> " + b.text.split("\n").join("\n> ");
        case "callout": return "**" + b.text + "**";
        case "list": return b.items.map(function (it) { return "- " + it; }).join("\n");
        case "divider": return "---";
        default: return "";
      }
    }).join("\n\n");
  }

  /* HTML → 纯文本（复制时作为 text/plain 兜底） */
  function htmlToPlain(html) {
    return String(html)
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  const api = { parseBlocks, renderHtml, blockHtml, inline, esc, blocksToText, htmlToPlain };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.Formatter = api;
})(typeof window !== "undefined" ? window : globalThis);
