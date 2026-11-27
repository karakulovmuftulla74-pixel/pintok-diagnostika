function esc(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatLeadHtml(data) {
  var clinic = esc(data.clinicName || "PINTOK клиникасы");
  var addr = esc(data.address || "Шымбай районы, 5-этажлы емлеўхана қасында жайласқан PINTOK клиникасы");

  if (data.stage === "pre_test") {
    return [
      "📝 <b>ТЕСТ БАСЛАНДЫ — " + clinic + "</b>",
      "",
      "👤 <b>Аты:</b> " + esc(data.name),
      "📞 <b>Телефон:</b> " + esc(data.phoneDisplay || data.phone),
      "ℹ️ <i>Наўқас бийпул тестти баслады</i>"
    ].join("\n");
  }

  if (data.stage === "contact") {
    return [
      "📲 <b>Байланыс усылы таңланды — " + clinic + "</b>",
      "",
      "👤 <b>Аты:</b> " + esc(data.name),
      "📞 <b>Телефон:</b> " + esc(data.phoneDisplay || data.phone),
      "✅ <b>Қолайлы усыл:</b> " + esc(data.contactMethod)
    ].join("\n");
  }

  var lines = [
    "🩺 <b>ЖАҢА АРЗА — " + clinic + "</b>",
    "",
    "👤 <b>Аты:</b> " + esc(data.name),
    "📞 <b>Телефон:</b> " + esc(data.phoneDisplay || data.phone),
    "📊 <b>Тест нәтийжеси:</b> " + esc(data.levelName || "—")
  ];

  if (data.age) lines.push("🎂 <b>Жасы:</b> " + esc(data.age));
  if (data.since) lines.push("⏱ <b>Қашаннан берли:</b> " + esc(data.since));
  if (data.disease) lines.push("🫀 <b>Диабет / Қан басымы:</b> " + esc(data.disease));
  if (data.drug) lines.push("💊 <b>Дәри сынап көрген бе:</b> " + esc(data.drug));
  if (data.worry) lines.push("💬 <b>Тийкарғы қәўетер:</b> " + esc(data.worry));

  lines.push("");
  lines.push("📍 <i>" + addr + "</i>");
  return lines.join("\n");
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  var token = (process.env.TG_BOT_TOKEN || "").trim();
  var rawChats = (process.env.TG_CHAT_ID || "").trim();

  if (!token || !rawChats) {
    return res.status(503).json({
      ok: false,
      error: "telegram_not_configured"
    });
  }

  var body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (e) {
      return res.status(400).json({ ok: false, error: "invalid_json" });
    }
  }
  body = body || {};

  var name = String(body.name || "").trim();
  var phone = String(body.phone || "").replace(/\D/g, "");
  if (name.length < 2 || phone.length < 9) {
    return res.status(400).json({ ok: false, error: "invalid_fields" });
  }

  var text = formatLeadHtml(body);
  var chatIds = rawChats.split(",").map(function (c) { return c.trim(); }).filter(Boolean);

  try {
    var delivered = 0;
    var lastErr = null;

    for (var i = 0; i < chatIds.length; i++) {
      var tgRes = await fetch("https://api.telegram.org/bot" + token + "/sendMessage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatIds[i],
          text: text,
          parse_mode: "HTML",
          disable_web_page_preview: true
        })
      });
      var tgJson = await tgRes.json().catch(function () { return {}; });
      if (tgRes.ok && tgJson.ok) {
        delivered++;
      } else {
        lastErr = tgJson.description || ("HTTP " + tgRes.status);
      }
    }

    if (delivered > 0) {
      return res.status(200).json({ ok: true, delivered: delivered });
    }
    return res.status(502).json({ ok: false, error: lastErr || "telegram_send_failed" });
  } catch (err) {
    return res.status(500).json({ ok: false, error: "network_error" });
  }
};
