let adminPw = "";
const $ = (id) => document.getElementById(id);

function show(el, msg) { el.style.display = "block"; el.textContent = msg; }
function hide(el)      { el.style.display = "none";  el.textContent = ""; }

// ─── i18n ─────────────────────────────────────────────────────────────────────
const I18N = {
  TR: {
    stateLocked:          "Kilitli",
    stateUnlocked:        "Kilitsiz",
    subtitleHint:         "Günlük limit: -1 → limitsiz  |  Blok adımları: son adım -1 → kalıcı",
    lblAdminPw:           "Admin Parolası",
    btnUnlock:            "Kilidi Aç",
    btnLock:              "Kilitle",
    msgUnlocked:          "Kilit açıldı.",
    msgWrongPw:           "Yanlış Parola.",
    lblBackendUrl:        "Backend URL (örn: http://127.0.0.1:5000)",
    lblLanguage:          "Dil",
    lblDailyLimit:        "Günlük Limit (-1 = limitsiz)",
    lblSiteRules:         "Site Kuralları — Kopyalama / Yapıştırma / Gizli Mod",
    thSite:               "Site",
    newSitePlaceholder:   "örn: notion.so",
    btnAddSite:           "+ Site Ekle",
    lblCopyThrottle:      "Kopyalama Eşiği & Blok",
    lblCopyThreshold:     "Eşik — kaç ardarda kopyalama sonrasında blok tetiklesin",
    lblCounterReset:      "Sayaç sıfırlama (dakika)",
    lblBlockSteps:        "Blok adımları (dakika, virgülle ayır — -1 = kalıcı)",
    hintBlockSteps:       "Örn: 1, 5, 10, 30, 60, 480, -1 → her ihlalde bir sonraki adıma geçer",
    lblUnblockTitle:      "Manuel Blok Kaldır",
    unblockPlaceholder:   "örn: chatgpt.com",
    btnUnblock:           "Bloku Kaldır",
    btnSave:              "Kaydet",
    btnResetTokens:       "Tokenları Sıfırla",
    noSitesYet:           "Henüz site eklenmedi.",
    errLocked:            "Kilitli.",
    errInvalidHostname:   "Geçerli bir hostname girin.",
    errBadHostname:       "Geçersiz hostname. Örn: notion.so",
    errAlreadyExists:     (h) => `${h} zaten listede.`,
    errAddFailed:         "Eklenemedi.",
    errDeleteFailed:      "Silinemedi.",
    okAdded:              (h) => `✅ ${h} eklendi.`,
    okRemoved:            (h) => `✅ ${h} kaldırıldı.`,
    okSaved:              "✅ Kaydedildi.",
    okTokensReset:        "✅ Tokenlar sıfırlandı.",
    okUnblocked:          (h) => `✅ ${h} bloku kaldırıldı.`,
    errBackendRequired:   "Backend URL gerekli.",
    errInvalidLang:       "Geçersiz dil.",
    errInvalidLimit:      "Günlük limit sayı olmalı.",
    errThresholdMin:      "Eşik en az 1 olmalı.",
    errCounterMin:        "Sayaç sıfırlama en az 1 dk olmalı.",
    errBlockStepsMin:     "En az 1 blok adımı girin.",
    errSaveFailed:        "Kaydetme başarısız (Parola yanlış?).",
    errResetFailed:       "Sıfırlama başarısız.",
    errUnblockFailed:     "Blok kaldırma başarısız.",
    errEnterHostname:     "Hostname girin. Örn: chatgpt.com",
    allow:                "İzin Ver",
    block:                "Engelle",
    on:                   "Açık",
    off:                  "Kapalı",
    btnDelete:            "Sil",
    blockUpload:          "Engelle",
    allowUpload:          "İzin Ver",
  },
  EN: {
    stateLocked:          "Locked",
    stateUnlocked:        "Unlocked",
    subtitleHint:         "Daily limit: -1 → unlimited  |  Block steps: last step -1 → permanent",
    lblAdminPw:           "Admin Password",
    btnUnlock:            "Unlock",
    btnLock:              "Lock",
    msgUnlocked:          "Unlocked.",
    msgWrongPw:           "Wrong password.",
    lblBackendUrl:        "Backend URL (e.g. http://127.0.0.1:5000)",
    lblLanguage:          "Language",
    lblDailyLimit:        "Daily Limit (-1 = unlimited)",
    lblSiteRules:         "Site Rules — Copy / Paste / Stealth",
    thSite:               "Site",
    newSitePlaceholder:   "e.g. notion.so",
    btnAddSite:           "+ Add Site",
    lblCopyThrottle:      "Copy Threshold & Block",
    lblCopyThreshold:     "Threshold — how many copies trigger a block",
    lblCounterReset:      "Counter reset (minutes)",
    lblBlockSteps:        "Block steps (minutes, comma-separated — -1 = permanent)",
    hintBlockSteps:       "E.g. 1, 5, 10, 30, 60, 480, -1 → escalates on each violation",
    lblUnblockTitle:      "Manual Unblock",
    unblockPlaceholder:   "e.g. chatgpt.com",
    btnUnblock:           "Remove Block",
    btnSave:              "Save",
    btnResetTokens:       "Reset Tokens",
    noSitesYet:           "No sites added yet.",
    errLocked:            "Locked.",
    errInvalidHostname:   "Enter a valid hostname.",
    errBadHostname:       "Invalid hostname. E.g. notion.so",
    errAlreadyExists:     (h) => `${h} is already in the list.`,
    errAddFailed:         "Failed to add.",
    errDeleteFailed:      "Failed to delete.",
    okAdded:              (h) => `✅ ${h} added.`,
    okRemoved:            (h) => `✅ ${h} removed.`,
    okSaved:              "✅ Saved.",
    okTokensReset:        "✅ Tokens reset.",
    okUnblocked:          (h) => `✅ Block removed for ${h}.`,
    errBackendRequired:   "Backend URL required.",
    errInvalidLang:       "Invalid language.",
    errInvalidLimit:      "Daily limit must be a number.",
    errThresholdMin:      "Threshold must be at least 1.",
    errCounterMin:        "Counter reset must be at least 1 minute.",
    errBlockStepsMin:     "Enter at least 1 block step.",
    errSaveFailed:        "Save failed (wrong password?).",
    errResetFailed:       "Reset failed.",
    errUnblockFailed:     "Unblock failed.",
    errEnterHostname:     "Enter a hostname. E.g. chatgpt.com",
    allow:                "Allow",
    block:                "Block",
    on:                   "On",
    off:                  "Off",
    btnDelete:            "Delete",
    blockUpload:          "Block",
    allowUpload:          "Allow",
  },
  DE: {
    stateLocked:          "Gesperrt",
    stateUnlocked:        "Entsperrt",
    subtitleHint:         "Tageslimit: -1 → unbegrenzt  |  Sperrstufen: letzte Stufe -1 → dauerhaft",
    lblAdminPw:           "Admin-Passwort",
    btnUnlock:            "Entsperren",
    btnLock:              "Sperren",
    msgUnlocked:          "Entsperrt.",
    msgWrongPw:           "Falsches Passwort.",
    lblBackendUrl:        "Backend-URL (z. B. http://127.0.0.1:5000)",
    lblLanguage:          "Sprache",
    lblDailyLimit:        "Tageslimit (-1 = unbegrenzt)",
    lblSiteRules:         "Website-Regeln — Kopieren / Einfügen / Stealth",
    thSite:               "Website",
    newSitePlaceholder:   "z. B. notion.so",
    btnAddSite:           "+ Website hinzufügen",
    lblCopyThrottle:      "Kopierschwelle & Sperre",
    lblCopyThreshold:     "Schwelle — wie viele Kopiervorgänge eine Sperre auslösen",
    lblCounterReset:      "Zähler zurücksetzen (Minuten)",
    lblBlockSteps:        "Sperrstufen (Minuten, kommagetrennt — -1 = dauerhaft)",
    hintBlockSteps:       "z. B. 1, 5, 10, 30, 60, 480, -1 → eskaliert bei jedem Verstoß",
    lblUnblockTitle:      "Manuelle Entsperrung",
    unblockPlaceholder:   "z. B. chatgpt.com",
    btnUnblock:           "Sperre aufheben",
    btnSave:              "Speichern",
    btnResetTokens:       "Tokens zurücksetzen",
    noSitesYet:           "Noch keine Websites hinzugefügt.",
    errLocked:            "Gesperrt.",
    errInvalidHostname:   "Gültigen Hostnamen eingeben.",
    errBadHostname:       "Ungültiger Hostname. z. B. notion.so",
    errAlreadyExists:     (h) => `${h} ist bereits in der Liste.`,
    errAddFailed:         "Hinzufügen fehlgeschlagen.",
    errDeleteFailed:      "Löschen fehlgeschlagen.",
    okAdded:              (h) => `✅ ${h} hinzugefügt.`,
    okRemoved:            (h) => `✅ ${h} entfernt.`,
    okSaved:              "✅ Gespeichert.",
    okTokensReset:        "✅ Tokens zurückgesetzt.",
    okUnblocked:          (h) => `✅ Sperre für ${h} aufgehoben.`,
    errBackendRequired:   "Backend-URL erforderlich.",
    errInvalidLang:       "Ungültige Sprache.",
    errInvalidLimit:      "Tageslimit muss eine Zahl sein.",
    errThresholdMin:      "Schwelle muss mindestens 1 sein.",
    errCounterMin:        "Zähler-Reset muss mindestens 1 Minute betragen.",
    errBlockStepsMin:     "Mindestens 1 Sperrstufe eingeben.",
    errSaveFailed:        "Speichern fehlgeschlagen (falsches Passwort?).",
    errResetFailed:       "Zurücksetzen fehlgeschlagen.",
    errUnblockFailed:     "Entsperren fehlgeschlagen.",
    errEnterHostname:     "Hostnamen eingeben. z. B. chatgpt.com",
    allow:                "Erlauben",
    block:                "Sperren",
    on:                   "Ein",
    off:                  "Aus",
    btnDelete:            "Löschen",
    blockUpload:          "Sperren",
    allowUpload:          "Erlauben",
  },
};

let currentLang = "TR";
const i = (k, ...args) => {
  const d = I18N[currentLang] || I18N.TR;
  const v = d[k];
  return typeof v === "function" ? v(...args) : (v ?? k);
};

// ─── UI metinlerini dile göre güncelle ────────────────────────────────────────
function applyLang(lang) {
  currentLang = lang || "TR";

  $("statePill").textContent          = $("settingsCard").classList.contains("hidden") ? i("stateLocked") : i("stateUnlocked");
  $("subtitleHint").textContent        = i("subtitleHint");
  $("lblAdminPw").textContent          = i("lblAdminPw");
  $("unlockBtn").textContent           = i("btnUnlock");
  $("lockBtn").textContent             = i("btnLock");
  $("lblBackendUrl").textContent       = i("lblBackendUrl");
  $("lblLanguage").textContent         = i("lblLanguage");
  $("lblDailyLimit").textContent       = i("lblDailyLimit");
  $("lblSiteRules").textContent        = i("lblSiteRules");
  $("thSite").textContent              = i("thSite");
  $("newSiteHostname").placeholder     = i("newSitePlaceholder");
  $("addSiteBtn").textContent          = i("btnAddSite");
  $("lblCopyThrottle").textContent     = i("lblCopyThrottle");
  $("lblCopyThreshold").textContent    = i("lblCopyThreshold");
  $("lblCounterReset").textContent     = i("lblCounterReset");
  $("lblBlockSteps").textContent       = i("lblBlockSteps");
  $("hintBlockSteps").textContent      = i("hintBlockSteps");
  $("lblUnblockTitle").textContent     = i("lblUnblockTitle");
  $("unblockHostname").placeholder     = i("unblockPlaceholder");
  $("unblockBtn").textContent          = i("btnUnblock");
  $("saveBtn").textContent             = i("btnSave");
  $("resetTokensBtn").textContent      = i("btnResetTokens");

  // Tablodaki Allow/Block/On/Off etiketlerini de güncelle
  $("rulesBody").querySelectorAll("input[type=checkbox]").forEach((cb) => {
    const label = cb.nextElementSibling;
    if (!label) return;
    if (cb.dataset.action === "stealthCopy") {
      label.textContent = cb.checked ? i("on") : i("off");
    } else if (cb.dataset.action === "blockFileUpload") {
      label.textContent = cb.checked ? i("blockUpload") : i("allowUpload");
    } else {
      label.textContent = cb.checked ? i("allow") : i("block");
    }
  });
  $("rulesBody").querySelectorAll(".remove-site-btn").forEach((btn) => {
    btn.textContent = i("btnDelete");
  });
}

// ─── Site Rules tablosunu oluştur ─────────────────────────────────────────────
function buildRulesTable(siteRules) {
  const tbody = $("rulesBody");
  tbody.innerHTML = "";
  const sites = Object.keys(siteRules);

  if (sites.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="opacity:.4;padding:12px 10px">${i("noSitesYet")}</td></tr>`;
    return;
  }

  sites.forEach((site) => {
    const rule = siteRules[site] || { canCopy: true, canPaste: true, stealthCopy: false, blockFileUpload: false };
    const tr   = document.createElement("tr");
    tr.dataset.site = site;
    tr.innerHTML = `
      <td style="font-size:13px">${site}</td>
      <td>
        <label class="toggle">
          <input type="checkbox" data-site="${site}" data-action="canCopy" ${rule.canCopy ? "checked" : ""} />
          <span style="font-size:12px;opacity:.7">${rule.canCopy ? i("allow") : i("block")}</span>
        </label>
      </td>
      <td>
        <label class="toggle">
          <input type="checkbox" data-site="${site}" data-action="canPaste" ${rule.canPaste ? "checked" : ""} />
          <span style="font-size:12px;opacity:.7">${rule.canPaste ? i("allow") : i("block")}</span>
        </label>
      </td>
      <td>
        <label class="toggle">
          <input type="checkbox" data-site="${site}" data-action="stealthCopy" ${rule.stealthCopy ? "checked" : ""} />
          <span style="font-size:12px;opacity:.7;color:#a78bfa">${rule.stealthCopy ? i("on") : i("off")}</span>
        </label>
      </td>
      <td>
        <label class="toggle">
          <input type="checkbox" data-site="${site}" data-action="blockFileUpload" ${rule.blockFileUpload ? "checked" : ""} />
          <span style="font-size:12px;opacity:.7;color:#f87171">${rule.blockFileUpload ? i("blockUpload") : i("allowUpload")}</span>
        </label>
      </td>
      <td>
        <button class="secondary remove-site-btn" data-site="${site}"
          style="padding:6px 10px;font-size:11px;color:#fca5a5;border-color:#7f1d1d">
          ${i("btnDelete")}
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll("input[type=checkbox]").forEach((cb) => {
    cb.addEventListener("change", () => {
      const label = cb.nextElementSibling;
      if (!label) return;
      label.textContent = cb.dataset.action === "stealthCopy"
        ? (cb.checked ? i("on") : i("off"))
        : cb.dataset.action === "blockFileUpload"
        ? (cb.checked ? i("blockUpload") : i("allowUpload"))
        : (cb.checked ? i("allow") : i("block"));
    });
  });

  tbody.querySelectorAll(".remove-site-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      hide($("formErr")); hide($("formOk"));
      if (!adminPw) return show($("formErr"), i("errLocked"));
      const site = btn.dataset.site;
      const res  = await chrome.runtime.sendMessage({ type: "GET_SETTINGS" });
      if (!res?.ok) return;
      const siteRules = res.settings.siteRules || {};
      delete siteRules[site];
      const saveRes = await chrome.runtime.sendMessage({
        type: "ADMIN_SET_SETTINGS", password: adminPw, settings: { siteRules }
      });
      if (!saveRes?.ok) return show($("formErr"), i("errDeleteFailed"));
      show($("formOk"), i("okRemoved", site));
      buildRulesTable(siteRules);
    });
  });
}

// ─── Tablodan site rules oku ──────────────────────────────────────────────────
function readRulesFromTable() {
  const rules = {};
  $("rulesBody").querySelectorAll("input[type=checkbox]").forEach((cb) => {
    const site = cb.dataset.site, action = cb.dataset.action;
    if (!site) return;
    if (!rules[site]) rules[site] = { canCopy: true, canPaste: true, stealthCopy: false, blockFileUpload: false };
    rules[site][action] = cb.checked;
  });
  return rules;
}

// ─── Form doldur ──────────────────────────────────────────────────────────────
async function loadSettingsIntoForm() {
  const res = await chrome.runtime.sendMessage({ type: "GET_SETTINGS" });
  if (!res?.ok) return;
  const s = res.settings;
  $("backendUrl").value          = s.discoveryUrl || s.backendUrl || "";
  $("language").value            = s.language     || "TR";
  $("dailyLimit").value          = Number.isFinite(Number(s.dailyLimit)) ? s.dailyLimit : 10;
  $("copyThreshold").value       = s.copyThreshold       ?? 5;
  $("counterResetMinutes").value = s.counterResetMinutes ?? 1;
  $("blockSteps").value          = (s.blockSteps || [1,5,10,30,60,480,-1]).join(", ");
  currentLang = s.language || "TR";
  applyLang(currentLang);
  buildRulesTable(s.siteRules || {});
}

// ─── Unlock / Lock ────────────────────────────────────────────────────────────
function setUnlocked(isUnlocked) {
  $("settingsCard").classList.toggle("hidden", !isUnlocked);
  $("lockBtn").classList.toggle("hidden", !isUnlocked);
  $("statePill").textContent = isUnlocked ? i("stateUnlocked") : i("stateLocked");
}

$("unlockBtn").addEventListener("click", async () => {
  hide($("unlockErr")); hide($("unlockOk"));
  const pw  = $("adminPw").value || "";
  const res = await chrome.runtime.sendMessage({ type: "ADMIN_VERIFY", password: pw });
  if (!res?.ok) {
    show($("unlockErr"), i("msgWrongPw"));
    setUnlocked(false); adminPw = "";
    return;
  }
  adminPw = pw;
  setUnlocked(true);
  await loadSettingsIntoForm();
  show($("unlockOk"), i("msgUnlocked"));
});

$("lockBtn").addEventListener("click", () => {
  adminPw = ""; $("adminPw").value = "";
  setUnlocked(false);
  hide($("unlockOk")); hide($("formOk")); hide($("formErr"));
});

// ─── Site Ekle ────────────────────────────────────────────────────────────────
$("addSiteBtn").addEventListener("click", async () => {
  hide($("formErr")); hide($("formOk"));
  if (!adminPw) return show($("formErr"), i("errLocked"));
  const raw      = $("newSiteHostname").value.trim().toLowerCase();
  const hostname = raw.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (!hostname) return show($("formErr"), i("errInvalidHostname"));
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(hostname))
    return show($("formErr"), i("errBadHostname"));
  const res = await chrome.runtime.sendMessage({ type: "GET_SETTINGS" });
  if (!res?.ok) return;
  const siteRules = res.settings.siteRules || {};
  if (siteRules[hostname]) return show($("formErr"), i("errAlreadyExists", hostname));
  siteRules[hostname] = { canCopy: true, canPaste: true, stealthCopy: false, blockFileUpload: false };
  const saveRes = await chrome.runtime.sendMessage({
    type: "ADMIN_SET_SETTINGS", password: adminPw, settings: { siteRules }
  });
  if (!saveRes?.ok) return show($("formErr"), i("errAddFailed"));
  show($("formOk"), i("okAdded", hostname));
  $("newSiteHostname").value = "";
  buildRulesTable(siteRules);
});

// ─── Save ─────────────────────────────────────────────────────────────────────
$("saveBtn").addEventListener("click", async () => {
  hide($("formErr")); hide($("formOk"));
  if (!adminPw) return show($("formErr"), i("errLocked"));

  const backendUrl          = $("backendUrl").value.trim();
  const language            = $("language").value;
  const dailyLimit          = Number($("dailyLimit").value);
  const siteRules           = readRulesFromTable();
  const copyThreshold       = Number($("copyThreshold").value);
  const counterResetMinutes = Number($("counterResetMinutes").value);
  const blockStepsRaw       = $("blockSteps").value
    .split(",").map((s) => Number(s.trim())).filter((n) => !isNaN(n));

  if (!backendUrl)                                                    return show($("formErr"), i("errBackendRequired"));
  if (!["TR","EN","DE"].includes(language))                           return show($("formErr"), i("errInvalidLang"));
  if (!Number.isFinite(dailyLimit))                                   return show($("formErr"), i("errInvalidLimit"));
  if (!Number.isFinite(copyThreshold) || copyThreshold < 1)          return show($("formErr"), i("errThresholdMin"));
  if (!Number.isFinite(counterResetMinutes) || counterResetMinutes < 1) return show($("formErr"), i("errCounterMin"));
  if (blockStepsRaw.length === 0)                                     return show($("formErr"), i("errBlockStepsMin"));

  const res = await chrome.runtime.sendMessage({
    type: "ADMIN_SET_SETTINGS", password: adminPw,
    settings: { discoveryUrl: backendUrl, language, dailyLimit, siteRules, copyThreshold, counterResetMinutes, blockSteps: blockStepsRaw }
  });
  if (!res?.ok) return show($("formErr"), i("errSaveFailed"));

  // Dil değiştiyse arayüzü hemen güncelle
  currentLang = language;
  applyLang(currentLang);
  show($("formOk"), i("okSaved"));
});

// ─── Reset Tokens ─────────────────────────────────────────────────────────────
$("resetTokensBtn").addEventListener("click", async () => {
  hide($("formErr")); hide($("formOk"));
  if (!adminPw) return show($("formErr"), i("errLocked"));
  const res = await chrome.runtime.sendMessage({ type: "ADMIN_RESET_TOKENS", password: adminPw });
  if (!res?.ok) return show($("formErr"), i("errResetFailed"));
  show($("formOk"), i("okTokensReset"));
});

// ─── Manuel Blok Kaldır ───────────────────────────────────────────────────────
$("unblockBtn").addEventListener("click", async () => {
  hide($("formErr")); hide($("formOk"));
  if (!adminPw) return show($("formErr"), i("errLocked"));
  const hostname = $("unblockHostname").value.trim();
  if (!hostname) return show($("formErr"), i("errEnterHostname"));
  const res = await chrome.runtime.sendMessage({ type: "ADMIN_RESET_BLOCK", password: adminPw, hostname });
  if (!res?.ok) return show($("formErr"), i("errUnblockFailed"));
  show($("formOk"), i("okUnblocked", hostname));
  $("unblockHostname").value = "";
});

// ─── Init ─────────────────────────────────────────────────────────────────────
(async () => {
  // Dili storage'dan çek, UI'ı başlat
  const res = await chrome.runtime.sendMessage({ type: "GET_SETTINGS" });
  currentLang = res?.settings?.language || "TR";
  applyLang(currentLang);
  setUnlocked(false);
})();