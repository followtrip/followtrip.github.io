// 预约确认函生成器（纯前端｜字段提取 + 两栏排版）
// 依赖：同目录 template.png
// 输出：PNG（与模板同尺寸，微信发图清晰）
// 功能：粘贴原始预约信息 → 自动提取字段 → 规整排版 → 两栏自动续写 + 上下居中

// ====== 画布尺寸：与你新模板一致（1024×1536）======
const CANVAS_W = 1024;
const CANVAS_H = 1536;

// ====== 文本区域（金框内留白区，按你新图测量）======
const TEXT_BOX = { x: 81, y: 406, w: 855, h: 790 };

// ====== 两栏配置 ======
const COLUMNS = 2;
const GUTTER = 52;        // 两栏间距
const PADDING = 44;       // 文字离金框边距
const LINE_HEIGHT = 1.45; // 行距

// ====== 字号范围 ======
const MAX_FONT = 42;
const MIN_FONT = 22;

// ====== DOM ======
const inputEl = document.getElementById("input");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const btnGenerate = document.getElementById("btnGenerate");
const btnDownload = document.getElementById("btnDownload");

canvas.width = CANVAS_W;
canvas.height = CANVAS_H;

let lastDataURL = null;

// ====== 模板加载 ======
const templateImg = new Image();
// 如果你的文件名是 template.png，把这里改成 "./template.png"
templateImg.src = "./template.png";

templateImg.onload = () => renderToCanvas("请在左侧粘贴预约信息，然后点击「生成图片」");
templateImg.onerror = () =>
  alert("模板加载失败：请确认 reservation-maker 目录下存在 template.jpeg（或 template.png），文件名大小写完全一致。");

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

// ====== 渲染 ======
function renderToCanvas(rawText) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.drawImage(templateImg, 0, 0, CANVAS_W, CANVAS_H);

  const formatted = formatReservationText(rawText);
  drawAutoFitTextTwoColumns(formatted, TEXT_BOX);

  lastDataURL = canvas.toDataURL("image/png");
}

// =====================================================================
// ① 字段提取：把“乱文本/邮件”尽量整理成统一的输出
// =====================================================================
function formatReservationText(raw) {
  const text = normalizeRaw(raw);

  // 如果用户已经按“每行一个字段”写得很规整（例如你自己的模板式输入），就少干预
  // 规则：出现很多“：”并且每行较短，则不强制重排，仅做轻微美化
  const lines0 = text.split("\n").filter(Boolean);
  const colonLines = lines0.filter(l => /[:：]/.test(l)).length;
  const shortLines = lines0.filter(l => l.length <= 26).length;
  const looksStructured = colonLines >= Math.max(4, lines0.length * 0.35) && shortLines >= lines0.length * 0.5;

  // 从文本提取字段
  const data = extractFields(text);

  // 如果没提取到啥，或本身就结构化：只做轻微处理返回
  if (looksStructured || data._score < 3) {
    return beautifyLines(text);
  }

  // 组装输出：按“日本常见顺序”
  const out = [];

  // 顶部：店名 / 予約番号（如果有）
  if (data.restaurant) out.push(`■レストラン  ${data.restaurant}`);
  if (data.reservationId) out.push(`■予約番号  ${data.reservationId}`);

  // 日期时间、人数、座位
  if (data.datetime) out.push(`■予約日時  ${data.datetime}`);
  if (data.people) out.push(`■予約人数  ${data.people}`);
  if (data.seat) out.push(`■お席  ${data.seat}`);

  // 课程/费用
  if (data.course) out.push(`■コース名  ${data.course}`);
  if (data.price) out.push(`■コース料金  ${data.price}`);

  // 地址/电话
  if (data.address) out.push(`■住所  ${data.address}`);
  if (data.phone) out.push(`■電話番号  ${data.phone}`);

  // 服务费/取消/备注（合并为更像“官方通知”）
  if (data.serviceFee) out.push(`■サービス料・チャージ  ${data.serviceFee}`);
  if (data.cancellation) out.push(`■キャンセル  ${data.cancellation}`);
  if (data.note) out.push(`■備考  ${data.note}`);

  // 预约人放最后
  if (data.booker) out.push(`■予約者  ${data.booker}`);

  // 如果有“未识别的剩余内容”，放在最后作为“その他”
  if (data._rest) out.push(`■その他  ${data._rest}`);

  // 美化：对齐、去掉多余空行、把过长的段落适当断行（后面还有自动折行）
  return beautifyLines(out.join("\n"));
}

function normalizeRaw(raw) {
  return (raw || "")
    .replace(/\r\n/g, "\n")
    .replace(/\u00A0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/[：]\s*/g, "：")
    .replace(/^\s+|\s+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// 轻微美化：把常见符号统一、去掉奇怪的前导
function beautifyLines(t) {
  let s = (t || "").trim();
  // 统一黑点/方块项目符号
  s = s.replace(/^[•●・]/gm, "■");
  // 统一“：”两侧空格
  s = s.replace(/[：]\s*/g, "：");
  // 统一“■字段”后面加两个空格更好看
  s = s.replace(/^■\s*/gm, "■");
  return s;
}

// =====================================================================
// ② extractFields：从各种写法里尽量抓字段
// =====================================================================
function extractFields(text) {
  const lines = text.split("\n").map(l => l.trim()).filter(l => l.length);

  const data = {
    reservationId: "",
    restaurant: "",
    datetime: "",
    people: "",
    course: "",
    price: "",
    seat: "",
    address: "",
    phone: "",
    serviceFee: "",
    cancellation: "",
    note: "",
    booker: "",
    _rest: "",
    _score: 0,
  };

  // 辅助：把“字段名：值”的行识别出来
  function pickByKey(keys) {
    for (const line of lines) {
      for (const k of keys) {
        const re = new RegExp(`^(?:■\\s*)?${k}\\s*[:：]\\s*(.+)$`, "i");
        const m = line.match(re);
        if (m && m[1]) return m[1].trim();
      }
    }
    return "";
  }

  // 预约号
  data.reservationId =
    pickByKey(["予約ID", "予約番号", "予約No\\.?","予約ID\\s*：?","Reservation\\s*ID","ID"]) ||
    matchLoose(lines, [/予約番号\s*([A-Z0-9\-]{5,})/i, /予約ID\s*([0-9]{4,})/i]);

  if (data.reservationId) data._score++;

  // 店名
  data.restaurant =
    pickByKey(["店舗名", "店名", "レストラン", "店舗", "Restaurant", "Restauran?t", "お店"]) ||
    matchAfterBullet(lines, ["店舗名", "店名", "レストラン", "店舗"]);

  if (data.restaurant) data._score++;

  // 日时（常见：01月07日(水) 17:00 / 2026年1月8日 17:30 / 1月8日(木) 18:00～）
  data.datetime =
    pickByKey(["日時", "予約日時", "日程", "来店日時", "Date", "Time"]) ||
    matchLoose(lines, [
      /(\d{4}年\d{1,2}月\d{1,2}日.*?\s*\d{1,2}[:：]\d{2}.*)/,
      /(\d{1,2}月\d{1,2}日.*?\s*\d{1,2}[:：]\d{2}.*)/,
      /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}.*?\s*\d{1,2}[:：]\d{2}.*)/,
    ]);

  if (data.datetime) data._score++;

  // 人数
  data.people =
    pickByKey(["人数", "予約人数", "来店人数", "Guests?", "Party"]) ||
    matchLoose(lines, [/(\d+)\s*名(?:（.*?）)?/]);

  if (data.people) data._score++;

  // 课程/套餐
  data.course =
    pickByKey(["コース", "コース名", "套餐", "Course", "プラン", "Plan"]) ||
    matchAfterBullet(lines, ["コース", "コース名"]);

  if (data.course) data._score++;

  // 金额
  data.price =
    pickByKey(["料金", "コース料金", "金額", "Price", "お会計"]) ||
    matchLoose(lines, [/(?:\(|（)?([\d,]+)\s*円(?:\)|）)?/, /(お会計は当日)/]);

  if (data.price) data._score++;

  // 座位
  data.seat =
    pickByKey(["席", "お席", "Seat"]) ||
    matchAfterBullet(lines, ["席", "お席"]);

  if (data.seat) data._score++;

  // 电话
  data.phone =
    pickByKey(["電話番号", "電話", "TEL", "Phone"]) ||
    matchLoose(lines, [/(\d{2,4}\-\d{2,4}\-\d{3,4})/]);

  if (data.phone) data._score++;

  // 地址：可能多行。先找“住所：”，找不到就找“〒”
  const addr1 = pickByKey(["住所", "地址", "Address"]);
  if (addr1) {
    data.address = collectMultilineValue(lines, addr1);
  } else {
    const idx = lines.findIndex(l => /^〒?\d{3}\-\d{4}/.test(l) || l.includes("東京都") || l.includes("大阪府") || l.includes("京都府"));
    if (idx >= 0) {
      data.address = lines.slice(idx, Math.min(idx + 3, lines.length)).join(" ");
    }
  }
  if (data.address) data._score++;

  // 服务费/チャージ
  data.serviceFee =
    pickByKey(["サービス料", "チャージ", "Service\\s*Fee"]) ||
    matchLoose(lines, [/サービス料.*?(\d+%.*)/, /(別途サービス料.*)/]);

  if (data.serviceFee) data._score++;

  // 取消规则（如果你粘贴内容里有 Cancellation）
  data.cancellation =
    pickByKey(["キャンセル", "Cancellation", "取消", "キャンセル料"]) ||
    matchLoose(lines, [/(キャンセル.*)/]);

  if (data.cancellation) data._score++;

  // 备注
  data.note =
    pickByKey(["備考", "注意", "お願い", "Note", "メモ"]) ||
    matchLoose(lines, [/(必ず|禁止|注意|お願い).+/]);

  if (data.note) data._score++;

  // 预约人
  data.booker =
    pickByKey(["予約人", "予約者", "お名前", "名前", "Name", "Booked\\s*by"]) ||
    matchLoose(lines, [/(?:予約人|予約者|Booked by)\s*[:：]?\s*(.+)/i]);

  if (data.booker) data._score++;

  // 剩余内容：把未被识别且看起来“有信息量”的行拼一下（防止丢信息）
  const used = new Set();
  const markUsed = (v) => {
    if (!v) return;
    // 粗略：把值拆成词，存在 used（避免太复杂）
    v.split(/\s+/).forEach(x => x && used.add(x));
  };
  Object.keys(data).forEach(k => {
    if (!k.startsWith("_")) markUsed(data[k]);
  });

  const rest = lines
    .filter(l => l.length >= 6)
    .filter(l => !/^(■|店舗名|店名|レストラン|住所|電話|日時|人数|コース|席|予約|サービス料|備考)/.test(l))
    .filter(l => {
      const tokens = l.split(/\s+/);
      let hit = 0;
      for (const t of tokens) if (used.has(t)) hit++;
      return hit < Math.max(2, tokens.length); // 大部分不重复才算 rest
    })
    .slice(0, 4)
    .join(" / ");

  data._rest = rest || "";
  return data;
}

function matchLoose(lines, regexList) {
  for (const line of lines) {
    for (const re of regexList) {
      const m = line.match(re);
      if (m) {
        // 如果有捕获组，优先返回第一个组
        if (m[1]) return String(m[1]).trim();
        return String(m[0]).trim();
      }
    }
  }
  return "";
}

function matchAfterBullet(lines, keys) {
  // 兼容：
  // ■レストラン
  //   L'atelier de oto
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    for (const k of keys) {
      if (l.replace(/^■\s*/, "").startsWith(k)) {
        const next = lines[i + 1] || "";
        if (next && !next.startsWith("■")) return next.trim();
      }
    }
  }
  return "";
}

function collectMultilineValue(lines, firstValue) {
  // 如果“住所：xxx”后面紧跟一行像楼层/建筑名/补充，就拼起来
  const idx = lines.findIndex(l => l.includes(firstValue));
  if (idx < 0) return firstValue;

  const extra = [];
  for (let i = idx + 1; i < Math.min(idx + 3, lines.length); i++) {
    const l = lines[i];
    if (!l || l.startsWith("■")) break;
    if (/電話|TEL|人数|日時|コース|席|予約|サービス料|備考/.test(l)) break;
    // 典型地址补充：6F / ビル / GINZA SIX / 号室
    if (/(F|階|ビル|B\dF|GINZA|SIX|号室|館|棟|\d{3}\-\d{4})/i.test(l) || l.length <= 24) {
      extra.push(l);
    }
  }
  return [firstValue, ...extra].join(" ");
}

// =====================================================================
// ③ 画字：两栏 + 自动缩放 + 上下居中
// =====================================================================
function drawAutoFitTextTwoColumns(text, box) {
  const innerW = box.w - PADDING * 2;
  const innerH = box.h - PADDING * 2;

  const colW = (innerW - GUTTER) / 2;
  const colX = [box.x + PADDING, box.x + PADDING + colW + GUTTER];

  const cleaned = (text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[：]\s*/g, "：")
    .trim();

  ctx.save();
  ctx.fillStyle = "#F2F2F2";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  let fontSize = MAX_FONT;

  while (fontSize >= MIN_FONT) {
    ctx.font = `600 ${fontSize}px "PingFang SC","Microsoft YaHei","Hiragino Sans GB","Noto Sans CJK SC",sans-serif`;

    const lines = wrapTextByWidth(cleaned, colW, ctx);
    const lineHpx = fontSize * LINE_HEIGHT;
    const maxLinesPerCol = Math.floor(innerH / lineHpx);
    const capacity = maxLinesPerCol * COLUMNS;

    if (lines.length <= capacity) {
      const leftLines = lines.slice(0, maxLinesPerCol);
      const rightLines = lines.slice(maxLinesPerCol);

      const usedLeftH = leftLines.length * lineHpx;
      const usedRightH = rightLines.length * lineHpx;
      const usedH = Math.max(usedLeftH, usedRightH);

      const startY = box.y + PADDING + Math.max(0, (innerH - usedH) / 2);

      drawLines(leftLines, colX[0], startY, lineHpx);
      drawLines(rightLines, colX[1], startY, lineHpx);

      ctx.restore();
      return;
    }

    fontSize -= 2;
  }

  // 仍超：最小字号 + 截断省略
  const fontSizeMin = MIN_FONT;
  ctx.font = `600 ${fontSizeMin}px "PingFang SC","Microsoft YaHei","Hiragino Sans GB","Noto Sans CJK SC",sans-serif`;

  const lines = wrapTextByWidth(cleaned, colW, ctx);
  const lineHpx = fontSizeMin * LINE_HEIGHT;
  const maxLinesPerCol = Math.floor(innerH / lineHpx);
  const capacity = maxLinesPerCol * COLUMNS;

  let clipped = lines.slice(0, capacity);
  if (clipped.length > 0) {
    clipped[clipped.length - 1] = addEllipsisToFit(clipped[clipped.length - 1], colW, ctx);
  }

  const leftLines = clipped.slice(0, maxLinesPerCol);
  const rightLines = clipped.slice(maxLinesPerCol);

  const usedLeftH = leftLines.length * lineHpx;
  const usedRightH = rightLines.length * lineHpx;
  const usedH = Math.max(usedLeftH, usedRightH);
  const startY = box.y + PADDING + Math.max(0, (innerH - usedH) / 2);

  drawLines(leftLines, colX[0], startY, lineHpx);
  drawLines(rightLines, colX[1], startY, lineHpx);

  ctx.restore();
}

function drawLines(lines, x, y, lineH) {
  let yy = y;
  for (const line of lines) {
    ctx.fillText(line, x, yy);
    yy += lineH;
  }
}

// 按宽度折行（保留原换行）
function wrapTextByWidth(text, maxWidth, ctx) {
  const paragraphs = text.split("\n");
  const lines = [];

  for (const p of paragraphs) {
    if (!p.trim()) {
      lines.push("");
      continue;
    }

    const tokens = splitKeepAsciiWords(p);
    let line = "";

    for (const t of tokens) {
      const test = line ? (line + t) : t;
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

function splitKeepAsciiWords(str) {
  const out = [];
  let buf = "";

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    const isAscii = /[A-Za-z0-9@._\-'/]/.test(ch);

    if (isAscii) buf += ch;
    else {
      if (buf) { out.push(buf); buf = ""; }
      out.push(ch);
    }
  }
  if (buf) out.push(buf);
  return out;
}

function addEllipsisToFit(line, maxWidth, ctx) {
  const ell = "…";
  if (ctx.measureText(line + ell).width <= maxWidth) return line + ell;
  let s = line;
  while (s.length > 0 && ctx.measureText(s + ell).width > maxWidth) s = s.slice(0, -1);
  return s + ell;
}
