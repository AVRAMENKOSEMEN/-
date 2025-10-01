const settingsBtn = document.getElementById("settingsBtn");
const settingsPanel = document.getElementById("settingsPanel");

settingsBtn.addEventListener("click", () => {
  settingsPanel.classList.remove("hidden");
});

document.getElementById("closeSettings").addEventListener("click", () => {
  settingsPanel.classList.add("hidden");
});

document.getElementById("saveSettings").addEventListener("click", () => {
  const prefs = {
    dark: document.getElementById("darkTheme").checked,
    showMyLocation: document.getElementById("showMyLocation").checked,
    autoFollow: document.getElementById("autoFollow").checked,
    speedUnit: document.getElementById("speedUnit").value
  };
  localStorage.setItem("gpsAppSettings", JSON.stringify(prefs));
  applySettings(prefs);
  settingsPanel.classList.add("hidden");
});

document.getElementById("resetSettings").addEventListener("click", () => {
  localStorage.removeItem("gpsAppSettings");
  applySettings({});
  settingsPanel.classList.add("hidden");
});

function applySettings(prefs) {
  if (prefs.dark) {
    document.body.classList.add("dark");
  } else {
    document.body.classList.remove("dark");
  }
}

window.addEventListener("load", () => {
  const prefs = JSON.parse(localStorage.getItem("gpsAppSettings") || "{}");
  applySettings(prefs);
});
