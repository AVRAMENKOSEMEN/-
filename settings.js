// settings.js
// Settings module (save/load)
const SETTINGS_KEY = 'mayak_settings_v10';
const DEFAULTS = { theme:'auto', units:'kmh', showMyLocation:true, autoFollow:true };

function loadSettings() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || DEFAULTS; }
  catch(e) { return DEFAULTS; }
}
function saveSettings(obj) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(obj));
  applySettings(obj);
}
function resetSettings() {
  localStorage.removeItem(SETTINGS_KEY);
  applySettings(DEFAULTS);
}
function applySettings(s) {
  const root = document.documentElement;
  if (!s) s = loadSettings();
  if (s.theme === 'dark') root.classList.add('dark');
  else if (s.theme === 'light') root.classList.remove('dark');
  else {
    // auto: follow system
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) root.classList.add('dark');
    else root.classList.remove('dark');
  }
  // UI elements (if present) update
  const themeSelect = document.getElementById('themeSelect');
  if (themeSelect) themeSelect.value = s.theme;
  const unitsSelect = document.getElementById('unitsSelect');
  if (unitsSelect) unitsSelect.value = s.units;
  const showMyLocation = document.getElementById('showMyLocation');
  if (showMyLocation) showMyLocation.checked = !!s.showMyLocation;
  const autoFollow = document.getElementById('autoFollow');
  if (autoFollow) autoFollow.checked = !!s.autoFollow;
}
document.addEventListener('DOMContentLoaded', ()=> {
  applySettings(loadSettings());
  // save/reset handlers
  const saveBtn = document.getElementById('saveSettings');
  if (saveBtn) saveBtn.addEventListener('click', ()=> {
    const s = {
      theme: document.getElementById('themeSelect').value,
      units: document.getElementById('unitsSelect').value,
      showMyLocation: document.getElementById('showMyLocation').checked,
      autoFollow: document.getElementById('autoFollow').checked
    };
    saveSettings(s);
    document.getElementById('settingsModal').removeAttribute('open');
  });
  const resetBtn = document.getElementById('resetSettings');
  if (resetBtn) resetBtn.addEventListener('click', ()=> { resetSettings(); document.getElementById('settingsModal').removeAttribute('open'); });
  const closeBtn = document.getElementById('closeSettings');
  if (closeBtn) closeBtn.addEventListener('click', ()=> document.getElementById('settingsModal').removeAttribute('open'));
});
