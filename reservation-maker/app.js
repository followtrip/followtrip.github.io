// ================================
// Reservation Card Generator (SAFE VERSION)
// ================================
(() => {
  const inputEl = document.getElementById("input");
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const btnGenerate = document.getElementById("btnGenerate");
  const btnDownload = document.getElementById("btnDownload");

  let templateReady = false;
  let lastDataURL = null;

  btnGenerate.disabled = true;
  btnDownload.disabled = true;

  // ---------- Load Template (ANTI BLACK SCREEN) ----------
  const template = new Image();
  template.src = `./template.png?v=${Date.now()}`;

  template.onload = () => {
    templateReady = true;
    canvas.width = template.naturalWidth;
    canvas.height = template.naturalHeight;
    btnGenerate.disabled = false;
    drawTemplateOnly("请粘贴预约信息后点击生成");
  };

  template.onerror = () => {
    canvas.width = 1200;
    canvas.height = 700;
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    ctx.font = "24px sans-serif";
    ctx.fillText("❌ template.png 加载失败", 50, 100);
    ctx.fillText("请确认 template.png 与 app.js 在同一目录", 50, 150);
  };

  btnGenerate.onclick = () => {
    if (!templateReady) return;
    const raw = inputEl.value.trim();
    if (!raw) return alert("请先粘贴预约信息");
    render(raw);
    btnDownload.disabled = false;
  };

  btnDownload.onclick = () => {
    if (!lastDataURL) return;
    const a = document.createElement("a");
    a.href = lastDataURL;
    a.download = "reservation.png";
    a.click();
  };

  // ---------- Core Render ----------
  function render(raw) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(template, 0, 0);

    const f = parseFields(raw);
    drawCard(f);

    lastDataURL = canvas.toDataURL("image/png");
  }

  function drawTemplateOnly(text) {
    ctx.drawImage(template, 0, 0);
    ctx.fillStyle = "rgba(255,255,255,.8)";
    ctx.font = "28px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(text, canvas.width / 2, canvas.height * 0.55);
    ctx.textAlign = "left";
    lastDataURL = canvas.toDataURL();
  }

  // ---------- Layout ----------
  function drawCard(f) {
    const GOLD = "#d7b46a";
    const WHITE = "#f3f3f4";

    const centerX = canvas.width / 2;
    let y = canvas.height * 0.32;

    // 店名
    ctx.fillStyle = WHITE;
    ctx.font = "700 56px serif";
    ctx.textAlign = "center";
    ctx.fillText(f.restaurant || "—", centerX, y);

    // 预约人
    y += 60;
    ctx.font = "600 32px sans-serif";
    ctx.fillText(f.guest || "—", centerX, y);

    // ---------- Icon Row ----------
    y += 70;
    drawIconRow(
      y,
      f.date || "—",
      f.time || "—",
      f.people || "—",
      f.seat || "—"
    );

    // ---------- Detail ----------
    y += 90;
    ctx.textAlign = "left";
    ctx.font = "500 28px sans-serif";
    let left = canvas.width * 0.18;

    if (f.address) drawLine("地址：" + f.address);
    if (f.phone) drawLine("电话：" + f.phone);
    if (f.course) drawLine("套餐：" + f.course);
    if (f.price) drawLine("金额：" + f.price);

    function drawLine(t) {
      ctx.fillStyle = WHITE;
      ctx.fillText(t, left, y);
      y += 40;
    }
  }

  function drawIconRow(y, date, time, people, seat) {
    const GOLD = "#d7b46a";
    const WHITE = "#f3f3f4";
    const items = [
      ["日期", date],
      ["时间", time],
      ["人数", people],
      ["席位", seat],
    ];

    const startX = canvas.width * 0.16;
    const gap = canvas.width * 0.17;

    ctx.font = "600 22px sans-serif";
    items.forEach((it, i) => {
      const x = startX + i * gap;
      ctx.fillStyle = GOLD;
      ctx.fillText(it[0], x, y);
      ctx.fillStyle = WHITE;
      ctx.font = "700 30px sans-serif";
      ctx.fillText(it[1], x, y + 34);
      ctx.font = "600 22px sans-serif";
    });
  }

  // ---------- Field Parser (TIME FIXED) ----------
  function parseFields(raw) {
    const text = raw.replace(/\r/g, "");
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

    const pick = keys => {
      for (let i = 0; i < lines.length; i++) {
        for (const k of keys) {
          if (lines[i].startsWith(k)) {
            return lines[i + 1] || "";
          }
          if (lines[i].includes(k + ":")) {
            return lines[i].split(":").slice(1).join(":").trim();
          }
        }
      }
      return "";
    };

    // ---- Date ----
    let date = pick(["Date", "日期", "日付", "日時"]);
    const dMatch =
      text.match(/(\d{4}年\d{1,2}月\d{1,2}日)/) ||
      text.match(/(\d{4}\/\d{1,2}\/\d{1,2})/) ||
      text.match(/(February|January|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s*\d{4}/i);
    if (dMatch) date = formatDate(dMatch[1]);

    // ---- Time (核心修复) ----
    let time = pick(["Time", "时间"]);
    const tMatch =
      text.match(/(\d{1,2}:\d{2}\s?(AM|PM))/i) ||
      text.match(/(\d{1,2}:\d{2})/);
    if (tMatch) time = tMatch[1];

    return {
      restaurant: pick(["Restaurant", "店舗名", "店名"]) || guess(lines),
      guest: pick(["Reservation Name", "予約名", "预约人", "Name"]),
      date: date ? date.replace(/[()（）].*$/, "") : "",
      time,
      people: pick(["Seats", "人数"]) || (text.match(/(\d+)\s*(人|名)/) || [])[1],
      seat: pick(["Seat", "席"]),
      address: pick(["Address", "住所"]),
      phone: pick(["Phone", "电话", "電話"]),
      course: pick(["Course", "コース"]),
      price: pick(["Total", "金额", "金額"])
    };
  }

  function formatDate(d) {
    const t = Date.parse(d);
    if (!isNaN(t)) {
      const dt = new Date(t);
      return `${dt.getFullYear()}/${String(dt.getMonth()+1).padStart(2,"0")}/${String(dt.getDate()).padStart(2,"0")}`;
    }
    const m = d.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (m) return `${m[1]}/${m[2].padStart(2,"0")}/${m[3].padStart(2,"0")}`;
    return d;
  }

  function guess(lines) {
    return lines.find(l => l.length < 30 && !/\d/.test(l)) || "";
  }
})();
