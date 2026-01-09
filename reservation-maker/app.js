// ====== 预约确认函生成器（字段提取 + 两栏排版 + Icon 行：日期/时间/人数）======
// 放在 reservation-maker/ 目录：template.png, index.html, style.css, app.js
// 依赖 DOM：#input #canvas #btnGenerate #btnDownload

const inputEl = document.getElementById("input");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d", { alpha: true });
const btnGenerate = document.getElementById("btnGenerate");
const btnDownload = document.getElementById("btnDownload");

let lastDataURL = null;
let TEMPLATE_READY = false;

btnGenerate.disabled = true;
btnDownload.disabled = true;

const templateImg = new Image();
templateImg.crossOrigin = "anonymous";
templateImg.src = "./template.png";

templateImg.onload = () => {
  TEMPLATE_READY = true;
  canvas.width = templateImg.naturalWidth;
  canvas.height = templateImg.naturalHeight;
  btnGenerate.disabled = false;
  renderToCanvas("请粘贴预约信息，然后点击「生成图片」");
};

templateImg.onerror = () => {
  alert("template.png 加载失败：请确认 template.png 与 app.js 同目录且大小写一致（GitHub 区分大小写）");
};

btnGenerate.addEventListener("click", () => {
  if (!TEMPLATE_READY) {
    alert("模板还没加载完成，请稍等 1 秒或刷新页面再试。");
    return;
  }
  if (canvas.width !== templateImg.naturalWidth || canvas.height !== templateImg.naturalHeight) {
    canvas.width = templateImg.naturalWidth;
    canvas.height = templateImg.naturalHeight;
  }
  const raw = (inputEl.value || "").trim();
  if (!raw) {
    alert("请先粘贴预约信息");
    return;
  }
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

// ================= Layout =================
function getLayout() {
  const W = canvas.width;
  const H = canvas.height;

  const TEXT_AREA = {
    x: Math.round(W * 0.10),
    y: Math.round(H * 0.285),
    w: Math.round(W * 0.80),
    h: Math.round(H * 0.50),
  };

  const padding = Math.round(Math.min(W, H) * 0.020);
  const colGap = Math.round(padding * 1.2);
  const colW = Math.floor((TEXT_AREA.w - padding * 2 - colGap) / 2);

  const headerH = Math.round((TEXT_AREA.h - padding * 2) * 0.27);

  const headerBox = {
    x: TEXT_AREA.x + padding,
    y: TEXT_AREA.y + padding,
    w: TEXT_AREA.w - padding * 2,
    h: headerH,
  };

  const bodyTop = headerBox.y + headerBox.h;

  const leftBody = {
    x: TEXT_AREA.x + padding,
    y: bodyTop,
    w: colW,
    h: TEXT_AREA.h - padding * 2 - headerH,
  };

  const rightBody = {
    x: leftBody.x + colW + colGap,
    y: bodyTop,
    w: colW,
    h: leftBody.h,
  };

  return { headerBox, leftBody, rightBody, padding };
}

// ================= Render =================
function renderToCanvas(rawText) {
  const W = canvas.width;
  const H = canvas.height;

  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(templateImg, 0, 0, W, H);

  const fields = extractFields(rawText);
  drawReservationCard(fields);

  lastDataURL = canvas.toDataURL("image/png");
}

// ================= Draw Core =================
function drawReservationCard(f) {
  const { headerBox, leftBody, rightBody, padding } = getLayout();

  const GOLD = "#d7b46a";
  const WHITE = "#f3f3f4";
  const MUTED = "rgba(243,243,244,0.80)";

  const SANS = `"SimHei","PingFang SC","Hiragino Sans GB","Noto Sans CJK JP","Noto Sans CJK SC",sans-serif`;
  const SERIF = `"Noto Serif JP","Noto Serif SC","Songti SC","STSong","Times New Roman",serif`;

  ctx.save();
  ctx.textBaseline = "top";

  // ---- Header（店名居中 + NO + 预约人）----
  const restaurant = (f.restaurant || "（未识别店名）").trim();
  const guest = (f.guest || "").trim(); // 抓不到就空，不要乱用 1名様
  const rid = f.rid ? `NO. ${f.rid}` : "";

  const nameMax = Math.round(headerBox.h * 0.34);
  const nameMin = 34;
  const nameFont = fitSingleLineFont(restaurant, headerBox.w, nameMax, nameMin, 800, SERIF);

  const ridFont = 30;
  const guestFont = 38;

  const gap = Math.round(padding * 0.45);
  const headerTotalH = nameFont + gap + (rid ? ridFont + gap : 0) + (guest ? guestFont : 0);

  let hy = headerBox.y + Math.max(0, Math.floor((headerBox.h - headerTotalH) / 2));

  ctx.fillStyle = WHITE;
  ctx.textAlign = "center";
  ctx.font = `800 ${nameFont}px ${SERIF}`;
  ctx.fillText(restaurant, headerBox.x + headerBox.w / 2, hy);
  hy += nameFont + gap;

  if (rid) {
    ctx.fillStyle = GOLD;
    ctx.font = `800 ${ridFont}px ${SANS}`;
    ctx.fillText(rid, headerBox.x + headerBox.w / 2, hy);
    hy += ridFont + gap;
  }

  if (guest) {
    ctx.fillStyle = WHITE;
    ctx.font = `800 ${guestFont}px ${SANS}`;
    ctx.fillText(guest, headerBox.x + headerBox.w / 2, hy);
  }

  // ---- Left：Icon 行（日期更清晰）----
  const iconRowH = Math.round(leftBody.h * 0.30);
  const iconBox = { x: leftBody.x, y: leftBody.y, w: leftBody.w, h: iconRowH };

  drawIconRow({
    box: iconBox,
    dateText: normalizeDateToYMDorMD(f.dateRaw),   // ✅ 有年：YYYY/MM/DD；无年：MM/DD
    timeText: normalizeTime(f.timeRaw),
    peopleText: normalizePeople(f.peopleRaw),
    seatText: f.seat || "",
    GOLD,
    WHITE,
    MUTED,
    SANS,
  });

  const leftMain = {
    x: leftBody.x,
    y: leftBody.y + iconRowH,
    w: leftBody.w,
    h: leftBody.h - iconRowH,
  };

  const leftLines = [];
  if (f.address) leftLines.push(`地址：${f.address}`);
  if (f.phone && f.phone.toLowerCase() !== "na") leftLines.push(`电话：${f.phone}`);
  if (f.course) leftLines.push(`套餐：${f.course}`);
  if (f.price) leftLines.push(`金额：${f.price}`);

  drawParagraphAutoFit({
    text: leftLines.join("\n").trim() || " ",
    box: leftMain,
    color: WHITE,
    fontFamily: SANS,
    fontWeight: 750,
    maxFont: 34,
    minFont: 24,
    lineHeight: 1.45,
  });

  // ---- Right：补充信息（长文本）----
  const extra = (f.extra || "").trim();
  const rightText = extra ? `补充信息：\n${extra}` : "";

  drawParagraphAutoFit({
    text: rightText || " ",
    box: rightBody,
    color: MUTED,
    fontFamily: SANS,
    fontWeight: 650,
    maxFont: 28,
    minFont: 20,
    lineHeight: 1.55,
  });

  ctx.restore();
}

// ================= Icon Row =================
function drawIconRow({ box, dateText, timeText, peopleText, seatText, GOLD, WHITE, MUTED, SANS }) {
  const x = box.x, y = box.y, w = box.w, h = box.h;
  const segW = Math.floor(w / 3);

  // 分割线
  ctx.save();
  ctx.strokeStyle = "rgba(215,180,106,0.18)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y + Math.floor(h * 0.62));
  ctx.lineTo(x + w, y + Math.floor(h * 0.62));
  ctx.stroke();
  ctx.restore();

  const labelFont = 22;

  drawIconSegment2({
    x: x + 0 * segW, y, w: segW, h,
    icon: "calendar",
    label: "日期",
    valueTop: dateText || "—",
    valueBottom: "",
    GOLD, WHITE, SANS,
    labelFont,
    valueFontMax: 34,
    valueMin: 22
  });

  drawIconSegment2({
    x: x + 1 * segW, y, w: segW, h,
    icon: "clock",
    label: "时间",
    valueTop: timeText || "—",
    valueBottom: "",
    GOLD, WHITE, SANS,
    labelFont,
    valueFontMax: 34,
    valueMin: 22
  });

  drawIconSegment2({
    x: x + 2 * segW, y, w: segW, h,
    icon: "person", // ✅ 人型 icon
    label: "人数",
    valueTop: peopleText || "—",
    valueBottom: seatText || "",
    GOLD, WHITE, SANS,
    labelFont,
    valueFontMax: 34,
    valueMin: 22,
    bottomColor: "rgba(215,180,106,0.95)",
  });
}

function drawIconSegment2({
  x, y, w, h, icon, label, valueTop, valueBottom,
  GOLD, WHITE, SANS, labelFont, valueFontMax, valueMin, bottomColor
}) {
  const padX = Math.round(w * 0.10);
  const topY = y + Math.round(h * 0.18);

  const iconSize = Math.round(Math.min(w, h) * 0.22);
  const iconX = x + padX;
  const iconY = topY;

  drawSimpleIcon(icon, iconX, iconY, iconSize, GOLD);

  ctx.fillStyle = "rgba(215,180,106,0.95)";
  ctx.font = `800 ${labelFont}px ${SANS}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(label, iconX + iconSize + 12, iconY);

  const valueY = iconY + labelFont + 12;
  const maxW = w - padX * 2 - iconSize - 12;
  const vFont = fitSingleLineFont(valueTop, maxW, valueFontMax, valueMin, 850, SANS);

  ctx.fillStyle = WHITE;
  ctx.font = `850 ${vFont}px ${SANS}`;
  ctx.fillText(valueTop, iconX + iconSize + 12, valueY);

  if (valueBottom) {
    const bY = valueY + vFont + 10;
    const bFont = Math.max(18, Math.round(vFont * 0.62));
    ctx.fillStyle = bottomColor || "rgba(243,243,244,0.78)";
    ctx.font = `750 ${bFont}px ${SANS}`;
    ctx.fillText(valueBottom, iconX + iconSize + 12, bY);
  }
}

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
    const cx = x + s * 0.50;
    const headY = y + s * 0.28;
    const headR = s * 0.16;
    ctx.beginPath();
    ctx.arc(cx, headY, headR, 0, Math.PI * 2);
    ctx.stroke();

    const bodyW = s * 0.62;
    const bodyH = s * 0.42;
    const bx = cx - bodyW / 2;
    const by = y + s * 0.48;
    const br = s * 0.12;
    roundRectStroke(bx, by, bodyW, bodyH, br);
  }

  ctx.restore();
}

function roundRectStroke(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.stroke();
}

// ================= Paragraph Auto Fit =================
function drawParagraphAutoFit({ text, box, color, fontFamily, fontWeight, maxFont, minFont, lineHeight }) {
  const maxW = box.w;
  const maxH = box.h;
  const cleaned = normalize(text);

  ctx.save();
  ctx.fillStyle = color;
  ctx.textAlign = "left";
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

  ctx.font = `${fontWeight} ${minFont}px ${fontFamily}`;
  const lines = wrapTextByBox(cleaned, maxW, ctx);
  const maxLines = Math.max(1, Math.floor(maxH / (minFont * lineHeight)));
  const clipped = lines.slice(0, maxLines);
  clipped[clipped.length - 1] = clipWithEllipsis(clipped[clipped.length - 1]);

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
  const paragraphs = text.split("\n");
  const lines = [];
  for (const p of paragraphs) {
    if (!p.trim()) { lines.push(""); continue; }
    const tokens = splitKeepWords(p);
    let line = "";
    for (const t of tokens) {
      const test = line ? line + t : t;
      if (ctx.measureText(test).width <= maxWidth) line = test;
      else {
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

// ================= Field Extraction =================
function extractFields(raw) {
  const text = normalize(raw);
  const lines = text.split("\n").map(s => s.trim()).filter(Boolean);

  const get = (keys) => pickAfter(text, keys);
  const getLine = (re) => (match(text, re) || "");

  const rid =
    get(["予約ID","予約番号","予約No","予約No.","NO.","No.","Confirmation","Confirmation No","Confirmation #",
         "Reservation ID","Reservation No","Booking ID","Booking No"]) ||
    getLine(/(?:予約ID|予約番号|No\.?|NO\.?|Reservation\s*(?:ID|No)|Booking\s*(?:ID|No)|Confirmation(?:\s*(?:No|#))?)\s*[:：#]?\s*([A-Za-z0-9\-]+)/i);

  const restaurant =
    get(["店舗名","店名","レストラン","レストラン名","Restaurant","Restaurant Name","Venue"]) ||
    guessRestaurant(lines);

  const guest =
    get(["予約名","予約人","予約者","お客様名","お名前","ご予約名","Reservation Name","Guest","Guest Name","Booker"]) ||
    guessGuest(lines);

  const dtLine =
    get(["日時","予約日時","予約日","Date","Reservation Date","Booking Date"]) ||
    getLine(/(?:日時|予約日時)\s*[:：]?\s*([^\n]+)/i);

  const { dateFromDT, timeFromDT } = parseDateTimeLine(dtLine);

  const dateRaw =
    dateFromDT ||
    getLine(/(\d{4}年\d{1,2}月\d{1,2}日)/) ||
    getLine(/(\d{1,2}月\d{1,2}日)/) ||
    getLine(/(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/) ||
    getLine(/([A-Za-z]{3,9}\s+\d{1,2},\s*\d{4})/i);

  const timeRaw =
    timeFromDT ||
    get(["時間","予約時間","来店時間","Time","Reservation Time","Booking Time"]) ||
    getLine(/(\d{1,2}:\d{2}\s*(?:AM|PM))/i) ||
    getLine(/(\d{1,2}:\d{2})/);

  const peopleLine =
    get(["人数","予約人数","ご利用人数","Seats","Guests","Party Size","People"]) ||
    getLine(/(?:Seats|Guests|Party Size|People)\s*[:：]\s*([^\n]+)/i) ||
    getLine(/(\d{1,2}\s*(?:名|人)[^\n]*)/);

  const { peopleRaw, seat } = parsePeopleSeat(peopleLine);

  const address =
    get(["住所","所在地","アドレス","Address","Venue Address","Location"]) ||
    guessAddress(lines);

  const phone =
    get(["電話番号","電話","TEL","Tel","Phone","Telephone","Contact"]) ||
    getLine(/(?:Phone|Telephone|TEL|Tel)\s*[:：]\s*([+()0-9\-\s]{6,})/i) ||
    getLine(/(\d{2,4}-\d{2,4}-\d{3,4})/);

  const course =
    get(["コース","コース名","コース料金","Course","Menu","Package","Plan"]) || "";

  let price =
    get(["総額","合計","料金","金額","Total Price","Total","Price"]) ||
    getLine(/(?:Total\s*Price|Total|Price)\s*[:：]\s*([¥￥]\s?[\d,]+(?:\.\d+)?)/i) ||
    getLine(/([¥￥]\s?[\d,]+(?:\.\d+)?)(?:\s*\/\s*guest)?/i) ||
    "";

  if (!price && course) {
    const mYen = course.match(/([¥￥]\s?[\d,]+(?:\.\d+)?)/);
    const mEn = course.match(/([\d,]+)\s*円/);
    if (mYen) price = mYen[1].replace(/\s+/g, " ").trim();
    else if (mEn) price = `¥${mEn[1]}`;
  }

  const usedKeys = [
    "予約id","予約番号","reservation id","booking id","confirmation","no.",
    "店舗名","店名","レストラン","restaurant","venue",
    "予約名","予約人","予約者","お客様名","reservation name","guest","name",
    "日時","予約日時","date","time",
    "人数","予約人数","seats","guests","party size","people",
    "住所","address",
    "電話番号","電話","phone","tel",
    "コース","course","menu","plan",
    "total price","total","price","合計","総額","金額","料金"
  ];

  const extraLines = lines.filter(l => !usedKeys.some(k => l.toLowerCase().includes(k)));
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

// ================= Helpers (robust for table paste) =================
function normalize(s) {
  return String(s || "")
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, " ")          // ✅ tab -> space
    .replace(/[：]\s*/g, "：")
    .replace(/[ ]{2,}/g, " ")
    .trim();
}

function match(text, re) {
  const m = text.match(re);
  return m ? (m[1] || "").trim() : "";
}

// ✅ 支持：key：value / key value / key<TAB>value / key 单行+下一行 value
function pickAfter(text, keys) {
  // 1) key：value
  for (const k of keys) {
    const re = new RegExp(`${escapeRe(k)}\\s*[:：]\\s*([^\\n]+)`, "i");
    const m = text.match(re);
    if (m && m[1]) return m[1].trim();
  }

  // 2) key value（同一行空格/Tab分隔）
  for (const k of keys) {
    const re = new RegExp(`^\\s*${escapeRe(k)}\\s+([^\\n]+)$`, "im");
    const m = text.match(re);
    if (m && m[1]) return m[1].trim();
  }

  // 3) key 单独一行，值在下一行
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    for (const k of keys) {
      if (new RegExp(`^${escapeRe(k)}$`, "i").test(line)) {
        const next = (lines[i + 1] || "").trim();
        if (next) return next;
      }
    }
  }
  return "";
}

function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ✅ 更严格：跳过纯 ID / 人数 / 日期 / 地址电话等
function guessRestaurant(lines) {
  const bad = /(Date|Time|Seats|Guests|住所|電話|Phone|Address|予約|人数|コース|NO\.|No\.)/i;
  const looksLikeId = (s) => /^[A-Z0-9\-]{6,24}$/.test(s);         // 纯 ID
  const looksLikePeople = (s) => /^\d{1,2}\s*(名|人)/.test(s) || /名様/.test(s);

  for (const l of lines) {
    if (bad.test(l)) continue;
    if (looksLikeId(l)) continue;
    if (looksLikePeople(l)) continue;
    if (l.length < 2 || l.length > 40) continue;
    return l;
  }
  return "";
}

// ✅ 更严格：不要把“1名様”当预约人
function guessGuest(lines) {
  for (const l of lines) {
    if (/Reservation Name\s*[:：]/i.test(l)) return l.split(/[:：]/)[1]?.trim() || "";
  }
  const looksLikePeople = (s) => /^\d{1,2}\s*(名|人)/.test(s) || /名様/.test(s);
  const bad = /(Date|Time|Seats|Guests|住所|電話|Phone|Address|予約|人数|コース|NO\.|No\.)/i;

  const cand = lines.find(l => /(様|先生|女士|Guest)/i.test(l) && !looksLikePeople(l) && !bad.test(l));
  return cand || "";
}

function guessAddress(lines) {
  const cand = lines.find(l => /(〒|東京都|大阪府|京都府|Japan|Tokyo|Osaka|Kyoto)/i.test(l));
  if (!cand) return "";
  const idx = lines.indexOf(cand);
  const next1 = lines[idx + 1] || "";
  const next2 = lines[idx + 2] || "";
  const joinable = (s) => s && s.length <= 48 && !/(Phone|TEL|電話|Time|Date|Seats|Guests|予約|人数|コース)/i.test(s);
  let addr = cand;
  if (joinable(next1)) addr += ` ${next1}`;
  if (joinable(next2)) addr += ` ${next2}`;
  return addr.trim();
}

// 支持：2026年01月15日(木) 17:00 / 1月11日(日) 18:00～
function parseDateTimeLine(line) {
  const out = { dateFromDT: "", timeFromDT: "" };
  if (!line) return out;
  const s = String(line).trim();

  const mJP = s.match(/(\d{4})年(\d{1,2})月(\d{1,2})日(?:\([^)]+\))?\s*([0-9]{1,2}:[0-9]{2})/);
  if (mJP) {
    const yyyy = mJP[1];
    const mm = String(mJP[2]).padStart(2, "0");
    const dd = String(mJP[3]).padStart(2, "0");
    out.dateFromDT = `${yyyy}/${mm}/${dd}`;
    out.timeFromDT = mJP[4];
    return out;
  }

  const mJP2 = s.match(/(\d{1,2})月(\d{1,2})日(?:\([^)]+\))?\s*([0-9]{1,2}:[0-9]{2})/);
  if (mJP2) {
    const mm = String(mJP2[1]).padStart(2, "0");
    const dd = String(mJP2[2]).padStart(2, "0");
    out.dateFromDT = `${mm}/${dd}`; // 无年份
    out.timeFromDT = mJP2[3];
    return out;
  }

  return out;
}

function parsePeopleSeat(line) {
  if (!line) return { peopleRaw: "", seat: "" };
  const s = String(line).trim();
  const parts = s.split("/").map(x => x.trim()).filter(Boolean);
  if (parts.length >= 2) return { peopleRaw: parts[0], seat: parts.slice(1).join(" / ") };
  return { peopleRaw: s, seat: "" };
}

function normalizeDateToYMDorMD(s) {
  if (!s) return "";
  let t = String(s).trim();
  t = t.replace(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+/i, "");
  t = t.replace(/\([^)]+\)/g, "").trim();

  const mJP = t.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (mJP) {
    const yyyy = mJP[1];
    const mm = String(mJP[2]).padStart(2, "0");
    const dd = String(mJP[3]).padStart(2, "0");
    return `${yyyy}/${mm}/${dd}`;
  }

  const mJP2 = t.match(/(\d{1,2})月(\d{1,2})日/);
  if (mJP2) {
    const mm = String(mJP2[1]).padStart(2, "0");
    const dd = String(mJP2[2]).padStart(2, "0");
    return `${mm}/${dd}`;
  }

  const mISO = t.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (mISO) {
    const yyyy = mISO[1];
    const mm = String(mISO[2]).padStart(2, "0");
    const dd = String(mISO[3]).padStart(2, "0");
    return `${yyyy}/${mm}/${dd}`;
  }

  return t;
}

function normalizeTime(s) {
  if (!s) return "";
  let t = String(s).trim();
  t = t.replace(/[～~].*$/, "").trim();
  return t;
}

function normalizePeople(s) {
  if (!s) return "";
  const m = String(s).match(/\d{1,2}/);
  if (m) return `${m[0]}名`;
  return String(s).trim();
}
