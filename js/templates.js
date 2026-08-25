/* ===== 品牌风格模板库 =====
 * 每套模板定义统一的：字号 / 行距 / 字色 / 对齐 / 引文与强调配色。
 * 新增模板：在此文件追加一个对象即可（详见 README「如何扩展模板」）。
 */
(function (global) {
  const TEMPLATES = {
    nvidia: {
      id: "nvidia",
      name: "英伟达绿 · 科技风",
      desc: "NVIDIA 英伟达官方号风格：品牌绿点缀、深色标题、左对齐正文",
      accent: "#76B900",        // 品牌主色（绿色）
      accentDeep: "#4F7A00",    // 强调文字用深绿
      buttonText: "#0B1220",    // 主按钮文字色（绿底用深色字）
      headingColor: "#232B2F",
      bodyColor: "#3A3F44",
      captionColor: "#8A9199",
      quoteBg: "#F4F9E8",
      quoteBar: "#76B900",
      calloutBg: "#EDF7DA",
      dividerColor: "#76B900",
      bg: "#FFFFFF",
      titleSize: 20, h2Size: 17, h3Size: 15.5, h4Size: 14.5,
      bodySize: 15, quoteSize: 15, captionSize: 13,
      lineHeight: 1.85, align: "left", radius: 8, divider: "· · ·"
    },
    azure: {
      id: "azure",
      name: "深海蓝 · 商务风",
      desc: "沉稳商务蓝，适合科技/金融/企业官号",
      accent: "#1E6FFF",
      accentDeep: "#0B4FBF",
      buttonText: "#FFFFFF",
      headingColor: "#102A43",
      bodyColor: "#334155",
      captionColor: "#94A3B8",
      quoteBg: "#EEF4FF",
      quoteBar: "#1E6FFF",
      calloutBg: "#E8F0FE",
      dividerColor: "#1E6FFF",
      bg: "#FFFFFF",
      titleSize: 20, h2Size: 17, h3Size: 15.5, h4Size: 14.5,
      bodySize: 15, quoteSize: 15, captionSize: 13,
      lineHeight: 1.85, align: "left", radius: 8, divider: "· · ·"
    },
    sunset: {
      id: "sunset",
      name: "暖阳橙 · 活力风",
      desc: "温暖活力的橙色，适合消费/生活/美食官号",
      accent: "#F97316",
      accentDeep: "#C2570C",
      buttonText: "#FFFFFF",
      headingColor: "#431407",
      bodyColor: "#44403C",
      captionColor: "#A8A29E",
      quoteBg: "#FFF4E6",
      quoteBar: "#F97316",
      calloutBg: "#FFEDD5",
      dividerColor: "#F97316",
      bg: "#FFFFFF",
      titleSize: 20, h2Size: 17, h3Size: 15.5, h4Size: 14.5,
      bodySize: 15, quoteSize: 15, captionSize: 13,
      lineHeight: 1.9, align: "left", radius: 10, divider: "· · ·"
    },
    mono: {
      id: "mono",
      name: "墨影黑白 · 极简编辑风",
      desc: "黑白极简 + 两端对齐，适合媒体/人文/深度内容",
      accent: "#111111",
      accentDeep: "#111111",
      buttonText: "#FFFFFF",
      headingColor: "#000000",
      bodyColor: "#2E2E2E",
      captionColor: "#9CA3AF",
      quoteBg: "#F5F5F5",
      quoteBar: "#111111",
      calloutBg: "#EDEDED",
      dividerColor: "#D1D5DB",
      bg: "#FFFFFF",
      titleSize: 19, h2Size: 16.5, h3Size: 15.5, h4Size: 14.5,
      bodySize: 15, quoteSize: 15, captionSize: 12.5,
      lineHeight: 1.9, align: "justify", radius: 6, divider: "———"
    }
  };

  /* ---------- 颜色工具（供自定义配色使用） ---------- */
  function hexToRgb(hex) {
    var h = String(hex || "").replace("#", "").trim();
    if (h.length === 3) h = h.split("").map(function (c) { return c + c; }).join("");
    if (!/^[0-9a-f]{6}$/i.test(h)) return null;
    var n = parseInt(h, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  function toHex(r, g, b) {
    r = Math.max(0, Math.min(255, Math.round(r)));
    g = Math.max(0, Math.min(255, Math.round(g)));
    b = Math.max(0, Math.min(255, Math.round(b)));
    return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1).toUpperCase();
  }
  /* 变深：按比例乘暗 */
  function darken(hex, f) { var c = hexToRgb(hex); if (!c) return hex; return toHex(c.r * (1 - f), c.g * (1 - f), c.b * (1 - f)); }
  /* 混合：f 为 hex 占比，hex2 占比 (1-f) */
  function mix(hex, hex2, f) {
    var a = hexToRgb(hex), b = hexToRgb(hex2);
    if (!a || !b) return hex;
    return toHex(a.r * f + b.r * (1 - f), a.g * f + b.g * (1 - f), a.b * f + b.b * (1 - f));
  }
  /* 感知亮度 0~1 */
  function luminance(hex) {
    var c = hexToRgb(hex);
    if (!c) return 0.5;
    return (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 255;
  }

  /* ---------- 自定义品牌配色：由主色自动推导整套模板 ---------- */
  function buildCustomTemplate(accent) {
    var base = TEMPLATES.nvidia;
    var deep = darken(accent, 0.24);
    return {
      id: "custom",
      name: "自定义 · 品牌色",
      desc: "由你填写的品牌主色自动生成：标题 / 引文 / 强调 / 按钮全联动",
      accent: accent,
      accentDeep: deep,
      buttonText: luminance(accent) > 0.5 ? "#0B1220" : "#FFFFFF",
      headingColor: "#1F2937",
      bodyColor: "#3A3F44",
      captionColor: "#8A9199",
      quoteBg: mix(accent, "#FFFFFF", 0.12),
      quoteBar: accent,
      calloutBg: mix(accent, "#FFFFFF", 0.18),
      dividerColor: accent,
      bg: "#FFFFFF",
      titleSize: base.titleSize, h2Size: base.h2Size, h3Size: base.h3Size, h4Size: base.h4Size,
      bodySize: base.bodySize, quoteSize: base.quoteSize, captionSize: base.captionSize,
      lineHeight: base.lineHeight, align: base.align, radius: base.radius, divider: base.divider
    };
  }

  /* 默认自定义色（未保存用户配置时） */
  TEMPLATES.custom = buildCustomTemplate("#76B900");

  const api = { TEMPLATES, buildCustomTemplate, color: { darken, mix, luminance } };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.TEMPLATES = TEMPLATES;
  global.buildCustomTemplate = buildCustomTemplate;
})(typeof window !== "undefined" ? window : globalThis);
