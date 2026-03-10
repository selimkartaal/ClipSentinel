const SETTINGS_KEY = "clipsentinel_settings_v1";

const DEFAULT_SETTINGS = {
  backendUrl: "http://127.0.0.1:5000",
  language: "TR",
  dailyLimit: 10
};

const I18N = {
  TR: { dest: "Hedef Adres", lang: "Dil", settings: "Ayarlar" },
  EN: { dest: "Destination", lang: "Language", settings: "Settings" },
  DE: { dest: "Zieladresse", lang: "Sprache", settings: "Einstellungen" }
};

async function getSettings() {
  const res = await chrome.storage.local.get([SETTINGS_KEY]);
  return { ...DEFAULT_SETTINGS, ...(res?.[SETTINGS_KEY] || {}) };
}

async function saveSettings(newSettings) {
  const cur = await getSettings();
  const merged = { ...cur, ...newSettings };
  await chrome.storage.local.set({ [SETTINGS_KEY]: merged });
  return merged;
}

function applyLang(settings) {
  const lang = settings.language || "TR";
  document.getElementById("langTag").textContent = lang;
  document.getElementById("destLabel").textContent = I18N[lang].dest;
  document.getElementById("langLabel").textContent = I18N[lang].lang;
  document.getElementById("openSettingsBtn").textContent = I18N[lang].settings;
  document.getElementById("langSelect").value = lang;
}

(async function init() {
  const settings = await getSettings();
  document.getElementById("backendBox").textContent = settings.backendUrl;
  applyLang(settings);

  document.getElementById("langSelect").addEventListener("change", async (e) => {
    const updated = await saveSettings({ language: e.target.value });
    applyLang(updated);
  });

  document.getElementById("openSettingsBtn").addEventListener("click", () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("options.html") });
    window.close();
  });
})();