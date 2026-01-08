// ====== 预约确认函生成器（两栏 + 字段提取）======
// 同目录需要：template.jpeg（或 template.png）
// 输出：高清 PNG（宽 1240，微信清晰）
//
// 功能：
// 1) 字段提取：从日文/中日混排预约信息里抓字段
// 2) 两栏排版：核心信息放左侧；长说明/溢出内容放右侧
// 3) 自动换行：中日混排不乱码（依赖系统字体）
// 4) 自动缩放：核心信息区域会适度缩小，但不会小到不可读

const CANVAS_W = 1240;
const CANVAS_H = 1800;

// 你现在的新模板内层金框（按 1240×1800 换算后的可写区）
const TEXT_BOX = { x: 98, y: 477, w: 1035, h: 909 };

// 两栏：左栏放“核心字段”，右栏放“备注/溢出”
const COL_GAP = 36;
const LEFT_COL = {
  x: TEXT_BOX.x,
  y: TEXT_BOX.y,
  w: Math.floor(TEXT_BOX.w * 0.62) - Math.floor(COL_GAP / 2),
  h: TEXT_BOX.h,
};
const RIGHT_COL = {
  x: TEXT_BOX.x + Math.floor(TEXT_BOX.w * 0.62) + Math.floor(COL_GAP / 2),
  y: TEXT_BOX.y,
  w: Math.floor(TEXT_BOX.w * 0.38) - Math.floor(COL_GAP / 2),
  h: TEXT_BOX.h,
};

// 模板文件名：你用 template.jpeg 就写 jpeg；用 png 就改 png
const TEMPLATE_SRC = "./template.jpeg";

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
  renderToCanvas("请在左侧粘贴预约信息，然后点击「生成图片」");
};

templateImg.onerror = () => {
  alert(
    `模板加载失败：${TEMPLATE_SRC}\n` +
      "请确认 template.jpeg/template.png 与 app.js 在同一目录，且文件名大小写完全一致。"
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

// ---------- 主渲染 ----------
function renderToCanvas(rawText) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  // 背景模板铺满
  ctx.drawImage(templateImg, 0, 0, CANVAS_W, CANVAS_H);

  // 解析字段
  const fields = parseFields(rawText);

  // 生成“核心信息块”和“备注块”
  const coreLines = buildCoreLines(fields);
  const noteLines = buildNoteLines(fields);

  // 左栏：核心信息（不允许太小，宁可把溢出丢到右栏）
  const leftOverflow = drawLinesAutoFit({
    lines: coreLines,
    box: LEFT_COL,
    minFont: 28,
    maxFont: 46,
    lineHeightMul: 1.42,
    color: "#F3F3F4",
    weight: 700,
    align: "left",
  });

  // 右栏：备注 + 左侧溢出（右栏字体稍小）
  const rightAll = [...noteLines, ...(leftOverflow.length ? ["", "——", ...leftOverflow] : [])];

  drawLinesAutoFit({
    lines: rightAll,
    box: RIGHT_COL,
    minFont: 22,
    maxFont: 30,
    lineHeightMul: 1.45,
    color: "#E8E8E8",
    weight: 600,
    align: "left",
  });

  lastDataURL = canvas.toDataURL("image/png");
}

// ---------- 字段提取 ----------
function parseFields(raw) {
  const t = normalize(raw);

  const pick = (reList) => {
    for (const re of reList) {
      const m = t.match(re);
      if (m && m[1]) return m[1].trim();
    }
    return "";
  };

  const restaurant = pick([
    /(?:店舗名|店名|レストラン|Restaurant)\s*[:：]?\s*([^\n]+)/i,
    /■レストラン\s*\n\s*([^\n]+)/,
  ]);

  const rid = pick([
    /(?:予約ID|予約ＩＤ|予約番号|予約No\.?|NO\.?)\s*[:：]?\s*([A-Za-z0-9\-]+)/i,
    /■予約番号\s*\n\s*([A-Za-z0-9\-]+)/,
  ]);

  const name = pick([
    /(?:予約人|お名前|ご予約者名|予約者)\s*[:：]?\s*([^\n]+)/i,
    /([A-Za-z ,.'-]+)\s*様/,
  ]);

  const datetime = pick([
    /(?:日時|予約日時)\s*[:：]?\s*([^\n]+)/,
    /■予約日時\s*\n\s*([^\n]+)/,
  ]);

  const people = pick([
    /(?:人数|予約人数)\s*[:：]?\s*([^\n]+)/,
    /■予約人数\s*\n\s*([^\n]+)/,
  ]);

  const address = pick([
    /(?:住所|所在地|Address)\s*[:：]?\s*([^\n]+(?:\n[^\n]+)*)/i,
    /■住所\s*\n\s*([\s\S]*?)(?=\n■|$)/,
  ]);

  const phone = pick([
    /(?:電話番号|TEL|Tel|電話)\s*[:：]?\s*([0-9\-+() ]+)/i,
    /■電話番号\s*\n\s*([0-9\-+() ]+)/,
  ]);

  const course = pick([
    /(?:コース|コース名|Course)\s*[:：]?\s*([^\n]+)/i,
    /■コース名\s*\n\s*([^\n]+)/,
  ]);

  // 把“看起来很长的说明”都收进 notes（服务费、チャージ、個室料、キャンセル等）
  const notes = extractNotesBlock(t);

  return { restaurant, rid, name, datetime, people, address, phone, course, notes, raw: t };
}

function extractNotesBlock(t) {
  // 优先抓“サービス料・チャージ”等块
  const m = t.match(/■サービス料・チャージ\s*\n([\s\S]*?)(?=\n■|$)/);
  if (m && m[1]) return m[1].trim();

  // 否则：把“コース/料金/個室料/備考/注意/キャンセル”相关行拼起来
  const lines = t.split("\n").map((s) => s.trim());
  const keep = [];
  for (const line of lines) {
    if (!line) continue;
    if (
      /(コース|料金|個室|備注|備考|注意|キャンセル|取消|チャージ|サービス料|来店|写真|遅刻)/i.test(line)
    ) {
      keep.push(line);
    }
  }
  return keep.join("\n");
}

function normalize(s) {
  return (s || "")
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[：]\s*/g, "：")
    .replace(/[ ]{2,}/g, " ")
    .trim();
}

// ---------- 生成展示行 ----------
function buildCoreLines(f) {
  const lines = [];

  // 店名（大字，居中会更像你示例；这里先放到左栏第一行，渲染时你也可改成居中）
  if (f.restaurant) lines.push(f.restaurant);

  if (f.rid) lines.push(`NO. ${f.rid}`);
  if (f.name) lines.push(`${f.name} 様`);

  lines.push(""); // 空行

  if (f.datetime) lines.push(`🗓  ${f.datetime}`);
  if (f.people) lines.push(`👤  ${f.people}`);
  if (f.course) lines.push(`🍽  ${f.course}`);

  lines.push("");

  if (f.address) {
    // 地址可能多行
    const addrLines = f.address.split("\n").map((x) => x.trim()).filter(Boolean);
    lines.push("📍  " + (addrLines[0] || ""));
    for (let i = 1; i < addrLines.length; i++) lines.push("    " + addrLines[i]);
  }
  if (f.phone) lines.push(`☎  ${f.phone}`);

  return lines;
}

function buildNoteLines(f) {
  const lines = [];
  if (!f.notes) return lines;

  lines.push("备注 / 안내");
  lines.push("—");

  const noteLines = f.notes.split("\n").map((x) => x.trim()).filter(Boolean);
  for (const l of noteLines) lines.push(l);
  return lines;
}

// ---------- 两栏绘制：自动换行 + 自动缩放 + 返回溢出行 ----------
function drawLinesAutoFit({
  lines,
  box,
  minFont,
  maxFont,
  lineHeightMul,
  color,
  weight,
  align,
}) {
  const padding = 26;
  const maxW = box.w - padding * 2;
  const maxH = box.h - padding * 2;

  // 先把每一行再做一次“按宽度折行”
  const wrapped = wrapLines(lines, maxW);

  ctx.save();
  ctx.fillStyle = color;
  ctx.textAlign = align || "left";
  ctx.textBaseline = "top";

  for (let fontSize = maxFont; fontSize >= minFont; fontSize -= 2) {
    ctx.font = `${weight || 600} ${fontSize}px "PingFang SC","Microsoft YaHei","Hiragino Sans GB","Noto Sans CJK SC",sans-serif`;

    const lineH = fontSize * lineHeightMul;
    const totalH = wrapped.length * lineH;

    // 如果高度塞得下，就画；否则继续减小
    if (totalH <= maxH) {
      drawWrapped(wrapped, box.x + padding, box.y + padding, lineH);
      ctx.restore();
      return [];
    }
  }

  // 塞不下：不再继续变小（避免看不见）
  // 改为：画到能画的最大行数，剩余行返回给外面（放右栏）
  const fontSize = minFont;
  ctx.font = `${weight || 600} ${fontSize}px "PingFang SC","Microsoft YaHei","Hiragino Sans GB","Noto Sans CJK SC",sans-serif`;

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

// 对每个“逻辑行”按宽度折行（中日混排：按字符拆，英文数字连在一起）
function wrapLines(lines, maxWidth) {
  const out = [];
  for (const rawLine of lines) {
    const line = (rawLine || "").toString();
    if (!line.trim()) {
      out.push("");
      continue;
    }
    const tokens = splitKeepAsciiWord(line);
    let cur = "";
    for (const tk of tokens) {
      const test = cur ? cur + tk : tk;
      const w = ctx.measureText(test).width;
      if (w <= maxWidth) {
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
