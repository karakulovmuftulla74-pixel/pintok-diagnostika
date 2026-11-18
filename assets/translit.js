(function () {
  var STORAGE_KEY = "pintok_kaa_script";
  var KEEP_RE = /(https?:\/\/\S+|t\.me\/\S+|\+998[\d\s\-()]+|\bPINTOK\b|\bEAU\b|\bTelegram\b|\bPDF\b)/g;

  // Қарақалпақша Кирилл -> Қарақалпақша Латын (2016)
  var CYR_TO_LAT = {
    "А": "A", "а": "a",
    "Ә": "Á", "ә": "á",
    "Б": "B", "б": "b",
    "В": "V", "в": "v",
    "Г": "G", "г": "g",
    "Ғ": "Ǵ", "ғ": "ǵ",
    "Д": "D", "д": "d",
    "Е": "E", "е": "e",
    "Ё": "Yo", "ё": "yo",
    "Ж": "J", "ж": "j",
    "З": "Z", "з": "z",
    "И": "I", "и": "i",
    "Й": "Y", "й": "y",
    "К": "K", "к": "k",
    "Қ": "Q", "қ": "q",
    "Л": "L", "л": "l",
    "М": "M", "м": "m",
    "Н": "N", "н": "n",
    "Ң": "Ń", "ң": "ń",
    "О": "O", "о": "o",
    "Ө": "Ó", "ө": "ó",
    "П": "P", "п": "p",
    "Р": "R", "р": "r",
    "С": "S", "с": "s",
    "Т": "T", "т": "t",
    "У": "U", "у": "u",
    "Ү": "Ú", "ү": "ú",
    "Ў": "W", "ў": "w",
    "Ф": "F", "ф": "f",
    "Х": "X", "х": "x",
    "Ҳ": "H", "ҳ": "h",
    "Ц": "C", "ц": "c",
    "Ч": "Ch", "ч": "ch",
    "Ш": "Sh", "ш": "sh",
    "Щ": "Sh", "щ": "sh",
    "Ъ": "", "ъ": "",
    "Ы": "Í", "ы": "ı",
    "Ь": "", "ь": "",
    "Э": "E", "э": "e",
    "Ю": "Yu", "ю": "yu",
    "Я": "Ya", "я": "ya"
  };

  function convertChunkToLat(str) {
    if (!str) return str;
    var out = "";
    for (var i = 0; i < str.length; i++) {
      var ch = str[i];
      var rep = CYR_TO_LAT[ch];
      if (rep === undefined) {
        out += ch;
      } else {
        // Егер сөз толық бас ҳәриплерден ибарат болса, диграфты да бас ҳәрип етиў (SH, CH, YA...)
        if (rep.length > 1 && ch === ch.toUpperCase() && ch !== ch.toLowerCase()) {
          var next = str[i + 1] || "";
          var prev = str[i - 1] || "";
          var isAllCaps = (next && next === next.toUpperCase() && next !== next.toLowerCase()) ||
                          (prev && prev === prev.toUpperCase() && prev !== prev.toLowerCase());
          out += isAllCaps ? rep.toUpperCase() : rep;
        } else {
          out += rep;
        }
      }
    }
    return out;
  }

  function toLat(text) {
    if (!text || !/[А-Яа-яЁёӘәҒғҚқҢңӨөҮүЎўҲҳ]/.test(text)) return text;
    var result = "";
    var last = 0;
    KEEP_RE.lastIndex = 0;
    var m;
    while ((m = KEEP_RE.exec(text)) !== null) {
      result += convertChunkToLat(text.slice(last, m.index));
      result += m[0];
      last = m.index + m[0].length;
    }
    result += convertChunkToLat(text.slice(last));
    return result;
  }

  function getInitialLang() {
    try {
      var sp = new URLSearchParams(window.location.search);
      var q = sp.get("l");
      if (q === "cyr" || q === "lat") {
        localStorage.setItem(STORAGE_KEY, q);
        return q;
      }
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "cyr" || saved === "lat") return saved;
    } catch (e) {}
    // Тийкарғы әлипбе — Қарақалпақша Кирилл
    return "cyr";
  }

  var currentLang = getInitialLang();
  var observer = null;
  var applying = false;

  function processTextNode(node) {
    if (!node || !node.parentNode) return;
    var tag = node.parentNode.nodeName;
    if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT") return;
    if (node.parentNode.closest && node.parentNode.closest("[data-no-translit]")) return;

    if (typeof node.__origText !== "string") {
      node.__origText = node.nodeValue;
    }
    if (currentLang === "lat") {
      var converted = toLat(node.__origText);
      if (node.nodeValue !== converted) {
        node.nodeValue = converted;
      }
    } else {
      if (node.nodeValue !== node.__origText) {
        node.nodeValue = node.__origText;
      }
    }
  }

  function processElementAttrs(el) {
    if (!el || el.nodeType !== 1) return;
    if (el.hasAttribute("data-no-translit")) return;
    if (el.hasAttribute("placeholder")) {
      if (typeof el.__origPh !== "string") {
        el.__origPh = el.getAttribute("placeholder");
      }
      var ph = currentLang === "lat" ? toLat(el.__origPh) : el.__origPh;
      if (el.getAttribute("placeholder") !== ph) {
        el.setAttribute("placeholder", ph);
      }
    }
  }

  function walkAndApply(root) {
    if (!root) return;
    applying = true;
    try {
      var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
      var n;
      while ((n = walker.nextNode())) {
        processTextNode(n);
      }
      if (root.querySelectorAll) {
        var els = root.querySelectorAll("[placeholder]");
        for (var i = 0; i < els.length; i++) {
          processElementAttrs(els[i]);
        }
      }
      if (typeof document.__origTitle !== "string") {
        document.__origTitle = document.title;
      }
      document.title = currentLang === "lat" ? toLat(document.__origTitle) : document.__origTitle;
    } finally {
      if (observer) observer.takeRecords();
      applying = false;
    }
  }

  function updateButton() {
    var btn = document.getElementById("langbtn");
    if (!btn) return;
    btn.textContent = currentLang === "cyr" ? "Latın" : "Кирилл";
    btn.setAttribute("aria-label", currentLang === "cyr" ? "Latın álipbesine ótiw" : "Кирилл әлипбесине өтиў");
  }

  function setLang(lang) {
    currentLang = lang === "lat" ? "lat" : "cyr";
    try {
      localStorage.setItem(STORAGE_KEY, currentLang);
      if (window.location.protocol !== "file:") {
        var url = new URL(window.location.href);
        url.searchParams.set("l", currentLang);
        window.history.replaceState({}, "", url.toString());
      }
    } catch (e) {}
    updateButton();
    walkAndApply(document.body);
  }

  function initTranslit() {
    var slot = document.getElementById("lang-slot");
    if (slot && !document.getElementById("langbtn")) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.id = "langbtn";
      btn.className = "lang";
      btn.setAttribute("data-no-translit", "1");
      btn.addEventListener("click", function () {
        setLang(currentLang === "cyr" ? "lat" : "cyr");
      });
      slot.appendChild(btn);
    }
    updateButton();
    if (currentLang === "lat") {
      walkAndApply(document.body);
    }

    if (typeof MutationObserver !== "undefined" && !observer) {
      observer = new MutationObserver(function (mutations) {
        if (applying) return;
        for (var i = 0; i < mutations.length; i++) {
          var m = mutations[i];
          if (m.type === "childList") {
            for (var j = 0; j < m.addedNodes.length; j++) {
              var node = m.addedNodes[j];
              if (node.nodeType === 3) {
                node.__origText = node.nodeValue;
                if (currentLang === "lat") {
                  applying = true;
                  processTextNode(node);
                  if (observer) observer.takeRecords();
                  applying = false;
                }
              } else if (node.nodeType === 1) {
                if (currentLang === "lat") {
                  walkAndApply(node);
                }
              }
            }
          } else if (m.type === "characterData") {
            var target = m.target;
            if (typeof target.__origText === "string" &&
                (target.nodeValue === toLat(target.__origText) || target.nodeValue === target.__origText)) {
              continue;
            }
            target.__origText = target.nodeValue;
            if (currentLang === "lat") {
              applying = true;
              processTextNode(target);
              if (observer) observer.takeRecords();
              applying = false;
            }
          }
        }
      });
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
      });
    }
  }

  window.TRANSLIT = {
    getLang: function () { return currentLang; },
    setLang: setLang,
    toLat: toLat,
    refresh: function () {
      if (currentLang === "lat") walkAndApply(document.body);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTranslit);
  } else {
    initTranslit();
  }
})();
