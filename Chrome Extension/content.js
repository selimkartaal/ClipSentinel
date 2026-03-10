(() => {
  const SETTINGS_KEY = "clipsentinel_settings_v1";
  const USAGE_KEY    = "clipsentinel_daily_usage_v1";
  const CHAR_LIMIT   = 2000;

  let SETTINGS = {
    backendUrl: "http://127.0.0.1:5000",
    language: "TR",
    dailyLimit: 10,
    debug: true,
    sameFieldBypass: false,
    siteRules: {}
  };
  let SETTINGS_LOADED = false;

  let PAGE_CAN_COPY      = true;
  let PAGE_CAN_PASTE     = true;
  let PAGE_STEALTH_COPY  = false;
  let PAGE_BLOCK_UPLOAD  = false;

  let NATIVE_IMAGE_ALLOW_UNTIL = 0;
  let NATIVE_IMAGE_ALLOW_ONCE  = false;

  const CS_HANDLED      = "__clipsentinel_paste_handled__";
  const CS_COPY_HANDLED = "__clipsentinel_copy_handled__";

  const I18N = {
    TR: {
      title:               "ClipSentinel • Paste Onayı",
      copyConfirmTitle:    "ClipSentinel • Copy Onayı",
      tokens:              "Tokens",
      cancel:              "İptal Et",
      accept:              "Kabul Ediyorum",
      limitMsg:            (n) => `🚫 Günlük limit doldu (${n}). Yarın tekrar deneyin.`,
      imgNote:             "Görsel tespit edildi. Kabul edersen backend'e gönderilecek.",
      imgUnsupported:      "Bu alana resim yapıştırma desteklenmiyor.",
      chatModelAcceptHint: "✅ Onaylandı. Yüklemek için şimdi Ctrl+V'ye tekrar bas.",
      charLimitExceeded:   "🚫 Karakter limiti aşıldı! Kabul edemezsin.",
      copyBlocked:         "🔒 Copy bu sitede engellendi.",
      pasteBlocked:        "🔒 Paste bu sitede engellendi.",
      uploadBlocked:       "🔒 Dosya yükleme bu sitede engellendi.",
      copyPermBlocked:     "🔒 Copy kalıcı olarak engellendi. Admin müdahalesi gerekli.",
      copyTempBlocked:     (min) => `🔒 Copy ${min} dk engellendi.`,
      blockApplied:        (label) => `🚫 Çok fazla kopyalama! ${label} blok uygulandı.`,
      blockPermanent:      "kalıcı",
      blockMinutes:        (n) => `${n} dakika`,
      characters:          (n) => `${n} karakter`,
      charsOf:             (n, max) => `${n} / ${max} karakter`,
    },
    EN: {
      title:               "ClipSentinel • Paste Confirmation",
      copyConfirmTitle:    "ClipSentinel • Copy Confirmation",
      tokens:              "Tokens",
      cancel:              "Cancel",
      accept:              "I Accept",
      limitMsg:            (n) => `🚫 Daily limit reached (${n}). Try again tomorrow.`,
      imgNote:             "Image detected. If you accept, it will be sent to backend.",
      imgUnsupported:      "Image paste is not supported in this field.",
      chatModelAcceptHint: "✅ Approved. Now press Ctrl+V again to upload.",
      charLimitExceeded:   "🚫 Character limit exceeded! Cannot accept.",
      copyBlocked:         "🔒 Copy is blocked on this site.",
      pasteBlocked:        "🔒 Paste is blocked on this site.",
      uploadBlocked:       "🔒 File upload is blocked on this site.",
      copyPermBlocked:     "🔒 Copy permanently blocked. Admin intervention required.",
      copyTempBlocked:     (min) => `🔒 Copy blocked for ${min} min.`,
      blockApplied:        (label) => `🚫 Too many copies! Block applied: ${label}.`,
      blockPermanent:      "permanent",
      blockMinutes:        (n) => `${n} minutes`,
      characters:          (n) => `${n} characters`,
      charsOf:             (n, max) => `${n} / ${max} characters`,
    },
    DE: {
      title:               "ClipSentinel • Einfüge-Bestätigung",
      copyConfirmTitle:    "ClipSentinel • Kopier-Bestätigung",
      tokens:              "Tokens",
      cancel:              "Abbrechen",
      accept:              "Ich stimme zu",
      limitMsg:            (n) => `🚫 Tageslimit erreicht (${n}). Morgen erneut versuchen.`,
      imgNote:             "Bild erkannt. Bei Zustimmung wird es an das Backend gesendet.",
      imgUnsupported:      "In dieses Feld kann kein Bild eingefügt werden.",
      chatModelAcceptHint: "✅ Bestätigt. Jetzt Strg+V erneut drücken, um hochzuladen.",
      charLimitExceeded:   "🚫 Zeichenlimit überschritten! Kann nicht bestätigt werden.",
      copyBlocked:         "🔒 Kopieren ist auf dieser Seite blockiert.",
      pasteBlocked:        "🔒 Einfügen ist auf dieser Seite blockiert.",
      uploadBlocked:       "🔒 Datei-Upload ist auf dieser Seite blockiert.",
      copyPermBlocked:     "🔒 Kopieren dauerhaft blockiert. Admin-Eingriff erforderlich.",
      copyTempBlocked:     (min) => `🔒 Kopieren für ${min} Min. blockiert.`,
      blockApplied:        (label) => `🚫 Zu viele Kopiervorgänge! Sperre angewendet: ${label}.`,
      blockPermanent:      "dauerhaft",
      blockMinutes:        (n) => `${n} Minuten`,
      characters:          (n) => `${n} Zeichen`,
      charsOf:             (n, max) => `${n} / ${max} Zeichen`,
    },
  };

  const t   = (k, ...args) => { const d = I18N[SETTINGS.language] || I18N.TR; const v = d[k]; return typeof v === "function" ? v(...args) : v; };
  const dbg = (...args)    => { if (SETTINGS.debug) console.log("[ClipSentinel]", ...args); };

  // ─── Site kurallarını uygula ──────────────────────────────────────────────
  function applyPageRules() {
    const hostname = location.hostname.replace(/^www\./, "");
    const rules    = SETTINGS.siteRules || {};
    const matchKey = Object.keys(rules).find(
      (rule) => hostname === rule || hostname.endsWith("." + rule)
    );
    if (matchKey) {
      PAGE_CAN_COPY     = rules[matchKey].canCopy        !== false;
      PAGE_CAN_PASTE    = rules[matchKey].canPaste       !== false;
      PAGE_STEALTH_COPY = !!rules[matchKey].stealthCopy;
      PAGE_BLOCK_UPLOAD = !!rules[matchKey].blockFileUpload;
    } else {
      PAGE_CAN_COPY     = true;
      PAGE_CAN_PASTE    = true;
      PAGE_STEALTH_COPY = false;
      PAGE_BLOCK_UPLOAD = false;
    }
    dbg(`Rules → canCopy=${PAGE_CAN_COPY} canPaste=${PAGE_CAN_PASTE} stealth=${PAGE_STEALTH_COPY} blockUpload=${PAGE_BLOCK_UPLOAD}`);

    if (PAGE_BLOCK_UPLOAD) blockUploadButtons();
  }

  // ─── Settings ────────────────────────────────────────────────────────────
  async function loadSettings() {
    const res = await chrome.storage.local.get([SETTINGS_KEY]);
    SETTINGS = { ...SETTINGS, ...(res?.[SETTINGS_KEY] || {}) };
    SETTINGS_LOADED = true;
    applyPageRules();
    dbg("Settings loaded", SETTINGS);
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    const val = changes[SETTINGS_KEY]?.newValue;
    if (!val) return;
    SETTINGS = { ...SETTINGS, ...val };
    SETTINGS_LOADED = true;
    applyPageRules();
  });

  // ─── Usage ───────────────────────────────────────────────────────────────
  const todayKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  };

  function getUsage() {
    return new Promise((resolve) => {
      chrome.storage.local.get([USAGE_KEY], (res) => {
        const cur = res?.[USAGE_KEY];
        if (!cur || cur.date !== todayKey()) resolve({ date: todayKey(), used: 0 });
        else resolve({ date: cur.date, used: Number(cur.used) || 0 });
      });
    });
  }

  const setUsage = (u) => new Promise((resolve) => chrome.storage.local.set({ [USAGE_KEY]: u }, resolve));

  async function getRemaining() {
    const limit = Number(SETTINGS.dailyLimit);
    if (limit === -1) return Infinity;
    const u = await getUsage();
    return Math.max(0, limit - u.used);
  }

  async function consumeToken() {
    const limit = Number(SETTINGS.dailyLimit);
    if (limit === -1) return true;
    const u = await getUsage();
    if (u.used >= limit) return false;
    u.used += 1;
    await setUsage(u);
    return true;
  }

  // ─── Editable helpers ────────────────────────────────────────────────────
  function getEditableTarget(el) {
    if (!el) return null;
    const tag = (el.tagName || "").toLowerCase();
    if (tag === "textarea") return el;
    if (tag === "input") {
      const type = (el.getAttribute("type") || "text").toLowerCase();
      if (!["button","submit","checkbox","radio","file"].includes(type)) return el;
      return null;
    }
    return el.closest?.('[contenteditable="true"],[contenteditable=""],[contenteditable="plaintext-only"]') || null;
  }

  function targetLikelySupportsImagePaste(tgt) {
    if (!tgt) return false;
    const tag = (tgt.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea") return false;
    if (tgt.isContentEditable) return true;
    return !!tgt.closest?.('[contenteditable="true"],[contenteditable=""],[contenteditable="plaintext-only"]');
  }

  function insertText(tgt, text) {
    if (!tgt) return false;
    try { tgt.focus?.(); } catch {}
    const tag = (tgt.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea") {
      const s = tgt.selectionStart ?? tgt.value.length;
      const e = tgt.selectionEnd   ?? tgt.value.length;
      tgt.setRangeText(text, s, e, "end");
      tgt.dispatchEvent(new Event("input",  { bubbles: true }));
      tgt.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }
    try {
      (tgt.ownerDocument || document).execCommand?.("insertText", false, text);
      tgt.dispatchEvent(new Event("input",  { bubbles: true }));
      tgt.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    } catch { return false; }
  }

  // ─── Caret ───────────────────────────────────────────────────────────────
  function saveCaret(tgt) {
    if (!tgt) return null;
    try {
      const tag = (tgt.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea")
        return { kind: "input", start: tgt.selectionStart ?? 0, end: tgt.selectionEnd ?? 0 };
      const sel = (tgt.ownerDocument || document).defaultView?.getSelection?.();
      if (sel?.rangeCount) return { kind: "ce", range: sel.getRangeAt(0).cloneRange() };
    } catch {}
    return null;
  }

  function restoreCaret(tgt, caret) {
    if (!tgt || !caret) return;
    try { tgt.focus?.(); } catch {}
    const tag = (tgt.tagName || "").toLowerCase();
    if (caret.kind === "input" && (tag === "input" || tag === "textarea")) {
      try { tgt.setSelectionRange(caret.start, caret.end); } catch {}
      return;
    }
    if (caret.kind === "ce" && caret.range) {
      try {
        const sel = (tgt.ownerDocument || document).defaultView?.getSelection?.();
        if (sel) { sel.removeAllRanges(); sel.addRange(caret.range); }
      } catch {}
    }
  }

  // ─── UI Helpers ──────────────────────────────────────────────────────────
  let activeModal = null;
  let lastTarget  = null;
  let lastCopied  = { el: null, ts: 0 };

  function closeModal() { activeModal?.remove(); activeModal = null; }

  function createOverlayBase() {
    const o = document.createElement("div");
    Object.assign(o.style, {
      position: "fixed", inset: "0", zIndex: "2147483647",
      display: "flex", alignItems: "center", justifyContent: "center"
    });
    return o;
  }

  function showCenterBlockMessage(msg, ms = 900) {
    const id = "__clipsentinel_center__";
    document.getElementById(id)?.remove();
    const overlay = createOverlayBase();
    overlay.id = id;
    overlay.style.background = "rgba(0,0,0,0.45)";
    const box = document.createElement("div");
    Object.assign(box.style, {
      background: "#111", color: "#fff", padding: "18px 26px",
      borderRadius: "14px", fontSize: "16px", fontWeight: "800",
      boxShadow: "0 30px 70px rgba(0,0,0,0.45)", textAlign: "center"
    });
    box.textContent = msg;
    overlay.appendChild(box);
    document.documentElement.appendChild(overlay);
    setTimeout(() => overlay.remove(), ms);
  }

  function getCharColor(len) {
    if (len <= 500)  return "#4ade80";
    if (len <= 1000) return "#facc15";
    if (len <= 1500) return "#fb923c";
    if (len <= 2000) return "#f87171";
    return "#ef4444";
  }

  function makeBox() {
    const box = document.createElement("div");
    Object.assign(box.style, {
      background: "#111", color: "#fff", padding: "18px",
      borderRadius: "16px", width: "min(640px,95vw)",
      fontFamily: "system-ui,-apple-system,Segoe UI,Roboto,Arial",
      boxShadow: "0 20px 60px rgba(0,0,0,0.35)"
    });
    return box;
  }

  function makeBtn(text, primary = false) {
    const btn = document.createElement("button");
    btn.textContent = text;
    Object.assign(btn.style, {
      padding: "10px 12px", borderRadius: "10px", cursor: "pointer",
      fontWeight: "800", border: primary ? "0" : "1px solid rgba(255,255,255,0.18)",
      background: primary ? "#2b7cff" : "transparent",
      color: "#fff", transition: "opacity 0.2s"
    });
    return btn;
  }

  // ─── Upload Buton Engelleme ───────────────────────────────────────────────
  const UPLOAD_OVERLAY_CLASS = "__clipsentinel_upload_overlay__";
  let uploadObserver = null;

  const UPLOAD_SELECTORS = [
    "button[aria-label='Dosya ekle']",
    "button[aria-label='Attach files']",
    "button[aria-label='Add photos and files']",
    "button[aria-label='Fotoğraf ve dosya ekle']",
    "[data-testid='composer-button-plus']",
    "button[aria-label='Add content']",
    "button[aria-label='İçerik ekle']",
    "button[aria-label='Upload image']",
    "button[aria-label='Görsel yükle']",
    "button[aria-label='Attach']",
    "input[type='file']",
  ];

  function overlayElement(el) {
    if (el.dataset.csUploadBlocked) return;
    el.dataset.csUploadBlocked = "1";

    if ((el.tagName || "").toLowerCase() === "input") {
      el.disabled = true;
      el.style.pointerEvents = "none";
      return;
    }

    const parent = el.parentElement;
    if (!parent) return;
    if (getComputedStyle(parent).position === "static") {
      parent.style.position = "relative";
    }

    const overlay = document.createElement("div");
    overlay.className = UPLOAD_OVERLAY_CLASS;
    Object.assign(overlay.style, {
      position:   "absolute",
      inset:      "0",
      zIndex:     "9999",
      cursor:     "not-allowed",
      background: "transparent",
    });

    overlay.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      showCenterBlockMessage(t("uploadBlocked"), 1500);
    });

    overlay.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
    });

    parent.appendChild(overlay);
  }

  function scanAndBlock() {
    if (!PAGE_BLOCK_UPLOAD) return;
    UPLOAD_SELECTORS.forEach((sel) => {
      try { document.querySelectorAll(sel).forEach((el) => overlayElement(el)); } catch {}
    });
  }

  function blockUploadButtons() {
    scanAndBlock();
    if (uploadObserver) return;
    uploadObserver = new MutationObserver(() => scanAndBlock());
    uploadObserver.observe(document.body || document.documentElement, {
      childList: true,
      subtree:   true,
    });
    dbg("Upload observer started");
  }

  // ─── Copy Onay Modalı ────────────────────────────────────────────────────
  function openCopyModal(text, onAccept, onCancel) {
    closeModal();
    const overlay = createOverlayBase();
    overlay.style.background = "rgba(0,0,0,0.5)";
    overlay.style.padding    = "16px";

    const box    = makeBox();
    const header = document.createElement("div");
    Object.assign(header.style, { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"10px" });
    const title  = document.createElement("strong");
    title.textContent = t("copyConfirmTitle");
    header.appendChild(title);
    box.appendChild(header);

    const ta = document.createElement("textarea");
    ta.readOnly = true;
    ta.value    = text;
    Object.assign(ta.style, {
      width:"100%", height:"180px", background:"#222", color:"#fff",
      borderRadius:"10px", padding:"10px", marginBottom:"6px",
      border:"1px solid rgba(255,255,255,0.12)", boxSizing:"border-box", resize:"none"
    });
    box.appendChild(ta);

    const charBar = document.createElement("div");
    Object.assign(charBar.style, { marginBottom:"10px", fontSize:"12px", fontWeight:"700" });
    charBar.style.color = getCharColor(text.length);
    charBar.textContent = t("characters", text.length);
    box.appendChild(charBar);

    const footer    = document.createElement("div");
    Object.assign(footer.style, { display:"flex", gap:"10px", justifyContent:"flex-end" });
    const cancelBtn = makeBtn(t("cancel"), false);
    const acceptBtn = makeBtn(t("accept"), true);
    footer.append(cancelBtn, acceptBtn);
    box.appendChild(footer);
    overlay.appendChild(box);
    document.documentElement.appendChild(overlay);
    activeModal = overlay;

    cancelBtn.onclick = () => { closeModal(); onCancel?.(); };
    acceptBtn.onclick = () => { closeModal(); onAccept?.(); };
    overlay.tabIndex  = -1;
    overlay.focus();
    overlay.addEventListener("keydown",   (e) => { if (e.key === "Escape") { closeModal(); onCancel?.(); } });
    overlay.addEventListener("mousedown", (e) => { if (e.target === overlay) { closeModal(); onCancel?.(); } });
  }

  // ─── Paste Onay Modalı ───────────────────────────────────────────────────
  function openModal(clip, remaining, targetRef, caret) {
    closeModal();
    const overlay = createOverlayBase();
    overlay.style.background = "rgba(0,0,0,0.5)";
    overlay.style.padding    = "16px";

    const box    = makeBox();
    const header = document.createElement("div");
    Object.assign(header.style, { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"10px" });
    const title  = document.createElement("strong");
    title.textContent = t("title");
    const tokens = document.createElement("span");
    const lim    = Number(SETTINGS.dailyLimit);
    tokens.textContent = `${t("tokens")}: ${lim === -1 ? "∞" : `${remaining}/${lim}`}`;
    header.append(title, tokens);
    box.appendChild(header);

    const cancelBtn = makeBtn(t("cancel"), false);
    const acceptBtn = makeBtn(t("accept"), true);

    if (clip.type === "text") {
      const ta = document.createElement("textarea");
      ta.readOnly = true;
      ta.value    = clip.data || "";
      Object.assign(ta.style, {
        width:"100%", height:"180px", background:"#222", color:"#fff",
        borderRadius:"10px", padding:"10px", marginBottom:"6px",
        border:"1px solid rgba(255,255,255,0.12)", boxSizing:"border-box", resize:"none"
      });
      box.appendChild(ta);

      const charBar = document.createElement("div");
      Object.assign(charBar.style, { marginBottom:"10px", fontSize:"12px", fontWeight:"700", transition:"color 0.25s" });

      function updateCharBar(len) {
        const exceeded = len > CHAR_LIMIT;
        charBar.style.color  = getCharColor(len);
        charBar.textContent  = exceeded
          ? `${t("charsOf", len, CHAR_LIMIT)} — ${t("charLimitExceeded")}`
          : t("charsOf", len, CHAR_LIMIT);
        acceptBtn.disabled      = exceeded;
        acceptBtn.style.opacity = exceeded ? "0.35" : "1";
        acceptBtn.style.cursor  = exceeded ? "not-allowed" : "pointer";
      }
      updateCharBar((clip.data || "").length);
      box.appendChild(charBar);
      setTimeout(() => ta.focus(), 0);
    } else {
      const img = document.createElement("img");
      img.src   = clip.previewSrc || clip.data || "";
      Object.assign(img.style, { maxWidth:"100%", maxHeight:"320px", display:"block", borderRadius:"10px", marginBottom:"10px" });
      box.appendChild(img);
      const note = document.createElement("div");
      note.textContent = t("imgNote");
      Object.assign(note.style, { fontSize:"12px", opacity:"0.75", marginBottom:"10px" });
      box.appendChild(note);
    }

    const footer = document.createElement("div");
    Object.assign(footer.style, { display:"flex", gap:"10px", justifyContent:"flex-end" });
    footer.append(cancelBtn, acceptBtn);
    box.appendChild(footer);
    overlay.appendChild(box);
    document.documentElement.appendChild(overlay);
    activeModal = overlay;

    cancelBtn.onclick = () => closeModal();
    acceptBtn.onclick = async () => {
      closeModal();
      restoreCaret(targetRef, caret);
      let inserted = false;

      if (clip.type === "text") {
        inserted = insertText(targetRef, clip.data || "");
      } else if (clip.type === "image") {
        if (!targetLikelySupportsImagePaste(targetRef)) {
          showCenterBlockMessage(t("imgUnsupported"), 1200);
          return;
        }
        NATIVE_IMAGE_ALLOW_ONCE  = true;
        NATIVE_IMAGE_ALLOW_UNTIL = Date.now() + 15000;
        try { targetRef.focus?.(); } catch {}
        showCenterBlockMessage(t("chatModelAcceptHint"), 800);
        inserted = true;
      }

      if (!inserted) return;
      const ok = await consumeToken();
      if (!ok) { showCenterBlockMessage(t("limitMsg", Number(SETTINGS.dailyLimit))); return; }

      chrome.runtime.sendMessage({
        type: "SEND_CLIPBOARD", act: "paste",
        clipType: clip.type, mime: clip.mime, data: clip.data
      });
    };

    overlay.tabIndex = -1;
    overlay.focus();
    overlay.addEventListener("keydown",   (e) => { if (e.key === "Escape") closeModal(); });
    overlay.addEventListener("mousedown", (e) => { if (e.target === overlay) closeModal(); });
  }

  // ─── Clipboard snapshot ──────────────────────────────────────────────────
  function snapshotClipboard(e) {
    const cd = e.clipboardData;
    let text = "";
    try { text = cd?.getData("text/plain") || cd?.getData("text") || ""; } catch {}
    let imageBlob = null, imageMime = "image/png";
    try {
      for (const it of (cd?.items || [])) {
        if (it?.kind === "file" && (it.type || "").startsWith("image/")) {
          imageBlob = it.getAsFile?.() || null;
          imageMime = it.type || imageMime;
          break;
        }
      }
    } catch {}
    if (!imageBlob) {
      try {
        const f = cd?.files?.[0];
        if (f && (f.type || "").startsWith("image/")) { imageBlob = f; imageMime = f.type; }
      } catch {}
    }
    return { text, imageBlob, imageMime };
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onloadend = () => resolve(String(r.result || ""));
      r.onerror   = reject;
      r.readAsDataURL(blob);
    });
  }

  // ─── COPY handler ────────────────────────────────────────────────────────
  async function handleCopy(e) {
    if (e[CS_COPY_HANDLED]) return;
    try { e[CS_COPY_HANDLED] = true; } catch {}

    const hostname = location.hostname.replace(/^www\./, "");

    const blockRes = await chrome.runtime.sendMessage({ type: "CHECK_BLOCK", hostname });
    if (blockRes?.blocked) {
      e.preventDefault();
      e.stopImmediatePropagation();
      const msg = blockRes.permanent
        ? t("copyPermBlocked")
        : t("copyTempBlocked", Math.ceil(blockRes.remainingSeconds / 60));
      showCenterBlockMessage(msg, 2500);
      return;
    }

    if (!PAGE_CAN_COPY) {
      e.preventDefault();
      e.stopImmediatePropagation();
      showCenterBlockMessage(t("copyBlocked"), 1200);
      chrome.runtime.sendMessage({
        type: "COPY_EVENT", hostname,
        clipType: "text", mime: "text/plain", data: "", pageUrl: location.href
      });
      return;
    }

    let selectedText = "";
    try { selectedText = window.getSelection?.()?.toString() || ""; } catch {}
    if (!selectedText) return;

    if (PAGE_STEALTH_COPY) {
      chrome.runtime.sendMessage({
        type: "COPY_EVENT", hostname,
        clipType: "text", mime: "text/plain",
        data: selectedText, pageUrl: location.href
      });
      return;
    }

    e.preventDefault();
    e.stopImmediatePropagation();

    openCopyModal(
      selectedText,
      async () => {
        try {
          await navigator.clipboard.writeText(selectedText);
        } catch {
          const ta = document.createElement("textarea");
          ta.value = selectedText;
          Object.assign(ta.style, { position:"fixed", opacity:"0" });
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          ta.remove();
        }
        const ok = await consumeToken();
        if (!ok) { showCenterBlockMessage(t("limitMsg", Number(SETTINGS.dailyLimit))); return; }
        chrome.runtime.sendMessage({
          type: "COPY_EVENT", hostname,
          clipType: "text", mime: "text/plain",
          data: selectedText, pageUrl: location.href
        });
      },
      () => {}
    );
  }

  // ─── PASTE handler ───────────────────────────────────────────────────────
  async function handlePaste(e) {
    if (!e || e[CS_HANDLED]) return;
    try { e[CS_HANDLED] = true; } catch {}
    if (e.defaultPrevented) return;

    if (!PAGE_CAN_PASTE) {
      e.preventDefault();
      e.stopImmediatePropagation();
      showCenterBlockMessage(t("pasteBlocked"), 1200);
      return;
    }

    const target = getEditableTarget(e.target) || getEditableTarget(document.activeElement) || lastTarget;
    if (!target) return;

    if (SETTINGS.sameFieldBypass) {
      if (lastCopied.el === target && Date.now() - lastCopied.ts < 5 * 60 * 1000) return;
    }

    if (activeModal) { e.preventDefault(); e.stopImmediatePropagation?.(); return; }

    const snap    = snapshotClipboard(e);
    const isImage = !!snap.imageBlob;

    if (isImage && NATIVE_IMAGE_ALLOW_ONCE && Date.now() <= NATIVE_IMAGE_ALLOW_UNTIL) {
      NATIVE_IMAGE_ALLOW_ONCE  = false;
      NATIVE_IMAGE_ALLOW_UNTIL = 0;
      document.getElementById("__clipsentinel_center__")?.remove();
      return;
    }

    e.preventDefault();
    e.stopImmediatePropagation?.();

    lastTarget = target;
    const caret = saveCaret(target);
    if (!SETTINGS_LOADED) await loadSettings();

    const remaining = await getRemaining();
    if (remaining <= 0) { showCenterBlockMessage(t("limitMsg", Number(SETTINGS.dailyLimit))); return; }

    if (isImage) {
      const previewSrc = (() => { try { return URL.createObjectURL(snap.imageBlob); } catch { return ""; } })();
      let dataUrl = "";
      try { dataUrl = await blobToDataUrl(snap.imageBlob); } catch {}
      openModal({ type:"image", mime:snap.imageMime, blob:snap.imageBlob, data:dataUrl, previewSrc }, remaining, lastTarget, caret);
      return;
    }

    openModal({ type:"text", mime:"text/plain", data:snap.text || "" }, remaining, lastTarget, caret);
  }

  // ─── Background'dan BLOCK_APPLIED mesajı ─────────────────────────────────
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === "BLOCK_APPLIED" && msg.hostname === location.hostname.replace(/^www\./, "")) {
      PAGE_CAN_COPY = false;
      const label = msg.permanent ? t("blockPermanent") : t("blockMinutes", msg.stepVal);
      showCenterBlockMessage(t("blockApplied", label), 3000);
    }
  });

  // ─── Focus / copy tracking ───────────────────────────────────────────────
  function updateLastTarget(e) {
    const tgt = getEditableTarget(e.target) || getEditableTarget(document.activeElement);
    if (tgt) lastTarget = tgt;
  }

  document.addEventListener("focusin", updateLastTarget, true);
  window.addEventListener("copy", (e) => {
    const tgt = getEditableTarget(e.target) || getEditableTarget(document.activeElement);
    if (tgt) lastCopied = { el: tgt, ts: Date.now() };
  }, true);

  window.addEventListener("copy",  handleCopy,  true);
  document.addEventListener("copy",  handleCopy,  true);
  window.addEventListener("paste", handlePaste, true);
  document.addEventListener("paste", handlePaste, true);

  dbg("Content script active", { href: location.href, host: location.hostname });
  loadSettings();
})();