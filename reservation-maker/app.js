(() => {
  const inputEl = document.getElementById("input");
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d"); // 最稳
  const btnGenerate = document.getElementById("btnGenerate");
  const btnDownload = document.getElementById("btnDownload");

  let TEMPLATE_READY = false;
  let lastDataURL = null;

  btnGenerate.disabled = true;
  btnDownload.disabled = true;

  // ===== 模板加载：永不黑屏（失败直接画错误）=====
  const templateImg = new Image();
  templateImg.src = `./template.png?v=${Date.now()}`;

  templateImg.onload = () => {
    TEMPLATE_READY = true;
    canvas.width = templateImg.naturalWidth || 1455;
    canvas.height = templateImg.naturalHeight || 2192;
    btnGenerate.disabled = false;
    drawTemplateOnly("请粘贴预约信息，然后点击「生成图片」");
  };

  templateImg.onerror = () => {
    canvas.width = 1200;
    canvas.height = 800;
    drawError(
      "template.png 加载失败\n\n请检查：\n1) 文件名必须是 template.png（大小写一致）\n2) 必须与 index.html/app.js 同目录\n3) GitHub Pages 缓存：Ctrl+Shift+R 强刷"
    );
  };

  btnGenerate.addEventListener("click", () => {
    try {
      if (!TEMPLATE_READY) throw new Error("模板未加载完成");
      const raw = (inputEl.value || "").trim();
      if (!raw) throw new Error("未粘贴预约信息");
      render(raw);
      btnDownload.disabled = false;
    } catch (e) {
      drawError(String(e?.message || e));
    }
  });

  btnDownload.addEventListener("click", () => {
    if (!lastDataURL) return;
    const a = document.createElement("a");
    a.href = lastDataURL;
    a.download = `预约确认函_${new Date().toISOString().slice(0, 10)}.png`;
    a.click();
  });

  // ======================
  // 渲染
  // ======================
  function render(raw) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(templateImg, 0, 0, canvas.width, canvas.height);

    const d = extractFields(raw);
    const L = getLayout();

    drawHeader(d, L);
    drawIconRow(d, L);
    drawBody(d, L);
    drawExtra(d, L); // ✅ 备注/电话/频度/要望等放这里

    lastDataURL = canvas.toDataURL("image/png");
  }

  // ======================
  // 布局（按模板比例，稳定落在金框内）
  // ======================
  function getLayout() {
    const W = canvas.width;
    const H = canvas.height;

    const box = {
      x: W * 0.14,
      y: H * 0.28,
      w: W * 0.72,
      h: H * 0.52,
    };

    return {
      W,
      H,
      box,
      header: {
        x: box.x,
        y: box.y + box.h * 0.08,
        w: box.w,
        h: box.h * 0.22,
      },
      iconRow: {
        x: box.x,
        y: box.y + box.h * 0.33,
        w: box.w,
        h: box.h * 0.13,
      },
      body: {
        x: box.x,
        y: box.y + box.h * 0.50,
        w: box.w,
        h: box.h * 0.26,
      },
      extra: {
        x: box.x,
        y: box.y + box.h * 0.78,
        w: box.w,
        h: box.h * 0.18,
      },
    };
  }

  // ======================
  // Header：店名居中 / 预约人紧贴下方 / NO 金色小行
  // ======================
  function drawHeader(d, L) {
    const GOLD = "#d7b46a";
    const WHITE = "#f3f3f4";
    const centerX = L.header.x + L.header.w / 2;

    const restaurant = d.restaurant || "（未识别店名）";
    const guest = d.guest || "（未识别预约人）";
    const rid = d.rid ? `NO. ${d.rid}` : "";

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    let y = L.header.y;

    const nameFont = fitFontOneLine(
      restaurant,
      L.header.w * 0.92,
      66,
      40,
      700,
      `"Noto Serif JP","Noto Serif SC","Times New Roman",serif`
    );
    ctx.fillStyle = WHITE;
    ctx.font = `700 ${nameFont}px "Noto Serif JP","Noto Serif SC","Times New Roman",serif`;
    ctx.fillText(restaurant, centerX, y);

    // ✅ 预约人紧贴店名
    y += nameFont + 8;
    const guestFont = fitFontOneLine(
      guest,
      L.header.w * 0.85,
      36,
      24,
      650,
      `"PingFang SC","Noto Sans CJK JP","Microsoft YaHei",sans-serif`
    );
    ctx.fillStyle = WHITE;
    ctx.font = `650 ${guestFont}px "PingFang SC","Noto Sans CJK JP","Microsoft YaHei",sans-serif`;
    ctx.fillText(guest, centerX, y);

    if (rid) {
      y += guestFont + 10;
      ctx.fillStyle = GOLD;
      ctx.font = `700 26px "PingFang SC","Noto Sans CJK JP","Microsoft YaHei",sans-serif`;
      ctx.fillText(rid, centerX, y);
    }

    ctx.restore();
  }

  // ======================
  // 4格 Icon 行：日期/时间/人数/席位（席位突出）
  // ======================
  function drawIconRow(d, L) {
    const GOLD = "#d7b46a";
    const WHITE = "#f3f3f4";
    const MUTED = "rgba(215,180,106,0.90)";

    const items = [
      { label: "日期", value: d.date || "—", icon: "calendar" },
      { label: "时间", value: d.time || "—", icon: "clock" },
      { label: "人数", value: d.people || "—", icon: "person" },
      { label: "席位", value: d.seat || "—", icon: "seat", highlight: true },
    ];

    const segW = L.iconRow.w / 4;
    const topY = L.iconRow.y;

    ctx.save();
    ctx.strokeStyle = "rgba(215,180,106,0.22)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(L.iconRow.x, topY + L.iconRow.h);
    ctx.lineTo(L.iconRow.x + L.iconRow.w, topY + L.iconRow.h);
    ctx.stroke();
    ctx.restore();

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const x = L.iconRow.x + segW * i;

      const iconSize = Math.max(20, Math.floor(L.iconRow.h * 0.38));
      drawIcon(it.icon, x + 8, topY + 4, iconSize, GOLD);

      ctx.save();
      ctx.textAlign = "left";
      ctx.textBaseline = "top";

      ctx.fillStyle = MUTED;
      ctx.font = `700 20px "PingFang SC","Noto Sans CJK JP","Microsoft YaHei",sans-serif`;
      ctx.fillText(it.label, x + iconSize + 16, topY + 2);

      const maxW = segW - (iconSize + 30);
      const valueFont = fitFontOneLine(
        it.value,
        maxW,
        it.highlight ? 38 : 32,
        20,
        it.highlight ? 800 : 700,
        `"PingFang SC","Noto Sans CJK JP","Microsoft YaHei",sans-serif`
      );

      ctx.fillStyle = WHITE;
      ctx.font = `${it.highlight ? 800 : 700} ${valueFont}px "PingFang SC","Noto Sans CJK JP","Microsoft YaHei",sans-serif`;
      ctx.fillText(it.value, x + iconSize + 16, topY + 30);

      ctx.restore();
    }
  }

  // ======================
  // Body：地址/电话/套餐/金额
  // ======================
  function drawBody(d, L) {
    const WHITE = "#f3f3f4";
    const lines = [];

    if (d.address) lines.push(`地址：${d.address}`);
    if (d.phone) lines.push(`电话：${d.phone}`);
    if (d.course) lines.push(`套餐：${d.course}`);
    if (d.price) lines.push(`金额：${d.price}`);

    const text = lines.join("\n");
    if (!text) return;

    drawMultilineAutoFit({
      text,
      x: L.body.x,
      y: L.body.y,
      w: L.body.w,
      h: L.body.h,
      maxFont: 30,
      minFont: 22,
      lineHeight: 1.5,
      color: WHITE,
      weight: 650,
      family: `"PingFang SC","Noto Sans CJK JP","Microsoft YaHei",sans-serif`,
    });
  }

  // ======================
  // Extra：把“备注/频度/要望/行き方”等放这里（不会再“被屏蔽”）
  // ======================
  function drawExtra(d, L) {
    const MUTED = "rgba(243,243,244,0.78)";
    const GOLD = "rgba(215,180,106,0.85)";

    const parts = [];
    if (d.frequency) parts.push(`来店频度：${d.frequency}`);
    if (d.request) parts.push(`备注：${d.request}`);
    if (d.note) parts.push(d.note);

    const extraText = parts.join("\n").trim();
    if (!extraText) return;

    // 小标题
    ctx.save();
    ctx.fillStyle = GOLD;
    ctx.font = `700 22px "PingFang SC","Noto Sans CJK JP","Microsoft YaHei",sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("补充信息：", L.extra.x, L.extra.y);
    ctx.restore();

    drawMultilineAutoFit({
      text: extraText,
      x: L.extra.x,
      y: L.extra.y + 30,
      w: L.extra.w,
      h: L.extra.h - 30,
      maxFont: 24,
      minFont: 18,
      lineHeight: 1.55,
      color: MUTED,
      weight: 600,
      family: `"PingFang SC","Noto Sans CJK JP","Microsoft YaHei",sans-serif`,
    });
  }

  // ======================
  // 字段提取：修复全角冒号/中英日混合/无年份日期/备注
  // ======================
  function extractFields(raw) {
    const text = normalize(raw);
    const lines = text.split("\n").map(s => s.trim()).filter(Boolean);

    const get = (keys) => pickValueFlexible(lines, keys);

    const rid = cleanLead(get([
      "予約ID","予約番号","予約No",
      "Reservation ID","Reservation No","Booking ID","Confirmation","Confirmation No","Confirmation #"
    ]));

    let restaurant = cleanLead(get(["店舗名","店名","レストラン","Restaurant","Restaurant Name","Venue"]));
    let guest = cleanLead(get([
      "予約名","予約人","预约人","预约人姓名",
      "予約者","お名前","ご予約名",
      "Reservation Name","Guest","Guest Name","Name","Booker"
    ]));

    const datetimeLine = get(["日時","予約日時","Date","Time","Reservation Date","Booking Date"]);
    const { date, time } = parseDateTime(datetimeLine || text);

    // 人数/席位
    let peopleLine = cleanLead(get(["人数","予約人数","Seats","Guests","Party Size","People"]));
    let seat = cleanLead(get(["席","席位","お席","席種","Seat","Seating"]));

    // 兼容：人数: 2 人 / 席: カウンター
    const ps = splitPeopleSeat(peopleLine);
    const people = ps.people || peopleLine || "";
    if (!seat && ps.seat) seat = ps.seat;

    // 地址/电话
    let address = cleanLead(get(["住所","所在地","Address","Venue Address","Location"]));
    if (!address) address = guessAddress(lines);

    let phone = cleanLead(get(["電話番号","電話","TEL","Tel","Phone","Telephone","Contact"]));
    if (!phone) phone = (text.match(/(\d{2,4}-\d{2,4}-\d{3,4})/) || [""])[0];

    // 套餐/金额
    let course = cleanLead(get(["コース","コース名","Course","Menu","Package","Plan"]));
    let price = cleanLead(get(["総額","合計","料金","金額","Total Price","Total","Price"]));
    if (!price) price = (text.match(/[¥￥]\s?[\d,]+/) || [""])[0];

    // 频度/要望/备注
    const frequency = cleanLead(get(["来店頻度","来店频度","Frequency","Visit Frequency"]));
    const request = cleanLead(get(["ご要望","要望","备注","Remarks","Note","Request"]));

    // 其它说明：比如“行き方はこちら”
    const note = lines.find(l => /行き方|ご覧ください|Please be at the restaurant|NO SHOW/i.test(l)) || "";

    // 兜底：防止空店名
    if (!restaurant) restaurant = guessRestaurant(lines, { rid, guest });

    return {
      rid,
      restaurant: removeLeadingBoxes(restaurant),
      guest: removeLeadingBoxes(guest),
      date: date || "—",
      time: time || "—",
      people: formatPeople(people),
      seat: removeLeadingBoxes(seat) || "—",
      address,
      phone,
      course,
      price,
      frequency,
      request,
      note
    };
  }

  // ========== 解析工具 ==========
  function normalize(s) {
    return String(s || "")
      .replace(/\r\n/g, "\n")
      .replace(/\t/g, " ")
      .replace(/[ ]{2,}/g, " ")
      .trim();
  }

  function cleanLead(s) {
    return String(s || "").replace(/^[■□◆●・▶▷►◼︎\-\*]+\s*/g, "").trim();
  }

  function removeLeadingBoxes(s) {
    return String(s || "").replace(/^[■□◆●◼︎]+/g, "").trim();
  }

  // ✅ 支持：key: value / key：value / key : value / key： value / key\nvalue
  function pickValueFlexible(lines, keys) {
    const keySet = keys.map(k => String(k));

    // 1) 同行 key + 冒号 + value
    for (const line of lines) {
      for (const k of keySet) {
        // 允许前后空格 + 半角/全角冒号
        const re = new RegExp(`^\\s*${escapeRe(k)}\\s*[:：]\\s*(.+)$`, "i");
        const m = line.match(re);
        if (m && m[1]) return m[1].trim();
      }
    }

    // 2) key 单独一行，值在下一行
    for (let i = 0; i < lines.length; i++) {
      for (const k of keySet) {
        const re = new RegExp(`^\\s*${escapeRe(k)}\\s*$`, "i");
        if (re.test(lines[i])) {
          for (let j = i + 1; j < Math.min(lines.length, i + 6); j++) {
            if (lines[j]) return lines[j].trim();
          }
        }
      }
    }
    return "";
  }

  function escapeRe(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function splitPeopleSeat(s) {
    const str = String(s || "").trim();
    if (!str) return { people: "", seat: "" };
    // 2人 / カウンター
    const m = str.match(/(\d{1,2}\s*(?:人|名)?)\s*\/\s*(.+)$/);
    if (m) return { people: m[1].trim(), seat: m[2].trim() };

    // 2 人
    const n = str.match(/(\d{1,2})/);
    return { people: n ? `${n[1]}名` : str, seat: "" };
  }

  // ✅ 修复：无年份日期（01月09日(金) 18:00） => 01/09
  function parseDateTime(anyText) {
    const s = String(anyText || "");

    // 有年份（日文）
    const mj = s.match(/(\d{4})年(\d{1,2})月(\d{1,2})日.*?(\d{1,2}:\d{2})/);
    if (mj) {
      const yyyy = mj[1];
      const mm = String(mj[2]).padStart(2, "0");
      const dd = String(mj[3]).padStart(2, "0");
      return { date: `${yyyy}/${mm}/${dd}`, time: mj[4] };
    }

    // ✅ 无年份（日文）：01月09日(金) 18:00
    const mj2 = s.match(/(\d{1,2})月(\d{1,2})日.*?(\d{1,2}:\d{2})/);
    if (mj2) {
      const mm = String(mj2[1]).padStart(2, "0");
      const dd = String(mj2[2]).padStart(2, "0");
      return { date: `${mm}/${dd}`, time: mj2[3] };
    }

    // 2026-01-15 17:00 / 2026/01/15 17:00
    const m2 = s.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2}).*?(\d{1,2}:\d{2})/);
    if (m2) {
      const yyyy = m2[1];
      const mm = String(m2[2]).padStart(2, "0");
      const dd = String(m2[3]).padStart(2, "0");
      return { date: `${yyyy}/${mm}/${dd}`, time: m2[4] };
    }

    // 英文：Date + Time
    const time = (s.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))/i) || s.match(/(\d{1,2}:\d{2})/))?.[1] || "";
    const dp = Date.parse(s);
    if (!Number.isNaN(dp)) {
      const d = new Date(dp);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return { date: `${yyyy}/${mm}/${dd}`, time: time || "" };
    }

    // 兜底
    const t3 = s.match(/(\d{1,2}:\d{2})/)?.[1] || "";
    return { date: "", time: t3 };
  }

  function formatPeople(p) {
    const s = String(p || "").trim();
    if (!s) return "—";
    const m = s.match(/(\d{1,2})/);
    if (m) return `${m[1]}名`;
    return cleanLead(s);
  }

  function guessAddress(lines) {
    const idx = lines.findIndex(l => /(〒|北海道|東京都|Tokyo|Japan|区|市|町|Chome|City)/i.test(l));
    if (idx < 0) return "";
    let addr = cleanLead(lines[idx]);
    const next = lines[idx + 1] || "";
    if (next && !/(人数|コース|予約|日時|Time|Date|Seats|Total|Price|金額|電話)/i.test(next)) {
      addr += " " + cleanLead(next);
    }
    return addr.trim();
  }

  function guessRestaurant(lines, known) {
    const bad = /(予約|id|no\.|日時|日付|時間|人数|住所|電話|phone|address|date|time|seats|guests|total|price|要望|頻度)/i;
    for (const l of lines) {
      const v = removeLeadingBoxes(cleanLead(l));
      if (!v) continue;
      if (known?.rid && v.includes(known.rid)) continue;
      if (known?.guest && v.includes(known.guest)) continue;
      if (bad.test(v)) continue;
      if (v.length >= 2 && v.length <= 30) return v;
    }
    return "";
  }

  // ========== icon ==========
  function drawIcon(type, x, y, s, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = Math.max(2, Math.floor(s * 0.10));
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (type === "calendar") {
      ctx.strokeRect(x, y + s * 0.15, s, s * 0.85);
      ctx.beginPath();
      ctx.moveTo(x, y + s * 0.33);
      ctx.lineTo(x + s, y + s * 0.33);
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
      const cy = y + s * 0.34;
      const r = s * 0.17;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx, cy + r + s * 0.06);
      ctx.lineTo(cx, y + s * 0.82);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.22, y + s * 0.60);
      ctx.lineTo(cx + s * 0.22, y + s * 0.60);
      ctx.stroke();
    } else if (type === "seat") {
      const sx = x + s * 0.22;
      const sy = y + s * 0.18;
      const sw = s * 0.56;
      const sh = s * 0.62;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx, sy + sh * 0.55);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(sx, sy + sh * 0.55);
      ctx.lineTo(sx + sw, sy + sh * 0.55);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(sx + sw, sy + sh * 0.55);
      ctx.lineTo(sx + sw, sy + sh);
      ctx.moveTo(sx + sw * 0.35, sy + sh * 0.55);
      ctx.lineTo(sx + sw * 0.35, sy + sh);
      ctx.stroke();
    }

    ctx.restore();
  }

  // ========== 文本工具 ==========
  function fitFontOneLine(text, maxW, maxFont, minFont, weight, family) {
    const t = String(text || "");
    let size = maxFont;
    ctx.save();
    while (size >= minFont) {
      ctx.font = `${weight} ${size}px ${family}`;
      if (ctx.measureText(t).width <= maxW) {
        ctx.restore();
        return size;
      }
      size -= 2;
    }
    ctx.restore();
    return minFont;
  }

  function drawMultilineAutoFit({ text, x, y, w, h, maxFont, minFont, lineHeight, color, weight, family }) {
    const t = String(text || "").trim();
    if (!t) return;

    ctx.save();
    ctx.fillStyle = color;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    let fontSize = maxFont;
    while (fontSize >= minFont) {
      ctx.font = `${weight} ${fontSize}px ${family}`;
      const lines = wrapText(t, w, ctx);
      const totalH = lines.length * fontSize * lineHeight;
      if (totalH <= h) {
        let yy = y;
        for (const line of lines) {
          ctx.fillText(line, x, yy);
          yy += fontSize * lineHeight;
        }
        ctx.restore();
        return;
      }
      fontSize -= 2;
    }

    ctx.font = `${weight} ${minFont}px ${family}`;
    const lines = wrapText(t, w, ctx);
    const maxLines = Math.max(1, Math.floor(h / (minFont * lineHeight)));
    const clipped = lines.slice(0, maxLines);
    if (clipped.length) clipped[clipped.length - 1] = clipEllipsis(clipped[clipped.length - 1]);

    let yy = y;
    for (const line of clipped) {
      ctx.fillText(line, x, yy);
      yy += minFont * lineHeight;
    }
    ctx.restore();
  }

  function wrapText(text, maxWidth, ctx) {
    const paragraphs = text.split("\n");
    const lines = [];
    for (const p of paragraphs) {
      if (!p.trim()) {
        lines.push("");
        continue;
      }
      const tokens = splitKeepWords(p);
      let line = "";
      for (const tok of tokens) {
        const test = line ? line + tok : tok;
        if (ctx.measureText(test).width <= maxWidth) line = test;
        else {
          if (line) lines.push(line);
          line = tok.trimStart();
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

  function clipEllipsis(line) {
    if (!line) return "…";
    if (line.length <= 2) return "…";
    return line.slice(0, Math.max(0, line.length - 2)) + "…";
  }

  // ========== 画模板/画错误 ==========
  function drawTemplateOnly(text) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(templateImg, 0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,.80)";
    ctx.font = "28px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    ctx.restore();
  }

  function drawError(msg) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ff6b6b";
    ctx.font = "20px monospace";
    const lines = String(msg).split("\n");
    let y = 80;
    for (const l of lines) {
      ctx.fillText(l, 40, y);
      y += 28;
    }
  }
})();
