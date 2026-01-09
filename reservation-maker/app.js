// ===== 餐厅预约确认函生成器（稳定地基版）=====

document.addEventListener("DOMContentLoaded", () => {
  const inputEl = document.getElementById("input");
  const canvas = document.getElementById("canvas");
  const btnGenerate = document.getElementById("btnGenerate");
  const btnDownload = document.getElementById("btnDownload");

  if (!inputEl || !canvas || !btnGenerate || !btnDownload) {
    alert("❌ HTML 结构不完整：请确认 input / canvas / btnGenerate / btnDownload 存在");
    return;
  }

  const ctx = canvas.getContext("2d");
  let lastDataURL = null;

  // ===== 加载模板 =====
  const templateImg = new Image();
  templateImg.src = "./template.png?v=" + Date.now();

  templateImg.onload = () => {
    canvas.width = templateImg.naturalWidth;
    canvas.height = templateImg.naturalHeight;

    ctx.drawImage(templateImg, 0, 0);
    drawHint("请粘贴预约信息，然后点击「生成图片」");

    btnGenerate.disabled = false;
  };

  templateImg.onerror = () => {
    alert("❌ template.png 加载失败，请确认文件名与路径完全一致");
  };

  // ===== 生成按钮 =====
  btnGenerate.onclick = () => {
    const raw = inputEl.value.trim();
    if (!raw) {
      alert("请先粘贴预约信息");
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(templateImg, 0, 0);

    const data = extractBasicFields(raw);
    drawCard(data);

    lastDataURL = canvas.toDataURL("image/png");
    btnDownload.disabled = false;
  };

  // ===== 下载 =====
  btnDownload.onclick = () => {
    if (!lastDataURL) return;
    const a = document.createElement("a");
    a.href = lastDataURL;
    a.download = "预约确认函.png";
    a.click();
  };

  // ================= 核心绘制 =================

  function drawCard(d) {
    const GOLD = "#d7b46a";
    const WHITE = "#f5f5f5";

    const centerX = canvas.width / 2;

    // ---- 店名（居中）----
    ctx.fillStyle = WHITE;
    ctx.font = "700 56px serif";
    ctx.textAlign = "center";
    ctx.fillText(d.restaurant || "（未识别店名）", centerX, 520);

    // ---- 预约人 ----
    ctx.font = "500 36px sans-serif";
    ctx.fillText(d.guest || "（未识别预约人）", centerX, 590);

    // ---- 预约号 ----
    if (d.rid) {
      ctx.fillStyle = GOLD;
      ctx.font = "600 28px sans-serif";
      ctx.fillText("NO. " + d.rid, centerX, 640);
    }

    // ---- 信息块 ----
    ctx.textAlign = "left";
    ctx.fillStyle = WHITE;
    ctx.font = "28px sans-serif";

    let y = 740;
    drawLine("日期", d.date, 300, y); y += 44;
    drawLine("时间", d.time, 300, y); y += 44;
    drawLine("人数", d.people, 300, y); y += 44;
    drawLine("席位", d.seat, 300, y); y += 44;

    if (d.address) {
      y += 20;
      drawLine("地址", d.address, 300, y);
    }
  }

  function drawLine(label, value, x, y) {
    ctx.fillStyle = "#d7b46a";
    ctx.fillText(label + "：", x, y);
    ctx.fillStyle = "#f5f5f5";
    ctx.fillText(value || "—", x + 90, y);
  }

  function drawHint(text) {
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = "28px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  }

  // ================= 字段提取（稳定版） =================

  function extractBasicFields(raw) {
    const t = raw.replace(/\r/g, "");

    return {
      restaurant: pick(t, ["店舗名", "店名", "Restaurant"]),
      guest: pick(t, ["予約名", "予約人", "Reservation Name", "Name"]),
      rid: pick(t, ["予約ID", "予約番号", "NO", "Reservation ID"]),
      date: pick(t, ["日時", "日付", "Date"]),
      time: pick(t, ["時間", "Time"]),
      people: pick(t, ["人数", "Seats", "Guests"]),
      seat: pick(t, ["席", "席位", "Seat", "カウンター"]),
      address: pick(t, ["住所", "Address", "東京都"])
    };
  }

  function pick(text, keys) {
    for (const k of keys) {
      const re = new RegExp(k + "[：:\\s]*([^\\n]+)", "i");
      const m = text.match(re);
      if (m) return m[1].trim();
    }
    return "";
  }
});
