// 预约确认函生成器（字段提取 + 两栏排版 + 店名永远居中）
// 依赖：同目录 template.png
// 输出：高清 PNG（1455×2192，微信发图清晰）
// 说明：如需微调文字区域，只改 TEXT_BOX / TITLE_BOX 的 x/y/w/h

const TEMPLATE_SRC = "./template.png";

// 模板原始尺寸（你已确认）
const CANVAS_W = 1455;
const CANVAS_H = 2192;

// ====== 金框内“可写区域”（按 1455×2192 直接写像素）======
// 这是给“内容两栏”用的区域（不含店名区）
const TEXT_BOX = {
  x: 170,
  y: 820,   // 内容区从更靠下开始（给店名/NO/预约人让出空间）
  w: 1115,
  h: 820,
};

// ====== 店名/NO/预约人专用区域（永远居中）======
// 这块区域在金框内上半段
const TITLE_BOX = {
  x: 170,
  y: 600,
  w: 1115,
  h: 200,
};

// 两栏参数
const COL_GAP = 40;
const LEFT_COL_RATIO = 0.60; // 左栏占比（核心信息更宽）

const inputEl = document.getElementById("input");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const btnGenerate = document.getElementById("btnGenerate");
const btnDownload = document.getElementById("btnDownload");

canvas.width = CANVAS_W;
canvas.height = CANVAS_H;

let lastDataURL = null;

const templateImg = new Image();
templateImg.src = TEMPLATE_SRC;

templateImg.onload = () => {
  renderToCanvas("把餐厅发来的预约信息粘贴到左侧，然后点击「生成图片」");
};
templateImg.onerror = () => {
  alert(
    `template.png 加载失败：请确认 reservation-maker 目录下存在 template.png，且文件名大小写完全一致。`
  );
};

btnGenerate.addEventListener("click", () => {
  const raw = (inputEl.value || "").trim();
  if (!raw) return alert("请先粘贴预约信息");
  renderToCanvas(raw);
  btnDownload.disabled = false;
});

btnDownload.addEventListener("click", () => {
  if (!lastDataURL) return;
  const a = document.createElement("a");
  a.href = lastDataURL;
  a.download = `预约确认函_${new Date().toISOString().slice(0, 10)}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
});

// ================= 渲染入口 =================
function renderToCanvas(rawText) {
  // 背景模板
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.drawImage(templateImg, 0, 0, CANVAS_W, CANVAS_H);

  const fields = parseFields(rawText);

  // 1) 店名/NO/预约人 永远居中（独立区域）
  drawTitleCentered(fields);

  // 2) 两栏：左“核心字段”，右“备注/长说明/溢出”
  const coreLines = buildCoreLines(fields);
  const noteLines = buildNoteLines(fields);

  const overflowFromLeft = drawLinesAutoFit({
    lines: coreLines,
    box: getLeftBox(TEXT_BOX),
    maxFont: 38,
    minFont: 24,
    lineHeightMul: 1.45,
    color: "#F2F2F2",
    weight: 600,
  });

  // 右栏：备注 + 左栏溢出（不丢字）
  const rightAll = [
    ...noteLines,
    ...(overflowFromLeft.length ? ["", "—", ...overflowFromLeft] : []),
  ];

  drawLinesAutoFit({
    lines: rightAll,
    box: getRightBox(TEXT_BOX),
    maxFont: 30,
    minFont: 22,
    lineHeightMul: 1.50,
    color: "#EAEAEA",
    weight: 550,
  });

  lastDataURL = canvas.toDataURL("image/png");
}

// ================= 布局计算 =================
function getLeftBox(box) {
  const wLeft = Math.floor((box.w - COL_GAP) * LEFT_COL_RATIO);
  return { x: box.x, y: box.y, w: wLeft, h: box.h };
}
function getRightBox(box) {
  const wLeft = Math.floor((box.w - COL_GAP) * LEFT_COL_RATIO);
  const wRight = box.w - COL_GAP - wLeft;
  return { x: box.x + wLeft + COL_GAP, y: box.y, w: wRight, h: box.h };
}

// ================= 店名永远居中 =================
function drawTitleCentered(f) {
  const centerX = TITLE_BOX.x + TITLE_BOX.w / 2;

  const restaurant = f.restaurant || "（未识别店名）";
  const rid = f.rid ? `NO. ${f.rid}` : "";
  const guest = f.guest ? `${f.guest} 様` : (f.name ? `${f.name} 様` : "");

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  // 店名：自动缩放到不超出
  let sizeName = 64;
  while (sizeName >= 42) {
    ctx.font = `700 ${sizeName}px "Microsoft YaHei","PingFang SC","Noto Sans CJK SC",sans-serif`;
    if (ctx.measureText(restaurant).width <= TITLE_BOX.w - 40) break;
    sizeName -= 2;
  }
  ctx.fillStyle = "#F2E9D6";
  ctx.fillText(restaurant, centerX, TITLE_BOX.y + 10);

  // NO.
  if (rid) {
    ctx.font = `600 34px "Microsoft YaHei","PingFang SC","Noto Sans CJK SC",sans-serif`;
    ctx.fillStyle = "#D6B56D";
    ctx.fillText(rid, centerX, TITLE_BOX.y + 95);
  }

  // 预约人
  if (guest) {
    let sizeGuest = 44;
    while (sizeGuest >= 30) {
      ctx.font = `600 ${sizeGuest}px "Microsoft YaHei","PingFang SC","Noto Sans CJK SC",sans-serif`;
      if (ctx.measureText(guest).width <= TITLE_BOX.w - 40) break;
      sizeGuest -= 2;
    }
    ctx.fillStyle = "#F2F2F2";
    ctx.fillText(guest, centerX, TITLE_BOX.y + 140);
  }

  ctx.restore();
}

// ================= 字段提取 =================
function parseFields(raw) {
  const text = normalize(raw);
  const lines = text.split("\n").map(s => s.trim()).filter(Boolean);

  // 解析 “■字段 + 若干行值”
  const blocks = [];
  let cur = null;
  const isKeyLine = (ln) =>
    /^■/.test(ln) ||
    /^(予約番号|予約ID|店舗名|店名|レストラン|予約人数|人数|予約日時|日時|コース名|コース|料金|電話番号|電話|住所|お席|席|サービス料|チャージ|備考|注意|予約人|お名前|名前)/.test(ln);

  for (const ln of lines) {
    if (isKeyLine(ln)) {
      if (cur) blocks.push(cur);
      cur = { key: ln.replace(/^■\s*/, "").replace(/[：:]\s*$/, ""), value: [] };
    } else {
      if (cur) cur.value.push(ln);
    }
  }
  if (cur) blocks.push(cur);

  const out = {
    restaurant: "",
    rid: "",
    guest: "",
    datetime: "",
    people: "",
    course: "",
    price: "",
    seat: "",
    address: "",
    phone: "",
    note: "",
    service: "",
    extra: "",
  };

  const mapKey = (k) => {
    const kk = k.replace(/\s+/g, "");
    if (/予約番号|予約ID/.test(kk)) return "rid";
    if (/店舗名|店名|レストラン/.test(kk)) return "restaurant";
    if (/予約人|お名前|名前/.test(kk)) return "guest";
    if (/予約日時|日時/.test(kk)) return "datetime";
    if (/予約人数|人数/.test(kk)) return "people";
    if (/コース名|コース/.test(kk)) return "course";
    if (/料金/.test(kk)) return "price";
    if (/お席|席/.test(kk)) return "seat";
    if (/住所/.test(kk)) return "address";
    if (/電話番号|電話/.test(kk)) return "phone";
    if (/備考|注意/.test(kk)) return "note";
    if (/サービス料|チャージ/.test(kk)) return "service";
    return null;
  };

  // 填充块
  for (const b of blocks) {
    const k = mapKey(b.key);
    const v = (b.value || []).join(" ").trim();
    if (!k) {
      out.extra += (out.extra ? "\n" : "") + `${b.key}：${v}`;
    } else {
      out[k] = out[k] || v;
    }
  }

  // 兼容 “key：value” 一行式
  for (const ln of lines) {
    const m = ln.match(/^(.+?)[：:]\s*(.+)$/);
    if (!m) continue;
    const k = mapKey(m[1]);
    if (!k) continue;
    out[k] = out[k] || m[2].trim();
  }

  // 兜底：第一行当店名（避免空）
  if (!out.restaurant && lines.length) out.restaurant = lines[0];

  return out;
}

function normalize(s) {
  return (s || "")
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .trim();
}

// ================= 文本组装（左/右栏内容） =================
function buildCoreLines(f) {
  const lines = [];
  if (f.datetime) lines.push(`日時：${f.datetime}`);
  if (f.people) lines.push(`人数：${f.people}`);
  if (f.seat) lines.push(`席：${f.seat}`);
  if (f.course) lines.push(`コース：${f.course}`);
  if (f.price) lines.push(`料金：${f.price}`);
  lines.push("");
  if (f.address) {
    lines.push("住所：");
    wrapAddressToLines(f.address).forEach(x => lines.push(x));
  }
  if (f.phone) lines.push(`電話：${f.phone}`);
  return lines.filter(x => x !== undefined);
}

function buildNoteLines(f) {
  const lines = [];
  if (f.service) {
    lines.push("サービス / チャージ：");
    lines.push(f.service);
    lines.push("");
  }
  if (f.note) {
    lines.push("注意事項：");
    lines.push(f.note);
    lines.push("");
  }
  if (f.extra) {
    lines.push("その他：");
    lines.push(f.extra);
  }
  return lines.filter(Boolean);
}

function wrapAddressToLines(addr) {
  // 地址可能被拼成一行，这里做一个简单断行（按空格/全角空格/逗号）
  const a = addr.replace(/　/g, " ").replace(/,\s*/g, " ");
  const parts = a.split(" ").filter(Boolean);
  const out = [];
  let cur = "";
  for (const p of parts) {
    const test = cur ? cur + " " + p : p;
    if (test.length <= 18) cur = test;
    else { if (cur) out.push(cur); cur = p; }
  }
  if (cur) out.push(cur);
  return out;
}

// ================= 自动适配绘制 + 溢出返回 =================
function drawLinesAutoFit({
  lines,
  box,
  maxFont,
  minFont,
  lineHeightMul,
  color,
  weight,
}) {
  const padding = 18;
  const maxW = box.w - padding * 2;
  const maxH = box.h - padding * 2;

  ctx.save();
  ctx.fillStyle = color;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  // 先把每行按宽度折行
  const tryWrap = (fontSize) => {
    ctx.font = `${weight || 600} ${fontSize}px "Microsoft YaHei","PingFang SC","Hiragino Sans GB","Noto Sans CJK SC",sans-serif`;
    const wrapped = wrapLines(lines, maxW);
    const totalH = wrapped.length * fontSize * lineHeightMul;
    return { wrapped, totalH };
  };

  for (let fontSize = maxFont; fontSize >= minFont; fontSize -= 1) {
    const { wrapped, totalH } = tryWrap(fontSize);
    if (totalH <= maxH) {
      drawWrapped(wrapped, box.x + padding, box.y + padding, fontSize * lineHeightMul);
      ctx.restore();
      return [];
    }
  }

  // 塞不下：按最小字号画满，多余行返回（给右栏）
  const fontSize = minFont;
  const { wrapped } = tryWrap(fontSize);
  const lineH = fontSize * lineHeightMul;
  const maxLines = Math.floor(maxH / lineH);

  const visible = wrapped.slice(0, maxLines);
  const overflow = wrapped.slice(maxLines);

  drawWrapped(visible, box.x + padding, box.y + padding, lineH);
  ctx.restore();

  return overflow;
}

function drawWrapped(lines, x, y, lineH) {
  let yy = y;
  for (const line of lines) {
    ctx.fillText(line, x, yy);
    yy += lineH;
  }
}

function wrapLines(lines, maxWidth) {
  const out = [];
  for (const raw of lines) {
    const line = (raw || "").toString();
    if (!line.trim()) { out.push(""); continue; }

    const tokens = splitKeepAsciiWord(line);
    let cur = "";
    for (const tk of tokens) {
      const test = cur ? cur + tk : tk;
      if (ctx.measureText(test).width <= maxWidth) {
        cur = test;
      } else {
        if (cur) out.push(cur);
        cur = tk.trimStart();
      }
    }
    if (cur) out.push(cur);
  }
  return out;
}

function splitKeepAsciiWord(str) {
  const out = [];
  let buf = "";
  for (const ch of str) {
    const isAscii = /[A-Za-z0-9@._'"\-()]/.test(ch);
    if (isAscii) buf += ch;
    else {
      if (buf) { out.push(buf); buf = ""; }
      out.push(ch);
    }
  }
  if (buf) out.push(buf);
  return out;
}
