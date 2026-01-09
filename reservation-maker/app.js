// ====== 预约确认函生成器（字段提取 + 两栏排版 + Icon 行）======
// 放在 reservation-maker/ 目录
// 文件：template.png, index.html, style.css, app.js（本文件）
// 输出：与 template.png 同尺寸的高清 PNG（微信发图清晰）

// ---------------- DOM ----------------
const inputEl = document.getElementById("input");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d", { alpha: true });
const btnGenerate = document.getElementById("btnGenerate");
const btnDownload = document.getElementById("btnDownload");

let lastDataURL = null;

// ---------------- Template ----------------
const templateImg = new Image();
templateImg.src = "./template.png";

templateImg.onload = () => {
  // 以模板真实尺寸作为画布尺寸（你现在模板 1455×2192）
  canvas.width = templateImg.naturalWidth;
  canvas.height = templateImg.naturalHeight;

  // 初始渲染
  renderToCanvas("请粘贴预约信息，然后点击「生成图片」");
};

templateImg.onerror = () => {
  alert(
    "template.png 加载失败：请确认 reservation-maker 目录下存在 template.png，且文件名完全一致（区分大小写）"
  );
};

// ---------------- Buttons ----------------
btnGenerate.addEventListener("click", () => {
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

// =====================================================
// 你需要微调的位置：金框内文字区域（TEXT_AREA）
// ——建议你先用默认值跑一下，看是否刚好落在金框内；如果偏了再微调
// 对你的模板（1455×2192）我给了一个“保守且好用”的默认区域
// =====================================================
function getLayout() {
  const W = canvas.width;
  const H = canvas.height;

  // 金框内的内容区域（大框内，不含金边留白）
  // 这组是按你最新大留白模板估算的“可用区域”
  // 如果你发现文字离金边太近：把 padding 增大 or 让 x/y 往里一点
  const TEXT_AREA = {
    x: Math.round(W * 0.11),  // ~160
    y: Math.round(H * 0.30),  // ~658
    w: Math.round(W * 0.78),  // ~1135
    h: Math.round(H * 0.46),  // ~1008
  };

  // 内边距：让文字不要“顶格”
  const padding = Math.round(Math.min(W, H) * 0.018); // ~26

  // 两栏设置
  const colGap = Math.round(padding * 1.2); // 栏间距
  const colW = Math.floor((TEXT_AREA.w - padding * 2 - colGap) / 2);

  const leftCol = {
    x: TEXT_AREA.x + padding,
    y: TEXT_AREA.y + padding,
    w: colW,
    h: TEXT_AREA.h - padding * 2,
  };

  const rightCol = {
    x: leftCol.x + colW + colGap,
    y: leftCol.y,
    w: colW,
    h: leftCol.h,
  };

  // 顶部标题区（店名/预约号/预约人）占用的高度
  const headerH = Math.round(leftCol.h * 0.28); // 大约 28%
  const bodyTop = leftCol.y + headerH;

  const headerBox = {
    x: TEXT_AREA.x + padding,
    y: TEXT_AREA.y + padding,
    w: TEXT_AREA.w - padding * 2,
    h: headerH,
  };

  const leftBody = {
    x: leftCol.x,
    y: bodyTop,
    w: leftCol.w,
    h: leftCol.h - headerH,
  };

  const rightBody = {
    x: rightCol.x,
    y: bodyTop,
    w: rightCol.w,
    h: rightCol.h - headerH,
  };

  return { W, H, TEXT_AREA, padding, headerBox, leftBody, rightBody };
}

// ---------------- Render ----------------
function renderToCanvas(rawText) {
  const { W, H } = canvas;
  ctx.clearRect(0, 0, W, H);

  // 1) 画模板
  ctx.drawImage(templateImg, 0, 0, W, H);

  // 2) 解析字段（中/日/英）
  const fields = extractFields(rawText);

  // 3) 排版绘制
  drawReservationCard(fields);

  lastDataURL = canvas.toDataURL("image/png");
}

// =====================================================
// 绘制核心：店名居中 + 预约人单独行 + icon 行 + 两栏补充
// =====================================================
function drawReservationCard(f) {
  const { padding, headerBox, leftBody, rightBody } = getLayout();

  // 颜色（你这张模板黑金风）
  const GOLD = "#d7b46a";
  const WHITE = "#f3f3f4";
  const MUTED = "rgba(243,243,244,0.80)";

  ctx.save();
  ctx.textBaseline = "top";

  // ---------------- Header（居中） ----------------
  // 店名（永远居中）
  const restaurant = f.restaurant || "（未识别店名）";
  const guest = f.guest || "（未识别预约人）";
  const rid = f.rid ? `NO. ${f.rid}` : "";

  // 店名字号：自动适配 headerBox.w
  const nameFontMax = Math.round(headerBox.h * 0.32); // 大
  const nameFontMin = 34;

  const nameFont = fitSingleLineFont(restaurant, headerBox.w, nameFontMax, nameFontMin, 700, "serif");
  // 你想要更“日式高级”的话可用 serif；如果你坚持黑体，可改成 sans-serif
  // 但你模板本身是日式衬线更搭，我这里保守给 serif + 英文也好看
  // 若你必须黑体：把 fontFamily 替换为 '"SimHei","Noto Sans CJK JP","Noto Sans CJK SC",sans-serif'
  const nameFamily = `"SimHei","Noto Serif JP","Noto Serif SC","Times New Roman",serif`;

  // 预约号
  const ridFont = 30;

  // 预约人
  const guestFont = 34;

  // 计算 header 内纵向布局：上下留白相等
  // 三行：店名 / NO / 预约人
  const lineGap = Math.round(padding * 0.45);
  const totalH = nameFont + lineGap + (rid ? ridFont : 0) + (rid ? lineGap : 0) + guestFont;

  let y = headerBox.y + Math.max(0, Math.floor((headerBox.h - totalH) / 2));

  // 店名
  ctx.fillStyle = WHITE;
  ctx.textAlign = "center";
  ctx.font = `700 ${nameFont}px ${nameFamily}`;
  ctx.fillText(restaurant, headerBox.x + headerBox.w / 2, y);
  y += nameFont + lineGap;

  // NO
  if (rid) {
    ctx.fillStyle = GOLD;
    ctx.font = `700 ${ridFont}px "SimHei","Noto Sans CJK JP","Noto Sans CJK SC",sans-serif`;
    ctx.fillText(rid, headerBox.x + headerBox.w / 2, y);
    y += ridFont + lineGap;
  }

  // 预约人（单独列出来，店名下方）
  ctx.fillStyle = WHITE;
  ctx.font = `700 ${guestFont}px "SimHei","Noto Sans CJK JP","Noto Sans CJK SC",sans-serif`;
  ctx.fillText(guest, headerBox.x + headerBox.w / 2, y);

  // ---------------- Left Body：icon 行 + 主要字段 ----------------
  // 先画 icon 行（日期/时间/人数）
  const iconRowY = leftBody.y;
  const iconRowH = Math.round(leftBody.h * 0.22);

  const iconRowBox = {
    x: leftBody.x,
    y: iconRowY,
    w: leftBody.w,
    h: iconRowH,
  };

  drawIconRow({
    box: iconRowBox,
    dateText: smartDate(f.dateRaw),
    timeText: smartTime(f.timeRaw),
    peopleText: smartPeople(f.peopleRaw),
    GOLD,
    WHITE,
    MUTED,
  });

  // 左侧剩余区域：地址、套餐/金额、电话
  const leftMainBox = {
    x: leftBody.x,
    y: iconRowBox.y + iconRowBox.h,
    w: leftBody.w,
    h: leftBody.h - iconRowBox.h,
  };

  // 组织“左侧主要内容”
  const leftLines = [];

  // 地址（优先）
  if (f.address) {
    leftLines.push(`地址：${f.address}`);
  }

  // 电话
  if (f.phone && f.phone.toLowerCase() !== "na") {
    leftLines.push(`电话：${f.phone}`);
  }

  // 套餐/金额（如果有）
  if (f.course) {
    leftLines.push(`套餐：${f.course}`);
  }

  if (f.price) {
    leftLines.push(`金额：${f.price}`);
  }

  // 如果左侧主要内容很少，也可以把 extra 的一部分放左侧
  // 但你要求“非核心下沉”，所以这里只放核心字段
  const leftText = leftLines.join("\n").trim();

  drawParagraphAutoFit({
    text: leftText || " ",
    box: leftMainBox,
    color: WHITE,
    fontFamily: `"SimHei","Noto Sans CJK JP","Noto Sans CJK SC",sans-serif`,
    fontWeight: 650,
    maxFont: 34,
    minFont: 24,
    lineHeight: 1.45,
    align: "left",
  });

  // ---------------- Right Body：补充信息（长文本/注意事项） ----------------
  // 右侧优先放：extra（未识别/服务费/注意事项等）
  // 如果 extra 很长，也会自动缩放 + 超出则截断末尾加省略号
  const extra = (f.extra || "").trim();

  const rightTitle = extra ? "补充信息：" : "";
  const rightText = extra ? `${rightTitle}\n${extra}` : "";

  drawParagraphAutoFit({
    text: rightText || " ",
    box: rightBody,
    color: MUTED,
    fontFamily: `"SimHei","Noto Sans CJK JP","Noto Sans CJK SC",sans-serif`,
    fontWeight: 600,
    maxFont: 28,
    minFont: 20,
    lineHeight: 1.5,
    align: "left",
  });

  ctx.restore();
}

// =====================================================
// Icon 行：日期 / 时间 / 人数（你要的“日式 icon 行”）
// 这里用 Canvas 画简单 icon（不依赖外部图片）
// =====================================================
function drawIconRow({ box, dateText, timeText, peopleText, GOLD, WHITE, MUTED }) {
  const pad = Math.round(Math.min(box.w, box.h) * 0.10);
  const y = box.y + pad;
  const x = box.x;
  const w = box.w;
  const h = box.h - pad * 2;

  // 分三段：日期 | 时间 | 人数
  const segW = Math.floor(w / 3);

  // 分隔线（很淡）
  ctx.save();
  ctx.strokeStyle = "rgba(215,180,106,0.22)";
  ctx.lineWidth = 2;

  // 画一条横线（居中用）
  ctx.beginPath();
  ctx.moveTo(x, box.y + Math.floor(box.h * 0.5));
  ctx.lineTo(x + w, box.y + Math.floor(box.h * 0.5));
  ctx.stroke();

  // 文字
  const labelFont = 24;
  const valueFont = 34;

  const family = `"SimHei","Noto Sans CJK JP","Noto Sans CJK SC",sans-serif`;

  // 日期段
  drawIconSegment({
    x: x + 0 * segW,
    y,
    w: segW,
    h,
    icon: "calendar",
    label: "日期",
    value: dateText || "—",
    GOLD,
    WHITE,
    family,
    labelFont,
    valueFont,
  });

  // 时间段
  drawIconSegment({
    x: x + 1 * segW,
    y,
    w: segW,
    h,
    icon: "clock",
    label: "时间",
    value: timeText || "—",
    GOLD,
    WHITE,
    family,
    labelFont,
    valueFont,
  });

  // 人数段
  drawIconSegment({
    x: x + 2 * segW,
    y,
    w: segW,
    h,
    icon: "people",
    label: "人数",
    value: peopleText || "—",
    GOLD,
    WHITE,
    family,
    labelFont,
    valueFont,
  });

  ctx.restore();
}

function drawIconSegment({ x, y, w, h, icon, label, value, GOLD, WHITE, family, labelFont, valueFont }) {
  const iconSize = Math.round(Math.min(w, h) * 0.22);
  const iconX = x + Math.round(w * 0.12);
  const iconY = y + Math.round(h * 0.18);

  // icon
  drawSimpleIcon(icon, iconX, iconY, iconSize, GOLD);

  // label
  ctx.fillStyle = "rgba(215,180,106,0.95)";
  ctx.font = `700 ${labelFont}px ${family}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(label, iconX + iconSize + 14, iconY - 2);

  // value（自适应单行）
  const maxW = w - (iconX - x) - iconSize - 14 - Math.round(w * 0.10);
  const vFont = fitSingleLineFont(value, maxW, valueFont, 22, 700, "sans");
  ctx.fillStyle = WHITE;
  ctx.font = `700 ${vFont}px ${family}`;
  ctx.fillText(value, iconX + iconSize + 14, iconY + labelFont + 10);
}

function drawSimpleIcon(type, x, y, s, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(2, Math.floor(s * 0.08));
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (type === "calendar") {
    // 外框
    ctx.strokeRect(x, y + s * 0.12, s, s * 0.88);
    // 顶部条
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.30);
    ctx.lineTo(x + s, y + s * 0.30);
    ctx.stroke();
    // 两个小“钉”
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
    // 指针
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx, cy - r * 0.55);
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + r * 0.45, cy);
    ctx.stroke();
  } else if (type === "people") {
    const cx = x + s * 0.40;
    const cy = y + s * 0.46;
    const r = s * 0.18;

    // 两个头
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.arc(cx + s * 0.32, cy + s * 0.04, r * 0.95, 0, Math.PI * 2);
    ctx.stroke();

    // 身体线
    ctx.beginPath();
    ctx.moveTo(x + s * 0.14, y + s * 0.92);
    ctx.lineTo(x + s * 0.66, y + s * 0.92);
    ctx.stroke();
  }

  ctx.restore();
}

// =====================================================
// 段落自动适配（自动换行 + 自动缩放 + 超出截断）
// =====================================================
function drawParagraphAutoFit({
  text,
  box,
  color,
  fontFamily,
  fontWeight,
  maxFont,
  minFont,
  lineHeight,
  align
}) {
  const pad = 0; // box 已经是内边距后的区域
  const maxW = box.w - pad * 2;
  const maxH = box.h - pad * 2;

  const cleaned = normalize(text);

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
      const startX = box.x + pad;
      let y = box.y + pad;

      // 如果你想“上下居中”：这里可以改成 y = box.y + pad + (maxH - totalH)/2
      for (const line of lines) {
        ctx.fillText(line, startX, y);
        y += fontSize * lineHeight;
      }
      ctx.restore();
      return;
    }

    fontSize -= 2;
  }

  // 仍放不下：截断
  ctx.font = `${fontWeight} ${minFont}px ${fontFamily}`;
  const lines = wrapTextByBox(cleaned, maxW, ctx);
  const maxLines = Math.floor(maxH / (minFont * lineHeight));
  const clipped = lines.slice(0, maxLines);

  if (clipped.length > 0) {
    clipped[clipped.length - 1] = clipWithEllipsis(clipped[clipped.length - 1]);
  }

  const startX = box.x + pad;
  let y = box.y + pad;
  for (const line of clipped) {
    ctx.fillText(line, startX, y);
    y += minFont * lineHeight;
  }
  ctx.restore();
}

function clipWithEllipsis(line) {
  if (!line) return "…";
  if (line.length <= 2) return "…";
  return line.slice(0, Math.max(0, line.length - 2)) + "…";
}

// 折行：中日按字符，英文尽量保留单词整体
function wrapTextByBox(text, maxWidth, ctx) {
  const paragraphs = text.split("\n");
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

    if (isWord) {
      buf += ch;
    } else {
      if (buf) {
        out.push(buf);
        buf = "";
      }
      out.push(ch);
    }
  }
  if (buf) out.push(buf);

  return out;
}

// 单行字体适配
function fitSingleLineFont(text, maxW, maxFont, minFont, weight, familyType) {
  const family =
    familyType === "serif"
      ? `"SimHei","Noto Serif JP","Noto Serif SC","Times New Roman",serif`
      : `"SimHei","Noto Sans CJK JP","Noto Sans CJK SC",sans-serif`;

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

// =====================================================
// 字段提取（中/日/英）
// =====================================================
function extractFields(raw) {
  const text = normalize(raw);
  const lines = text.split("\n").map(s => s.trim()).filter(Boolean);

  const get = (keys) => pickAfter(text, keys);
  const getLine = (re) => (match(text, re) || "");

  // 预约号
  const rid =
    get([
      "予約番号","予約ID","予約No","NO.","No.","NO：","No：",
      "Reservation ID","Reservation No","Booking ID","Booking No","Confirmation","Confirmation No","Confirmation #"
    ]) ||
    getLine(/(?:予約番号|予約ID|No\.?|NO\.?|Reservation\s*(?:ID|No)|Booking\s*(?:ID|No)|Confirmation(?:\s*(?:No|#))?)\s*[:：#]?\s*([A-Za-z0-9\-]+)/i);

  // 店名
  const restaurant =
    get(["店舗名","店名","レストラン","レストラン名","店舗","お店","Restaurant","Restaurant Name","Venue"]) ||
    guessRestaurant(lines);

  // 预约人
  const guest =
    get(["予約人","予約者","予約名","お名前","ご予約名","氏名","Reservation Name","Name","Guest","Guest Name","Booker"]) ||
    guessGuest(lines);

  // 日期
  const dateRaw =
    get(["日時","予約日時","予約日付","予約日","日付","来店日","Date","Reservation Date","Booking Date"]) ||
    getLine(/(?:Date|Reservation Date|Booking Date)\s*[:：]\s*([A-Za-z]+(?:day)?\s+[A-Za-z]+\s+\d{1,2},\s*\d{4}|\d{4}[-\/]\d{1,2}[-\/]\d{1,2}|[A-Za-z]{3,9}\s+\d{1,2},\s*\d{4})/i) ||
    getLine(/(\d{4}年\d{1,2}月\d{1,2}日|(?:\d{1,2}月\d{1,2}日)|\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/);

  // 时间
  const timeRaw =
    get(["時間","予約時間","来店時間","Time","Reservation Time","Booking Time"]) ||
    getLine(/(?:Time|Reservation Time|Booking Time)\s*[:：]\s*([0-9]{1,2}:[0-9]{2}\s*(?:AM|PM)?)/i) ||
    getLine(/(\d{1,2}:\d{2}\s*(?:AM|PM))/i) ||
    getLine(/(\d{1,2}:\d{2})/);

  // 人数
  const peopleRaw =
    get(["人数","予約人数","ご利用人数","Seats","Guests","Party Size","People"]) ||
    getLine(/(?:Seats|Guests|Party Size|People)\s*[:：]\s*(\d{1,2})/i) ||
    getLine(/(\d{1,2})\s*(?:名|人)/);

  // 地址
  const address =
    get(["住所","所在地","アドレス","Address","Venue Address","Location"]) ||
    guessAddress(lines);

  // 电话
  const phone =
    get(["電話番号","電話","TEL","Tel","Phone","Telephone","Contact"]) ||
    getLine(/(?:Phone|Telephone|TEL|Tel)\s*[:：]\s*([+()0-9\-\s]{6,})/i) ||
    getLine(/(\d{2,4}-\d{2,4}-\d{3,4})/);

  // 套餐
  const course =
    get(["コース","コース名","コース料金","コース内容","Course","Menu","Package","Plan"]) || "";

  // 金额
  const price =
    get(["総額","合計","料金","金額","Total Price","Total","Price"]) ||
    getLine(/(?:Total\s*Price|Total|Price)\s*[:：]\s*([¥￥]\s?[\d,]+(?:\.\d+)?)/i) ||
    getLine(/([¥￥]\s?[\d,]+(?:\.\d+)?)(?:\s*\/\s*guest)?/i) ||
    "";

  // extra（去掉已识别字段行，剩余下沉）
  const usedKeys = [
    "予約番号","予約ID","reservation id","booking id","confirmation","no.",
    "店舗名","店名","レストラン","restaurant","venue",
    "予約人","予約者","予約名","reservation name","guest",
    "日時","予約日時","date","time",
    "人数","予約人数","seats","guests","party size",
    "住所","address",
    "電話番号","電話","phone","tel",
    "コース","course","menu",
    "total price","total","price","合計","総額"
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
    address: (address || "").trim(),
    phone: (phone || "").trim(),
    course: (course || "").trim(),
    price: (price || "").trim(),
    extra
  };
}

// ---------------- Normalizers & Helpers ----------------
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
  // 从全文里找 key：value 或 key value 的模式，取后面的内容
  for (const k of keys) {
    const re = new RegExp(`${escapeRe(k)}\\s*[:：]\\s*([^\\n]+)`, "i");
    const m = text.match(re);
    if (m && m[1]) return m[1].trim();
  }
  // 兼容 key 在一行，值在下一行
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const k of keys) {
      if (new RegExp(`^\\s*${escapeRe(k)}\\s*$`, "i").test(line)) {
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

function guessRestaurant(lines) {
  // 简单启发：出现 "Restaurant" 行；或日文块里紧跟 레스토랑/店名
  for (const l of lines) {
    if (/^Restaurant\s*[:：]/i.test(l)) return l.split(/[:：]/)[1]?.trim() || "";
  }
  // 常见：第一段里有明显的店名（含字母/假名/汉字）
  // 避免误判：包含 Date/Time/Seats/住所/電話 的行跳过
  const bad = /(Date|Time|Seats|Guests|住所|電話|Phone|Address|予約番号|予約ID|NO\.|No\.)/i;
  const cand = lines.find(l => l.length >= 2 && l.length <= 36 && !bad.test(l));
  return cand || "";
}

function guessGuest(lines) {
  for (const l of lines) {
    if (/Reservation Name\s*[:：]/i.test(l)) return l.split(/[:：]/)[1]?.trim() || "";
  }
  // 常见：包含 “様” 或 “先生/女士” 或 “Guest”
  const cand = lines.find(l => /(様|先生|女士|Guest)/i.test(l));
  return cand || "";
}

function guessAddress(lines) {
  // 先找包含 Tokyo/都道府県/〒/Japan 的
  const cand = lines.find(l => /(〒|東京都|大阪府|京都府|Japan|Tokyo|Osaka|Kyoto)/i.test(l));
  if (!cand) return "";
  // 地址可能占多行：把后续两行也拼上（如果看起来像地址）
  const idx = lines.indexOf(cand);
  const next1 = lines[idx + 1] || "";
  const next2 = lines[idx + 2] || "";
  const joinable = (s) => s && s.length <= 40 && !/(Phone|TEL|電話|Time|Date|Seats|Guests|予約)/i.test(s);
  let addr = cand;
  if (joinable(next1)) addr += ` ${next1}`;
  if (joinable(next2)) addr += ` ${next2}`;
  return addr.trim();
}

// 统一展示：日期/时间/人数
function smartDate(s) {
  if (!s) return "";
  // 只做轻量处理：保留原始，但去掉多余空格
  return s.replace(/\s{2,}/g, " ").trim();
}

function smartTime(s) {
  if (!s) return "";
  return s.replace(/\s{2,}/g, " ").trim();
}

function smartPeople(s) {
  if (!s) return "";
  // 英文 seats=1 -> 1名
  const m = s.match(/\d{1,2}/);
  if (m) return `${m[0]}名`;
  return s.trim();
}
