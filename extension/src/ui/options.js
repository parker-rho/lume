(function () {
  const has = Object.prototype.hasOwnProperty;

  let storageData = {
    uiTheme: 'light',
  };

  function detectColorScheme(){
    let theme="light";

    if(storageData.uiTheme){
      theme = storageData.uiTheme;
    } else if(!window.matchMedia) {
      theme = "light";
    } else if(window.matchMedia("(prefers-color-scheme: dark)").matches) {
      theme = "dark";
    }

    if (!storageData.uiTheme) {
      storageData.uiTheme = theme;
      saveData();
    }

    document.documentElement.setAttribute("data-theme", theme);
  }

  function loadData() {
    chrome.storage.local.get('storageData', (data) => {
      if (Object.keys(data).length > 0 && data.storageData) {
        storageData = data.storageData;
      }
      detectColorScheme();
      populateForms();
    });
  }

  function saveData(label = undefined) {
    chrome.storage.local.set({ storageData }, () => {
      if (label !== undefined) setLabel(label, 'Options Saved');
    });
  }

  function saveForm() {
    storageData.uiTheme = $('ui_theme').value;
    saveData('status_save');
    detectColorScheme();
    $('save_btn').classList.add('disabled-btn');
  }

  function populateForms() {
    $('ui_theme').value = storageData.uiTheme || 'light';
    $('save_btn').classList.add('disabled-btn');
  }

  // Helpers
  function $(id) {
    return document.getElementById(id);
  }

  function setLabel(label, text) {
    const status = $(label);
    status.textContent = text;
    status.classList.add('alert-animate');
    setTimeout(() => {
      status.textContent = '';
      status.classList.remove('alert-animate');
    }, 1000);
  }

  // Start
  document.addEventListener('DOMContentLoaded', loadData);

  $('options').addEventListener('submit', (evt) => {
    evt.preventDefault();
  });

  $('save_btn').addEventListener('click', (evt) => {
    if(evt.target.classList.contains('disabled-btn')) return;
    saveForm();
  });

  $('options').addEventListener('change', (evt) => {
    if (evt.target.tagName === 'INPUT' && evt.target.getAttribute('type') === 'radio') return;
    $('save_btn').classList.remove('disabled-btn');
  });

}());
