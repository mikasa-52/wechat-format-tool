/* ===== 发布前敏感词检测 =====
 * 内置广告法极限词 / 医疗夸大词 / 投资诱导词 / 分享诱导词库。
 * 只做提示，不做自动替换：命中即列出「词 ×次数 → 建议」，由用户按语境判断。
 * 用法：SensitiveWords.check(text) → { ok, total, hits:[{word, group, count, suggest}] }
 */
(function (global) {
  "use strict";

  var GROUPS = [
    {
      name: "极限词",
      words: [
        { w: "最佳", s: ["领先", "出众"] },
        { w: "最好", s: ["领先", "出色"] },
        { w: "最优", s: ["领先"] },
        { w: "最先进", s: ["新一代", "前沿"] },
        { w: "最大", s: ["规模领先"] },
        { w: "最强", s: ["实力出众"] },
        { w: "最低价", s: ["实惠价"] },
        { w: "最高", s: ["领先水平"] },
        { w: "最新", s: ["新一代"] },
        { w: "第一", s: ["名列前茅", "位居前列"] },
        { w: "唯一", s: ["之一"] },
        { w: "首个", s: ["率先"] },
        { w: "首家", s: ["率先"] },
        { w: "首选", s: ["优选"] },
        { w: "顶级", s: ["高端", "出色"] },
        { w: "顶尖", s: ["专业"] },
        { w: "极品", s: ["优质"] },
        { w: "极致", s: ["出色"] },
        { w: "绝对", s: ["十分", "非常"] },
        { w: "独一无二", s: ["别具一格"] },
        { w: "首创", s: ["率先推出"] },
        { w: "独家", s: ["特色"] },
        { w: "万能", s: ["多功能"] },
        { w: "百分百", s: ["可靠"] },
        { w: "100%", s: ["可靠"] },
        { w: "永久", s: ["长期"] },
        { w: "世界级", s: ["国际视野"] },
        { w: "国家级", s: ["行业认可"] },
        { w: "史无前例", s: ["开创性"] },
        { w: "空前绝后", s: ["开创性"] },
        { w: "全网", s: ["全平台"] }
      ]
    },
    {
      name: "医疗夸大",
      words: [
        { w: "根治", s: ["改善"] },
        { w: "治愈", s: ["缓解"] },
        { w: "药到病除", s: ["缓解症状"] },
        { w: "无副作用", s: ["安全性良好"] },
        { w: "永不复发", s: ["长期稳定"] },
        { w: "包治百病", s: ["针对性调理"] },
        { w: "立竿见影", s: ["逐步见效"] }
      ]
    },
    {
      name: "投资诱导",
      words: [
        { w: "稳赚", s: ["理性投资"] },
        { w: "稳赚不赔", s: ["理性投资"] },
        { w: "保本", s: ["稳健"] },
        { w: "零风险", s: ["低风险"] },
        { w: "必涨", s: ["关注市场"] },
        { w: "稳赢", s: ["稳健"] },
        { w: "翻倍", s: ["增长"] },
        { w: "涨停", s: ["市场波动"] },
        { w: "内部消息", s: ["公开信息"] }
      ]
    },
    {
      name: "诱导分享",
      words: [
        { w: "不转不是", s: ["自愿分享"] },
        { w: "转发有奖", s: ["自愿参与"] },
        { w: "集赞", s: ["自愿参与"] },
        { w: "点击领奖", s: ["活动说明"] },
        { w: "免费领取", s: ["限时活动"] }
      ]
    }
  ];

  /* 拍平成 [{word, group, suggest}] */
  var DICT = [];
  GROUPS.forEach(function (g) {
    g.words.forEach(function (it) { DICT.push({ word: it.w, group: g.name, suggest: it.s }); });
  });

  function check(text) {
    var s = String(text || "");
    var hits = [];
    for (var i = 0; i < DICT.length; i++) {
      var d = DICT[i];
      var n = 0, idx = 0;
      while ((idx = s.indexOf(d.word, idx)) !== -1) { n++; idx += d.word.length; }
      if (n > 0) hits.push({ word: d.word, group: d.group, count: n, suggest: d.suggest });
    }
    hits.sort(function (a, b) { return b.count - a.count || b.word.length - a.word.length; });
    var total = hits.reduce(function (sum, h) { return sum + h.count; }, 0);
    return { ok: hits.length === 0, total: total, hits: hits };
  }

  var api = { check: check, dict: DICT };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.SensitiveWords = api;
})(typeof window !== "undefined" ? window : globalThis);
