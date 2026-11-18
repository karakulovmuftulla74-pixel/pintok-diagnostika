(function () {
  var CFG = window.CONFIG || {};
  var C = window.CONTENT || {};
  var LETTERS = ["A", "B", "C", "D", "E"];
  var DONE_KEY = "pintok_kaa_done_jz";

  var state = {
    step: 0,
    answers: [],
    result: null,
    submitting: false
  };

  function $(id) {
    return document.getElementById(id);
  }

  function showScreen(id) {
    var screens = document.querySelectorAll(".screen");
    for (var i = 0; i < screens.length; i++) {
      screens[i].hidden = screens[i].id !== id;
    }
    var ctaBar = $("cta-bar");
    if (ctaBar && id !== "s-intro") {
      ctaBar.classList.remove("show");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (window.TRANSLIT) window.TRANSLIT.refresh();
  }

  function formatPhoneDigits(raw) {
    var d = String(raw || "").replace(/\D/g, "");
    if (d.indexOf("998") === 0) {
      d = d.slice(3);
    }
    d = d.slice(0, 9);
    if (!d.length) return "";
    var out = "+998 ";
    if (d.length > 0) out += d.slice(0, 2);
    if (d.length > 2) out += " " + d.slice(2, 5);
    if (d.length > 5) out += " " + d.slice(5, 7);
    if (d.length > 7) out += " " + d.slice(7, 9);
    return out;
  }

  function extract9Digits(raw) {
    var d = String(raw || "").replace(/\D/g, "");
    if (d.indexOf("998") === 0) {
      d = d.slice(3);
    }
    return d.slice(0, 9);
  }

  function getAnswerLabel(qIdx) {
    var ans = state.answers[qIdx];
    if (typeof ans === "number" && C.questions[qIdx] && C.questions[qIdx].opts[ans]) {
      return C.questions[qIdx].opts[ans];
    }
    return "";
  }

  function buildPlainMessage(payload) {
    if (payload.stage === "contact") {
      return [
        "📲 Байланыс усылы таңланды — " + (CFG.CLINIC_NAME || "PINTOK клиникасы"),
        "",
        "Аты: " + payload.name,
        "Телефон: " + payload.phoneDisplay,
        "Қолайлы усыл: " + payload.contactMethod
      ].join("\n");
    }
    var lines = [
      "🩺 ЖАҢА АРЗА — " + (CFG.CLINIC_NAME || "PINTOK клиникасы"),
      "",
      "Аты: " + payload.name,
      "Телефон: " + payload.phoneDisplay,
      "Тест нәтийжеси: " + payload.levelName
    ];
    if (payload.age) lines.push("Жасы: " + payload.age);
    if (payload.since) lines.push("Қашаннан берли: " + payload.since);
    if (payload.disease) lines.push("Диабет / Қан басымы: " + payload.disease);
    if (payload.drug) lines.push("Дәри сынап көрген бе: " + payload.drug);
    if (payload.worry) lines.push("Тийкарғы қәўетер: " + payload.worry);
    lines.push("");
    lines.push("Мәнзил: " + (CFG.CLINIC_ADDRESS || ""));
    return lines.join("\n");
  }

  function buildTelegramDirectUrl(payload) {
    var num = CFG.TELEGRAM_PHONE || "998905768080";
    var text = [
      "Ассалаўма әлейкум, " + (CFG.CLINIC_NAME || "PINTOK клиникасы") + "!",
      "Көрикке жазылдым, қосымша сораўым бар еди.",
      "Аты: " + payload.name,
      "Телефон: " + payload.phoneDisplay
    ].join("\n");
    return "https://t.me/+" + num + "?text=" + encodeURIComponent(text);
  }

  function sendDirectBot(payload) {
    if (!CFG.TG_BOT_TOKEN || !CFG.TG_CHAT_ID) {
      return Promise.resolve({ ok: false, error: "telegram_not_configured" });
    }
    var chats = String(CFG.TG_CHAT_ID).split(",").map(function (c) { return c.trim(); }).filter(Boolean);
    var text = buildPlainMessage(payload);
    return Promise.all(
      chats.map(function (chatId) {
        return fetch("https://api.telegram.org/bot" + CFG.TG_BOT_TOKEN + "/sendMessage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: text })
        }).then(function (r) { return r.json(); }).catch(function () { return { ok: false }; });
      })
    ).then(function (results) {
      var anyOk = results.some(function (r) { return r && r.ok; });
      return { ok: anyOk, error: anyOk ? null : "telegram_send_failed" };
    });
  }

  function sendLeadToServer(payload) {
    var endpoint = CFG.LEAD_ENDPOINT || "/api/lead";
    if (window.location.protocol === "file:") {
      return sendDirectBot(payload);
    }
    return fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        return res.json().catch(function () { return { ok: false, error: "bad_response" }; }).then(function (data) {
          if (res.ok && data && data.ok) return { ok: true };
          return { ok: false, status: res.status, error: (data && data.error) || ("http_" + res.status) };
        });
      })
      .catch(function () {
        return { ok: false, error: "network_error" };
      })
      .then(function (result) {
        if (result.ok) return result;
        if (CFG.TG_BOT_TOKEN && CFG.TG_CHAT_ID) {
          return sendDirectBot(payload);
        }
        return result;
      });
  }

  function renderIntro() {
    var whoEl = $("who");
    if (whoEl && C.hero && C.hero.who) {
      whoEl.innerHTML = C.hero.who.map(function (item, idx) {
        return "<li><b>0" + (idx + 1) + "</b><span>" + item + "</span></li>";
      }).join("");
    }

    var getsEl = $("gets");
    if (getsEl && C.gets) {
      getsEl.innerHTML = C.gets.map(function (item) {
        return "<li>" + item + "</li>";
      }).join("");
    }

    var statsEl = $("trust");
    if (statsEl && C.doctor && C.doctor.stats) {
      statsEl.innerHTML = C.doctor.stats.map(function (st) {
        return '<div class="ti"><div class="tn">' + st.n + '</div><div class="tl">' + st.l + "</div></div>";
      }).join("");
    }

    var faqEl = $("faq");
    if (faqEl && C.faq) {
      faqEl.innerHTML = C.faq.map(function (f) {
        return "<details><summary>" + f.q + '</summary><div class="fa">' + f.a + "</div></details>";
      }).join("");
    }
  }

  function renderQuestion() {
    var qObj = C.questions[state.step];
    var total = C.questions.length;
    var numStr = state.step + 1 < 10 ? "0" + (state.step + 1) : String(state.step + 1);
    $("pnum").innerHTML = numStr + "<small>/ " + total + "</small>";

    var segsHtml = "";
    for (var k = 0; k < total; k++) {
      segsHtml += '<i class="' + (k <= state.step ? "on" : "") + '"></i>';
    }
    $("segs").innerHTML = segsHtml;
    $("qtxt").textContent = qObj.q;

    var optsEl = $("opts");
    optsEl.innerHTML = "";
    qObj.opts.forEach(function (label, idx) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "opt" + (state.answers[state.step] === idx ? " sel" : "");
      btn.innerHTML = "<i>" + LETTERS[idx] + "</i><span>" + label + "</span>";
      btn.addEventListener("click", function () {
        selectOption(idx, btn);
      });
      optsEl.appendChild(btn);
    });

    $("back").hidden = state.step === 0;
    if (window.TRANSLIT) window.TRANSLIT.refresh();
  }

  var advancing = false;
  function selectOption(idx, btn) {
    if (advancing) return;
    advancing = true;
    state.answers[state.step] = idx;

    var all = $("opts").querySelectorAll(".opt");
    for (var i = 0; i < all.length; i++) {
      all[i].classList.remove("sel");
    }
    btn.classList.add("sel");

    setTimeout(function () {
      advancing = false;
      if (state.step < C.questions.length - 1) {
        state.step++;
        renderQuestion();
      } else {
        finishQuiz();
      }
    }, 180);
  }

  function finishQuiz() {
    var scored = window.scoreJZ(state.answers);
    var lvObj = C.levels[scored.lv];
    state.result = { sum: scored.sum, lv: scored.lv, info: lvObj };

    var lvBox = $("lvbox");
    lvBox.style.setProperty("--c", lvObj.color);
    $("lvname").textContent = lvObj.name;
    $("lvdesc").textContent = lvObj.desc;

    var msegs = lvBox.querySelectorAll(".mseg");
    for (var i = 0; i < msegs.length; i++) {
      var mLv = Number(msegs[i].getAttribute("data-lv"));
      msegs[i].classList.toggle("on", mLv <= scored.lv);
      msegs[i].classList.toggle("cur", mLv === scored.lv);
    }

    $("types").innerHTML = C.types.map(function (t) {
      return (
        '<div class="tcard">' +
          '<div class="ic" aria-hidden="true">' + t.ic + "</div>" +
          '<div><div class="tt">' + t.t + '</div><p class="td">' + t.d + "</p></div>" +
        "</div>"
      );
    }).join("");

    $("steps").innerHTML = C.steps.map(function (s, idx) {
      return (
        '<div class="step">' +
          '<div class="n">' + (idx + 1) + "</div>" +
          '<div><div class="st">' + s.t + "</div>" +
          (s.d ? '<div class="sd">' + s.d + "</div>" : "") +
          "</div>" +
        "</div>"
      );
    }).join("");

    $("why").textContent = C.why;
    $("ftag").textContent = C.clinicOffer.tag;
    $("ftitle").textContent = C.clinicOffer.title;
    $("flist").innerHTML = C.clinicOffer.items.map(function (it) {
      return "<li>" + it + "</li>";
    }).join("");
    $("faddr").textContent = C.clinicOffer.address;
    $("fnote").textContent = C.clinicOffer.note;

    $("gtag").textContent = C.guide.tag;
    $("gtitle").textContent = C.guide.title;
    $("gdesc").textContent = C.guide.desc;
    $("gfoot").textContent = C.guide.foot;

    showScreen("s-res");
  }

  function renderDone(payload) {
    $("donename").textContent = payload.name;
    $("donephone").textContent = payload.phoneDisplay;
    $("donelevel").textContent = payload.levelName;

    var tgBtn = $("tgbtn");
    tgBtn.href = buildTelegramDirectUrl(payload);

    var callBtn = $("callbtn");
    callBtn.href = "tel:" + (CFG.PHONE_RAW || "+998905768080");
    callBtn.textContent = "📞 Клиникаға қоңыраў: " + (CFG.PHONE_DISPLAY || "+998 90 576-80-80");

    $("days").textContent = CFG.DOCTOR_DAYS || "";

    var howEl = $("how");
    howEl.innerHTML = "";
    $("final").hidden = true;
    (C.contactMethods || []).forEach(function (method, idx) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "opt";
      b.innerHTML = "<i>" + LETTERS[idx] + "</i><span>" + method + "</span>";
      b.addEventListener("click", function () {
        var all = howEl.querySelectorAll(".opt");
        for (var j = 0; j < all.length; j++) all[j].classList.remove("sel");
        b.classList.add("sel");
        $("howtxt").textContent = method;
        $("final").hidden = false;
        $("final").scrollIntoView({ behavior: "smooth", block: "nearest" });
        if (window.TRANSLIT) window.TRANSLIT.refresh();

        sendLeadToServer({
          stage: "contact",
          clinicName: CFG.CLINIC_NAME,
          name: payload.name,
          phone: payload.phone,
          phoneDisplay: payload.phoneDisplay,
          contactMethod: method
        });
      });
      howEl.appendChild(b);
    });

    showScreen("s-done");
  }

  function setupBookingForm() {
    var nameInput = $("name");
    var phoneInput = $("phone");
    var errEl = $("perr");
    var sendBtn = $("send");

    phoneInput.addEventListener("focus", function () {
      if (!phoneInput.value.trim()) {
        phoneInput.value = "+998 ";
      }
    });

    phoneInput.addEventListener("input", function () {
      var digits = extract9Digits(phoneInput.value);
      phoneInput.value = digits.length ? formatPhoneDigits(digits) : "+998 ";
      errEl.hidden = true;
    });

    nameInput.addEventListener("input", function () {
      errEl.hidden = true;
    });

    sendBtn.addEventListener("click", function () {
      if (state.submitting) return;
      var nameVal = nameInput.value.trim();
      var digits = extract9Digits(phoneInput.value);

      if (nameVal.length < 2) {
        errEl.textContent = "Өтиниш, атыңызды жазың.";
        errEl.hidden = false;
        if (window.TRANSLIT) window.TRANSLIT.refresh();
        nameInput.focus();
        return;
      }
      if (digits.length !== 9) {
        errEl.textContent = "Номер толық емес. +998 ден кейин 9 сан киргизиң.";
        errEl.hidden = false;
        if (window.TRANSLIT) window.TRANSLIT.refresh();
        phoneInput.focus();
        return;
      }

      errEl.hidden = true;
      state.submitting = true;
      sendBtn.disabled = true;
      sendBtn.textContent = "Жиберилип атыр...";
      if (window.TRANSLIT) window.TRANSLIT.refresh();

      var phoneFull = "+998" + digits;
      var phoneFormatted = formatPhoneDigits(digits);
      var lvObj = state.result ? state.result.info : C.levels[2];

      var payload = {
        stage: "lead",
        clinicName: CFG.CLINIC_NAME,
        address: CFG.CLINIC_ADDRESS,
        name: nameVal,
        phone: phoneFull,
        phoneDisplay: phoneFormatted,
        level: state.result ? state.result.lv : 2,
        levelName: lvObj.name,
        age: getAnswerLabel(0),
        since: getAnswerLabel(1),
        disease: getAnswerLabel(7),
        drug: getAnswerLabel(8),
        worry: getAnswerLabel(9),
        lang: window.TRANSLIT ? window.TRANSLIT.getLang() : "cyr",
        ts: Date.now()
      };

      sendLeadToServer(payload).then(function (res) {
        state.submitting = false;
        sendBtn.disabled = false;
        sendBtn.textContent = "Жибериў →";
        if (window.TRANSLIT) window.TRANSLIT.refresh();

        if (res && res.ok) {
          try {
            sessionStorage.setItem(DONE_KEY, JSON.stringify(payload));
          } catch (e) {}
          renderDone(payload);
        } else {
          errEl.textContent = "Арза жибериўде байланыс қәтелиги болды. Өтиниш, +998 90 576-80-80 номерине қоңыраў етиң ямаса қайталап көриң.";
          errEl.hidden = false;
          if (window.TRANSLIT) window.TRANSLIT.refresh();
        }
      });
    });
  }

  function setupStickyCta() {
    var heroCta = $("hero-cta");
    var ctaBar = $("cta-bar");
    var intro = $("s-intro");
    if (!heroCta || !ctaBar || typeof IntersectionObserver === "undefined") return;

    var io = new IntersectionObserver(function (entries) {
      var entry = entries[0];
      if (!intro.hidden) {
        ctaBar.classList.toggle("show", !entry.isIntersecting);
      } else {
        ctaBar.classList.remove("show");
      }
    }, { threshold: 0.1 });

    io.observe(heroCta);
  }

  function startQuiz() {
    state.step = 0;
    state.answers = [];
    state.result = null;
    try { sessionStorage.removeItem(DONE_KEY); } catch (e) {}
    showScreen("s-q");
    renderQuestion();
  }

  function init() {
    renderIntro();
    setupBookingForm();
    setupStickyCta();

    var startButtons = document.querySelectorAll("[data-start]");
    for (var i = 0; i < startButtons.length; i++) {
      startButtons[i].addEventListener("click", startQuiz);
    }

    $("back").addEventListener("click", function () {
      if (state.step > 0) {
        state.step--;
        renderQuestion();
      }
    });

    $("restart").addEventListener("click", startQuiz);
    $("restart2").addEventListener("click", startQuiz);

    try {
      var saved = sessionStorage.getItem(DONE_KEY);
      if (saved) {
        var parsed = JSON.parse(saved);
        if (parsed && parsed.ts && Date.now() - parsed.ts < 3600000) {
          renderDone(parsed);
        }
      }
    } catch (e) {}
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
