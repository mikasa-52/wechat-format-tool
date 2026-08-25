/* 逻辑自测：node test.js（无需任何依赖） */
const path = require("path");
const fs = require("fs");
const T = require(path.join(__dirname, "js/templates.js"));
const C = require(path.join(__dirname, "js/cleaner.js"));
const F = require(path.join(__dirname, "js/formatter.js"));
const SW = require(path.join(__dirname, "js/sensitive-words.js"));

const raw = fs.readFileSync(path.join(__dirname, "demo/raw-sample.txt"), "utf8");

/* 1) 清洗统计 */
const cleaned = C.cleanText(raw);
console.log("== 清洗 ==");
console.log("去除多余空行:", cleaned.stats.blankLines, "| 规范标点:", cleaned.stats.punctFixes);

/* 2) 结构解析 */
const blocks = F.parseBlocks(cleaned.text);
console.log("\n== 结构识别 ==");
console.log(blocks.map((b) => (b.type === "list" ? "list(" + b.items.length + ")" : b.type)).join(" → "));

/* 3) 渲染 HTML（英伟达模板） */
const html = F.renderHtml(blocks, T.TEMPLATES.nvidia);
console.log("\n== HTML 长度 ==", html.length, "字符");
console.log("包含内联样式:", /style="/.test(html) ? "是" : "否");
console.log("无 class 依赖:", /class=/.test(html) ? "有(异常)" : "是");

/* 4) 还原文本与纯文本 */
const textBack = F.blocksToText(blocks);
const plain = F.htmlToPlain(html);
console.log("\n== 还原文本（可再次排版）==");
console.log(textBack.split("\n").slice(0, 6).join("\n"));
console.log("\n== 纯文本前 80 字 ==");
console.log(plain.replace(/\n/g, " ").slice(0, 80));

/* 5) 断言 */
const expect = ["title", "para", "h2", "para", "callout", "quote", "h2", "list", "h3", "list", "divider", "h2", "para", "para", "para", "caption"];
const got = blocks.map((b) => (b.type === "list" ? "list" : b.type));
console.log("\n== 断言 ==");
console.log("块序列匹配:", JSON.stringify(got) === JSON.stringify(expect) ? "PASS" : "FAIL\n期望: " + expect.join(",") + "\n实际: " + got.join(","));
console.log("HTML 含标题字号:", html.includes("font-size:20px") ? "PASS" : "FAIL");
console.log("HTML 含品牌绿:", html.includes("#76B900") ? "PASS" : "FAIL");
console.log("HTML 含引文背景:", html.includes("background:#F4F9E8") ? "PASS" : "FAIL");

/* 6) 自定义品牌配色推导 */
console.log("\n== 自定义配色 ==");
const c1 = T.buildCustomTemplate("#76B900");
const c2 = T.buildCustomTemplate("#E60012");
const c3 = T.buildCustomTemplate("#1E6FFF");
console.log("绿色(#76B900): deep=" + c1.accentDeep, "| 按钮字色=" + c1.buttonText, c1.buttonText === "#0B1220" ? "PASS" : "FAIL");
console.log("红色(#E60012): deep=" + c2.accentDeep, "| 按钮字色=" + c2.buttonText, c2.buttonText === "#FFFFFF" ? "PASS" : "FAIL");
console.log("蓝色(#1E6FFF): 按钮字色=" + c3.buttonText, c3.buttonText === "#FFFFFF" ? "PASS" : "FAIL");
console.log("引文背景浅色化:", /^#[0-9A-F]{6}$/.test(c1.quoteBg) && c1.quoteBg !== "#76B900" ? "PASS" : "FAIL");
console.log("深色为推导非恒等:", c1.accentDeep !== "#76B900" && c2.accentDeep !== "#E60012" ? "PASS" : "FAIL");

/* 7) 敏感词检测 */
console.log("\n== 敏感词检测 ==");
const res = SW.check(cleaned.text);
console.log("命中词列表:", res.hits.map((h) => h.word + "×" + h.count).join(" "));
console.log("命中总数:", res.total);
console.log("示例含违禁词被检出:", res.hits.some((h) => h.word === "最先进") && res.hits.some((h) => h.word === "首选") ? "PASS" : "FAIL");
console.log("命中词带替换建议:", res.hits.every((h) => h.suggest && h.suggest.length) ? "PASS" : "FAIL");
const okText = "这是一段完全正常的文案，不含任何违规表述。";
console.log("正常文案判安全:", SW.check(okText).ok ? "PASS" : "FAIL");
