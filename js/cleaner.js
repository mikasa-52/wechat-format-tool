/* ===== 智能清洗引擎 =====
 * 职责：对粘贴进来的原始文字做无侵入清洗——
 *  1) 去 BOM / 零宽字符 / 首尾空白
 *  2) 统一换行符、合并 3 行以上连续空行
 *  3) 规范标点：中文语境下把 , ; : ! ? ( ) 与直引号转成全角
 * 说明：不删除用户的结构标记（# > ** - ---），结构交给 formatter 解析。
 */
(function (global) {
  const CJK = /[\u4e00-\u9fff\u3400-\u4dbf]/;
  function isCJK(ch) { return ch != null && CJK.test(ch); }

  /* 逐字符规范化标点，返回 { text, fixes } */
  function normalizePunct(t) {
    const chars = Array.from(String(t));
    let out = "";
    let fixes = 0;
    let openQuote = true;
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      const prev = i > 0 ? chars[i - 1] : "";
      const next = i + 1 < chars.length ? chars[i + 1] : "";
      let r = ch;
      if (ch === '"') {
        r = openQuote ? "\u201C" : "\u201D"; // “ ”
        openQuote = !openQuote;
        if (r !== ch) fixes++;
      } else if (ch === "," && (isCJK(prev) || isCJK(next))) { r = "，"; fixes++; }
      else if (ch === ";" && (isCJK(prev) || isCJK(next))) { r = "；"; fixes++; }
      else if (ch === ":" && (isCJK(prev) || isCJK(next))) { r = "："; fixes++; }
      else if (ch === "!" && (isCJK(prev) || isCJK(next))) { r = "！"; fixes++; }
      else if (ch === "?" && (isCJK(prev) || isCJK(next))) { r = "？"; fixes++; }
      else if (ch === "(" && isCJK(next)) { r = "（"; fixes++; }
      else if (ch === ")" && isCJK(prev)) { r = "）"; fixes++; }
      out += r;
    }
    return { text: out, fixes };
  }

  /* 清洗主入口，返回 { text, stats:{blankLines, punctFixes} } */
  function cleanText(raw) {
    let t = String(raw == null ? "" : raw);
    t = t.replace(/\uFEFF/g, "");                       // BOM
    t = t.replace(/\r\n?/g, "\n");                      // 统一换行
    t = t.replace(/[\u200B-\u200D\u2060\u180E]/g, "");  // 零宽字符
    const lines = t.split("\n").map(function (l) {
      return l.replace(/[\t\u00A0\u3000 ]+$/g, "").replace(/^[\t\u00A0\u3000 ]+/g, "");
    });
    t = lines.join("\n");
    const blankMatches = t.match(/\n{3,}/g) || [];
    const blankLines = blankMatches.reduce(function (s, m) { return s + (m.length - 2); }, 0);
    t = t.replace(/\n{3,}/g, "\n\n");                   // 合并多余空行
    const p = normalizePunct(t);
    t = p.text;
    t = t.replace(/！{2,}/g, "！").replace(/？{2,}/g, "？").replace(/，{2,}/g, "，");
    return { text: t.trim(), stats: { blankLines: blankLines, punctFixes: p.fixes } };
  }

  const api = { cleanText, normalizePunct, isCJK };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.Cleaner = api;
})(typeof window !== "undefined" ? window : globalThis);
