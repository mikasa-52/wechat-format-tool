/* 手机视口截图工具：连接常驻无头 Chrome(CDP)，模拟 390x844 @2x 手机视口后导航并截图。
 * 用法: node tools/mobile-shot.js <url> <输出png> [port=9333] [width=390] [height=844]
 * 前置: 已用 --remote-debugging-port 启动无头 Chrome */
const http = require("http");
const fs = require("fs");

function getJson(url) {
  return new Promise((res, rej) => {
    http.get(url, (r) => {
      let d = "";
      r.on("data", (c) => (d += c));
      r.on("end", () => { try { res(JSON.parse(d)); } catch (e) { rej(e); } });
    }).on("error", rej);
  });
}

async function main() {
  const url = process.argv[2];
  const out = process.argv[3];
  const port = process.argv[4] || 9333;
  const width = parseInt(process.argv[5] || "390", 10);
  const height = parseInt(process.argv[6] || "844", 10);

  const list = await getJson(`http://127.0.0.1:${port}/json/list`);
  const page = list.find((t) => t.type === "page");
  if (!page) throw new Error("no page target");

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0;
  const pending = {};
  const send = (method, params = {}) =>
    new Promise((res, rej) => {
      const mid = ++id;
      pending[mid] = { res, rej };
      ws.send(JSON.stringify({ id: mid, method, params }));
    });
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending[m.id]) { pending[m.id].res(m.result); delete pending[m.id]; }
  };
  ws.onerror = (e) => { throw new Error("ws error"); };
  await new Promise((r) => (ws.onopen = r));

  await send("Emulation.setDeviceMetricsOverride", {
    width, height, deviceScaleFactor: 2, mobile: true, screenWidth: width, screenHeight: height
  });
  await send("Page.navigate", { url });
  await new Promise((r) => setTimeout(r, 3000)); // 等待页面与自动排版

  const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  fs.writeFileSync(out, Buffer.from(shot.data, "base64"));
  console.log(`saved ${out} (${width}x${height}@2x)`);
  ws.close();
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
