// ====== 预约确认函生成器（字段提取 + 两栏排版 + 4 Icon 小块：日期/时间/人数/席位）======
// 文件：template.png, index.html, style.css, app.js（本文件）必须在同目录
// 关键：模板必须加载成功才绘制，避免“黑屏”

const inputEl = document.getElementById("input");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d", { alpha: true });

const btnGenerate = document.getElementById("btnGenerate");
const btnDownload = document.getElementById("btnDownload");

let lastDataURL = null;
let TEMPLATE_READY = false;

// ——颜色/字体——
const GOLD = "#d7b46a";
const WHITE = "#f3f3f4";
const MUTED = "rgba(243,243,244,0.78)";
const SANS = `"PingFang SC","Microsoft YaHei","Hiragino Sans GB","Noto Sans CJK SC","Noto Sans CJK JP",sans-serif`;
const SERIF = `"Noto Serif JP","Noto Serif SC","Songti SC","STSong","Times New Roman",serif`;

// 先禁用按钮，避免模板没加载就点生成导致黑屏
btnGenerate.disabled = true;
btnDownload.disabled = true;

// ——模板加载（带 cache bust，避免 GitHub Pages 缓存旧图/404 误判）——
const templateImg = new Image();
// 如果你开了跨域CDN，这里可以加：templateImg.crossOrigin = "anonymous";
templateImg.src = `./template.png?v=${Date.now()}`;

templateImg.onload = () => {
  TEMPLATE_READY = true;

  canvas.width = templateImg.naturalWidth;
  canvas.height = templateImg.naturalHeight;

  btnGenerate.disabled = false;

  // 初始渲染提示（一定带模板，不黑）
  renderToCanvas("请粘贴预约信息，然后点击「生成图片」");
};

templateImg.onerror = () => {
  TEMPLATE_READY = false;
  alert(
    "template.png 加载失败。\n" +
      "请确认：\n" +
      "1）template.png 与 app.js 同目录\n" +
      "2）文件名大小写完全一致（template.png）\n" +
      "3）打开页面后按 F12 → Network 看 template.png 是否 200\n"
  );
};

// ——生成——
btnGenerate.addEventListener("click", () => {
  if (!TEMPLATE_READY) {
    alert("模板还没加载成功（template.png）。请刷新页面或检查 Network 是否 200。");
    return;
  }
  const raw = (inputEl.value || "").trim();
  if (!raw) {
    alert("请先粘贴预约信息");
    return;
  }
  renderToCanvas(raw);
  btnDownload.disabled = false;
});

// ——下载——
btnDownload.addEventListener("click", () => {
  if (!lastDataURL) return;
  const a = document.createElement("a");
  a.href = lastDataURL;
  a.download = `预约确认函_${new Date().toISOString().slice(0, 10)}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
});

// ======================= 核心渲染 =======================
function renderToCanvas(rawText) {
  if (!TEMPLATE_READY) return;

  const W = canvas.width;
  const H = canvas.height;

  // 1) 清空并画模板
  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(templateImg, 0, 0, W, H);

  // 2) 提取字段（中/日/英）
  const fields = extractFields(rawText);

  // 3) 绘制版式
  drawReservationCard(fields);

  // 4) 输出 dataURL
  lastDataURL = canvas.toDataURL("image/png");
}

// ======================= 布局（按你 1455×2192 模板估算）=======================
function getLayout() {
  const W = canvas.width;
  const H = canvas.height;

  // 大金框的“内内容区域”（你这版留白更大，按比例给更稳）
  const TEXT_AREA = {
    x: Math.round(W * 0.09),
    y: Math.round(H * 0.26),
    w: Math.round(W * 0.82),
    h: Math.round(H * 0.54),
  };

  const padding = Math.round(Math.min(W, H) * 0.018); // 内边距，防“顶格”
  const colGap = Math.round(padding * 1.1);
  const colW = Math.floor((TEXT_AREA.w - padding * 2 - colGap) / 2);

  const headerH = Math.round(TEXT_AREA.h * 0.26); // 顶部店名/NO/预约人区
  const iconH = Math.round(TEXT_AREA.h * 0.16);   // icon 行高度

  const headerBox = {
    x: TEXT_AREA.x + padding,
    y: TEXT_AREA.y + padding,
    w: TEXT_AREA.w - padding * 2,
    h: headerH,
  };

  const leftBody = {
    x: TEXT_AREA.x + padding,
    y: headerBox.y + headerBox.h,
    w: colW,
    h: TEXT_AREA.h - padding * 2 - headerH,
  };

  const rightBody = {
    x: leftBody.x + colW + colGap,
    y: leftBody.y,
    w: colW,
    h: leftBody.h,
  };

  const iconRowBox = {
    x: leftBody.x,
    y: leftBody.y,
    w: leftBody.w,
    h: iconH,
  };

  const leftMainBox = {
    x: leftBody.x,
    y: leftBody.y + iconH,
    w: leftBody.w,
    h: leftBody.h - iconH,
  };

  return { headerBox, iconRowBox, leftMainBox, rightBody };
}

// ======================= 绘制主卡片 =======================
function drawReservationCard(f) {
  const { headerBox, iconRowBox, leftMainBox, rightBody } = getLayout();

  ctx.save();
  ctx.textBaseline = "top";

  // ---------- Header：店名居中 + NO + 预约人居中 ----------
  const restaurant = (f.restaurant || "（未识别店名）").trim();
  const rid = f.rid ? `NO. ${f.rid}` : "";
  const guest = (f.guest || "（未识别预约人）").trim();

  const nameMax = Math.round(headerBox.h * 0.36);
  const nameMin = 34;
  const nameFont = fitSingleLineFont(restaurant, headerBox.w, nameMax, nameMin, 800, SERIF);

  const ridFont = Math.max(22, Math.round(headerBox.h * 0.16));
  const guestFont = Math.max(26, Math.round(headerBox.h * 0.20));
  const gap = Math.round(Math.min(headerBox.h, headerBox.w) * 0.05);

  const totalH =
    nameFont +
    gap +
    (rid ? ridFont + gap : 0) +
    guestFont;

  let y = headerBox.y + Math.max(0, Math.floor((headerBox.h - totalH) / 2));

  ctx.textAlign = "center";

  // 店名
  ctx.fillStyle = WHITE;
  ctx.font = `800 ${nameFont}px ${SERIF}`;
  ctx.fillText(restaurant, headerBox.x + headerBox.w / 2, y);
  y += nameFont + gap;

  // NO
  if (rid) {
    ctx.fillStyle = GOLD;
    ctx.font = `800 ${ridFont}px ${SANS}`;
    ctx.fillText(rid, headerBox.x + headerBox.w / 2, y);
    y += ridFont + gap;
  }

  // 预约人（必须在店名下方居中）
  ctx.fillStyle = WHITE;
  ctx.font = `800 ${guestFont}px ${SANS}`;
  ctx.fillText(guest, headerBox.x + headerBox.w / 2, y);

  // ---------- Icon Row：日期 / 时间 / 人数 / 席位 ----------
  drawIconRow4({
    box: iconRowBox,
    dateText: toYYYYMMDD(f.dateRaw),
    timeText: smartTime(f.timeRaw),
    peopleText: smartPeople(f.peopleRaw),
    seatText: (f.seat || "").trim(),
  });

  // ---------- 左侧主要信息（地址/电话/套餐/金额） ----------
  const leftLines = [];
  if (f.address) leftLines.push(`地址：${f.address}`);
  if (f.phone && f.phone.toLowerCase() !== "na") leftLines.push(`电话：${f.phone}`);
  if (f.course) leftLines.push(`套餐：${f.course}`);
  if (f.price) leftLines.push(`金额：${f.price}`);

  drawParagraphAutoFit({
    text: leftLines.join("\n"),
    box: leftMainBox,
    color: WHITE,
    fontFamily: SANS,
    fontWeight: 700,
    maxFont: 34,
    minFont: 22,
    lineHeight: 1.5,
    align: "left",
  });

  // ---------- 右侧补充信息（下沉） ----------
  const extra = (f.extra || "").trim();
  const rightText = extra ? `补充信息：\n${extra}` : "";

  drawParagraphAutoFit({
    text: rightText,
    box: rightBody,
    color: MUTED,
    fontFamily: SANS,
    fontWeight: 650,
    maxFont: 26,
    minFont: 18,
    lineHeight: 1.55,
    align: "left",
  });

  ctx.restore();
}

// ======================= 4 小块 Icon Row（日期/时间/人数/席位）=======================
function drawIconRow4({ box, dateText, timeText, peopleText, seatText }) {
  const x = box.x, y = box.y, w = box.w, h = box.h;
  const segW = Math.floor(w / 4);

  // 横线 + 竖分隔（高级一点）
  ctx.save();
  ctx.strokeStyle = "rgba(215,180,106,0.16)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y + Math.floor(h * 0.62));
  ctx.lineTo(x + w, y + Math.floor(h * 0.62));
  ctx.stroke();

  ctx.strokeStyle = "rgba(215,180,106,0.10)";
  for (let i = 1; i <= 3; i++) {
    const vx = x + segW * i;
    ctx.beginPath();
    ctx.moveTo(vx, y + Math.floor(h * 0.18));
    ctx.lineTo(vx, y + Math.floor(h * 0.92));
    ctx.stroke();
  }
  ctx.restore();

  const labelFont = 20;

  drawSeg({ x: x + 0 * segW, y, w: segW, h, icon: "calendar", label: "日期", value: dateText || "—", labelFont, tag: false });
  drawSeg({ x: x + 1 * segW, y, w: segW, h, icon: "clock", label: "时间", value: timeText || "—", labelFont, tag: false });
  drawSeg({ x: x + 2 * segW, y, w: segW, h, icon: "person", label: "人数", value: peopleText || "—", labelFont, tag: false });

  // ✅ 席位：Tag 更突出
  drawSeg({ x: x + 3 * segW, y, w: segW, h, icon: "seat", label: "席位", value: seatText || "—", labelFont, tag: true });
}

function drawSeg({ x, y, w, h, icon, label, value, labelFont, tag }) {
  const padX = Math.round(w * 0.10);
  const topY = y + Math.round(h * 0.20);

  const iconSize = Math.round(Math.min(w, h) * 0.22);
  const iconX = x + padX;
  const iconY = topY;

  drawSimpleIcon(icon, iconX, iconY, iconSize, GOLD);

  // label
  ctx.fillStyle = "rgba(215,180,106,0.95)";
  ctx.font = `800 ${labelFont}px ${SANS}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(label, iconX + iconSize + 10, iconY);

  // value
  const valueY = iconY + labelFont + 12;
  const maxW = w - padX * 2 - iconSize - 10;

  if (tag) {
    // Tag
    const fontSize = fitSingleLineFont(value, maxW, 28, 16, 900, SANS);
    ctx.font = `900 ${fontSize}px ${SANS}`;
    const tw = ctx.measureText(value).width;

    const tagPadX = 12, tagPadY = 7;
    const tagH = fontSize + tagPadY * 2;
    const tagW = Math.min(maxW, tw + tagPadX * 2);
    const tx = iconX + iconSize + 10;
    const ty = valueY;

    ctx.save();
    ctx.fillStyle = "rgba(215,180,106,0.18)";
    ctx.strokeStyle = "rgba(215,180,106,0.60)";
    ctx.lineWidth = 2;
    roundRect(tx, ty, tagW, tagH, 14);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(215,180,106,0.98)";
    ctx.fillText(value, tx + tagPadX, ty + tagPadY);
    ctx.restore();
  } else {
    const fontSize = fitSingleLineFont(value, maxW, 32, 18, 900, SANS);
    ctx.fillStyle = WHITE;
    ctx.font = `900 ${fontSize}px ${SANS}`;
    ctx.fillText(value, iconX + iconSize + 10, valueY);
  }
}

// ======================= 简洁 Icon（calendar/clock/person/seat）=======================
function drawSimpleIcon(type, x, y, s, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(2, Math.floor(s * 0.08));
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (type === "calendar") {
    ctx.strokeRect(x, y + s * 0.12, s, s * 0.88);
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.30);
    ctx.lineTo(x + s, y + s * 0.30);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + s * 0.25, y);
    ctx.lineTo(x + s * 0.25, y + s * 0.22);
    ctx.moveTo(x + s * 0.75, y);
    ctx.lineTo(x + s * 0.75, y + s * 0.22);
    ctx.stroke();
  } else if (type === "clock") {
    const cx = x + s / 2;
    const cy = y + s / 2 + s * 0.08;
    const r = s * 0.42;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx, cy - r * 0.55);
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + r * 0.45, cy);
    ctx.stroke();
  } else if (type === "person") {
    // 更好看的“人形”
    const cx = x + s * 0.50;
    const headY = y + s * 0.30;
    const r = s * 0.16;
    ctx.beginPath();
    ctx.arc(cx, headY, r, 0, Math.PI * 2);
    ctx.stroke();
    // 身体
    ctx.beginPath();
    ctx.moveTo(cx, headY + r);
    ctx.lineTo(cx, y + s * 0.78);
    ctx.stroke();
    // 肩
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.22, y + s * 0.55);
    ctx.lineTo(cx + s * 0.22, y + s * 0.55);
    ctx.stroke();
  } else if (type === "seat") {
    // 椅子
    const bx = x + s * 0.18;
    const by = y + s * 0.22;
    const bw = s * 0.64;
    const bh = s * 0.58;

    // 椅背
    ctx.beginPath();
    ctx.moveTo(bx, by + bh * 0.55);
    ctx.lineTo(bx, by);
    ctx.lineTo(bx + bw * 0.55, by);
    ctx.stroke();

    // 坐垫
    ctx.beginPath();
    ctx.moveTo(bx, by + bh * 0.60);
    ctx.lineTo(bx + bw, by + bh * 0.60);
    ctx.stroke();

    // 椅脚
    ctx.beginPath();
    ctx.moveTo(bx + bw * 0.15, by + bh);
    ctx.lineTo(bx + bw * 0.15, by + bh * 0.60);
    ctx.moveTo(bx + bw * 0.85, by + bh);
    ctx.lineTo(bx + bw * 0.85, by + bh * 0.60);
    ctx.stroke();
  }

  ctx.restore();
}

function roundRect(x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// ======================= 段落自动适配（换行 + 缩放 + 截断）=======================
function drawParagraphAutoFit({ text, box, color, fontFamily, fontWeight, maxFont, minFont, lineHeight, align }) {
  const cleaned = normalize(text || "");
  const maxW = box.w;
  const maxH = box.h;

  ctx.save();
  ctx.fillStyle = color;
  ctx.textAlign = align || "left";
  ctx.textBaseline = "top";

  let fontSize = maxFont;
  while (fontSize >= minFont) {
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    const lines = wrapTextByBox(cleaned, maxW, ctx);
    const totalH = lines.length * fontSize * lineHeight;

    if (totalH <= maxH) {
      let y = box.y;
      for (const line of lines) {
        ctx.fillText(line, box.x, y);
        y += fontSize * lineHeight;
      }
      ctx.restore();
      return;
    }
    fontSize -= 2;
  }

  // 截断
  ctx.font = `${fontWeight} ${minFont}px ${fontFamily}`;
  const lines = wrapTextByBox(cleaned, maxW, ctx);
  const maxLines = Math.max(1, Math.floor(maxH / (minFont * lineHeight)));
  const clipped = lines.slice(0, maxLines);
  if (clipped.length) clipped[clipped.length - 1] = clipWithEllipsis(clipped[clipped.length - 1]);

  let y = box.y;
  for (const line of clipped) {
    ctx.fillText(line, box.x, y);
    y += minFont * lineHeight;
  }
  ctx.restore();
}

function clipWithEllipsis(line) {
  if (!line) return "…";
  if (line.length <= 2) return "…";
  return line.slice(0, Math.max(0, line.length - 2)) + "…";
}

function wrapTextByBox(text, maxWidth, ctx) {
  const paragraphs = String(text || "").split("\n");
  const lines = [];

  for (const p of paragraphs) {
    if (!p.trim()) {
      lines.push("");
      continue;
    }
    const tokens = splitKeepWords(p);
    let line = "";

    for (const t of tokens) {
      const test = line ? line + t : t;
      if (ctx.measureText(test).width <= maxWidth) {
        line = test;
      } else {
        if (line) lines.push(line);
        line = t.trimStart();
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

function splitKeepWords(str) {
  const out = [];
  let buf = "";
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    const isWord = /[A-Za-z0-9@._\-]/.test(ch);
    if (isWord) buf += ch;
    else {
      if (buf) out.push(buf), (buf = "");
      out.push(ch);
    }
  }
  if (buf) out.push(buf);
  return out;
}

function fitSingleLineFont(text, maxW, maxFont, minFont, weight, family) {
  let size = maxFont;
  ctx.save();
  while (size >= minFont) {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxW) {
      ctx.restore();
      return size;
    }
    size -= 2;
  }
  ctx.restore();
  return minFont;
}

// ======================= 字段提取（更稳：避免“レストラン”被当店名）=======================
function extractFields(raw) {
  const text = normalize(raw);
  const lines0 = text.split("\n").map(s => s.trim()).filter(Boolean);

  // 去掉行首的 ■ □ ・ - 等符号，避免“■レストラン”这种影响识别
  const lines = lines0.map(l => l.replace(/^[■□・●◆▶\-–—\s]+/, "").trim());

  const get = (keys) => pickAfter(text, keys);
  const getLine = (re) => (match(text, re) || "");

  // 预约ID/番号
  const rid =
    get(["予約ID","予約番号","予約No","NO.","No.","Reservation ID","Reservation No","Booking ID","Booking No","Confirmation","Confirmation No","Confirmation #"]) ||
    getLine(/(?:予約ID|予約番号|No\.?|NO\.?|Reservation\s*(?:ID|No)|Booking\s*(?:ID|No)|Confirmation(?:\s*(?:No|#))?)\s*[:：#]?\s*([A-Za-z0-9\-]+)/i);

  // 店名（优先：店舗名/店名/Restaurant:）
  let restaurant =
    get(["店舗名","店名","レストラン名","Restaurant","Restaurant Name","Venue"]) ||
    "";

  // 防止拿到“レストラン”这种标签词
  if (!restaurant || /^(レストラン|店舗名|店名|Restaurant)$/i.test(restaurant)) {
    restaurant = guessRestaurant(lines) || "";
  }

  // 预约人（优先：予約名/Reservation Name）
  let guest =
    get(["予約名","予約人","予約者","お名前","ご予約名","Reservation Name","Name","Guest","Guest Name","Booker"]) ||
    "";

  // 防止 guest 变成 “1名様/2名様”
  if (!guest || /^\d+\s*(名|人)\s*様?$/.test(guest)) {
    guest = guessGuest(lines) || "";
  }

  // 日期/时间（常见：日時 一行含日期+时间）
  const dateTimeLine =
    get(["日時","予約日時","Date","Reservation Date","Booking Date"]) ||
    getLine(/(?:日時|予約日時)\s*[:：]?\s*([^\n]+)/);

  const dateRaw =
    get(["予約日付","予約日","日付","来店日","Date"]) ||
    extractDateFromMixed(dateTimeLine) ||
    getLine(/(\d{4}年\d{1,2}月\d{1,2}日|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);

  const timeRaw =
    get(["予約時間","来店時間","Time","Reservation Time"]) ||
    extractTimeFromMixed(dateTimeLine) ||
    getLine(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);

  // 人数（可能是：1人 / カウンター）
  let peopleRaw =
    get(["人数","予約人数","ご利用人数","Seats","Guests","Party Size","People"]) ||
    getLine(/(?:Seats|Guests|Party Size|People)\s*[:：]\s*(\d{1,2})/i) ||
    getLine(/(\d{1,2})\s*(?:名|人)/);

  // 席位（重点）
  let seat =
    get(["席","お席","Seat","Seating","Table","Counter","Room","個室"]) ||
    "";

  // 如果人数行里带“/ カウンター”就拆出来
  if (peopleRaw && /\/|｜|\|/.test(peopleRaw)) {
    const parts = peopleRaw.split(/\/|｜|\|/).map(s => s.trim()).filter(Boolean);
    if (parts.length) {
      peopleRaw = parts[0];
      if (!seat && parts[1]) seat = parts[1];
    }
  }

  // 地址
  const address =
    get(["住所","所在地","Address","Venue Address","Location"]) ||
    guessAddress(lines);

  // 电话
  const phone =
    get(["電話番号","電話","TEL","Tel","Phone","Telephone"]) ||
    getLine(/(?:Phone|Telephone|TEL|Tel)\s*[:：]\s*([+()0-9\-\s]{6,})/i) ||
    getLine(/(\d{2,4}-\d{2,4}-\d{3,4})/);

  // 套餐/金额
  const course =
    get(["コース","コース名","Course","Menu","Package","Plan"]) || "";

  const price =
    get(["総額","合計","料金","金額","Total Price","Total","Price"]) ||
    getLine(/(?:Total\s*Price|Total|Price)\s*[:：]\s*([¥￥]\s?[\d,]+(?:\.\d+)?)/i) ||
    getLine(/([¥￥]\s?[\d,]+(?:\.\d+)?)(?:\s*\/\s*guest)?/i) ||
    "";

  // extra：去掉明显字段行，剩余下沉
  const usedHints = [
    "予約id","予約番号","no.","reservation id","booking id","confirmation",
    "店舗名","店名","レストラン","restaurant","venue",
    "予約名","予約人","予約者","reservation name","guest",
    "日時","予約日時","date","time",
    "人数","予約人数","seats","guests","party size",
    "住所","address",
    "電話","phone","tel",
    "コース","course","menu",
    "total price","total","price","合計","総額",
    "席","お席","seat","seating","counter","table","個室"
  ];
  const extraLines = lines.filter(l => !usedHints.some(k => l.toLowerCase().includes(k)));
  const extra = extraLines.join("\n").trim();

  return {
    rid: (rid || "").trim(),
    restaurant: (restaurant || "").trim(),
    guest: (guest || "").trim(),
    dateRaw: (dateRaw || "").trim(),
    timeRaw: (timeRaw || "").trim(),
    peopleRaw: (peopleRaw || "").trim(),
    seat: (seat || "").trim(),
    address: (address || "").trim(),
    phone: (phone || "").trim(),
    course: (course || "").trim(),
    price: (price || "").trim(),
    extra
  };
}

// ======================= 识别辅助 =======================
function normalize(s) {
  return String(s || "")
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[：]\s*/g, "：")
    .replace(/[ ]{2,}/g, " ")
    .trim();
}

function match(text, re) {
  const m = text.match(re);
  return m ? (m[1] || "").trim() : "";
}

function pickAfter(text, keys) {
  // key：value
  for (const k of keys) {
    const re = new RegExp(`${escapeRe(k)}\\s*[:：]\\s*([^\\n]+)`, "i");
    const m = text.match(re);
    if (m && m[1]) return m[1].trim();
  }
  // key 单独一行，值在下一行
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    for (const k of keys) {
      if (new RegExp(`^\\s*${escapeRe(k)}\\s*$`, "i").test(line)) {
        const next = (lines[i + 1] || "").trim();
        if (next) return next.replace(/^[■□・●◆▶\-–—\s]+/, "").trim();
      }
    }
  }
  return "";
}

function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function guessRestaurant(lines) {
  // 优先找“Restaurant: xxx”
  for (const l of lines) {
    if (/^Restaurant\s*[:：]/i.test(l)) return (l.split(/[:：]/)[1] || "").trim();
  }
  // 找“店舗名/店名/レストラン”下一行（如果存在）
  for (let i = 0; i < lines.length; i++) {
    if (/^(店舗名|店名|レストラン名)$/i.test(lines[i])) {
      const v = (lines[i + 1] || "").trim();
      if (v && !/^(レストラン|店舗名|店名)$/i.test(v)) return v;
    }
  }
  // 启发：短且不像字段的那行
  const bad = /(予約|日時|日付|時間|人数|住所|電話|TEL|Phone|Address|Course|Total|Price|席)/i;
  const cand = lines.find(l => l.length >= 2 && l.length <= 32 && !bad.test(l));
  return cand || "";
}

function guessGuest(lines) {
  for (const l of lines) {
    if (/^Reservation Name\s*[:：]/i.test(l)) return (l.split(/[:：]/)[1] || "").trim();
  }
  for (let i = 0; i < lines.length; i++) {
    if (/^(予約名|予約人|予約者|お名前|ご予約名)$/i.test(lines[i])) {
      const v = (lines[i + 1] || "").trim();
      if (v && !/^\d+\s*(名|人)\s*様?$/.test(v)) return v;
    }
  }
  // 启发：包含“様”但不是“1名様”
  const cand = lines.find(l => /(様)$/.test(l) && !/^\d+\s*(名|人)\s*様$/.test(l));
  return cand || "";
}

function guessAddress(lines) {
  const cand = lines.find(l => /(〒|東京都|大阪府|京都府|Japan|Tokyo|Osaka|Kyoto)/i.test(l));
  if (!cand) return "";
  const idx = lines.indexOf(cand);
  const next1 = lines[idx + 1] || "";
  const next2 = lines[idx + 2] || "";
  const joinable = (s) => s && s.length <= 40 && !/(Phone|TEL|電話|Time|Date|Seats|Guests|予約|人数|席)/i.test(s);
  let addr = cand;
  if (joinable(next1)) addr += ` ${next1}`;
  if (joinable(next2)) addr += ` ${next2}`;
  return addr.trim();
}

function extractDateFromMixed(s) {
  if (!s) return "";
  const m =
    s.match(/(\d{4}年\d{1,2}月\d{1,2}日)/) ||
    s.match(/(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/) ||
    s.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
  return m ? m[1] : "";
}

function extractTimeFromMixed(s) {
  if (!s) return "";
  const m = s.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
  return m ? m[1] : "";
}

// ======================= 展示格式化 =======================
function smartTime(s) {
  if (!s) return "";
  s = String(s).replace(/\s{2,}/g, " ").trim();
  s = s.replace(/[～~].*$/, "").trim();
  return s;
}

function smartPeople(s) {
  if (!s) return "";
  const m = String(s).match(/\d{1,2}/);
  if (m) return `${m[0]}名`;
  return String(s).trim();
}

// 强制输出 YYYY/MM/DD（例如 2026/01/20）
function toYYYYMMDD(s) {
  if (!s) return "";
  const t = String(s).trim();

  // 2026年01月15日(木) -> 2026/01/15
  const m1 = t.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (m1) return `${m1[1]}/${pad2(m1[2])}/${pad2(m1[3])}`;

  // 2026-01-15 or 2026/01/15
  const m2 = t.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (m2) return `${m2[1]}/${pad2(m2[2])}/${pad2(m2[3])}`;

  // 01/15/2026
  const m3 = t.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (m3) {
    const yy = m3[3].length === 2 ? `20${m3[3]}` : m3[3];
    return `${yy}/${pad2(m3[1])}/${pad2(m3[2])}`;
  }

  // 英文日期简单保持，但太长会被 fitSingleLineFont 自动缩放
  // 你需要也转成 YYYY/MM/DD 的话，我可以再加英文月份解析
  return t;
}

function pad2(n) {
  const x = String(n);
  return x.length === 1 ? "0" + x : x;
}
