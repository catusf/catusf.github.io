/**
 * ged-shared.js — Reusable file/URL loading for all Phan tools
 *
 * Provides:
 *   GedFile.createActionBar(container, {onFile, onText, fileLabel, urlLabel})
 *   GedFile.createUrlModal(onLoad)
 *   GedFile.loadFromUrl(url, callback)
 *   GedFile.autoLoadFromParams(callback)
 */
window.GedFile = (function() {
  'use strict';
  var modalEl = null;
  var modalInput = null;
  var modalError = null;
  var currentCallback = null;

  function ensureModal() {
    if (modalEl) return;
    modalEl = document.createElement('div');
    modalEl.className = 'overlay';
    modalEl.id = 'ged-url-modal';
    modalEl.innerHTML =
      '<div class="modal">' +
        '<div class="modal__title">Load GEDCOM from URL</div>' +
        '<p style="font-size:14px;color:var(--md-on-surface-var);margin-bottom:16px">Paste a direct link to a .ged file</p>' +
        '<input type="text" class="input" id="ged-url-input" placeholder="https://example.com/family.ged" style="width:100%;margin-bottom:8px" autocomplete="off" spellcheck="false">' +
        '<div id="ged-url-error" style="font-size:13px;color:var(--md-error);min-height:20px"></div>' +
        '<div class="modal__actions">' +
          '<button class="btn btn-text" id="ged-url-cancel">Cancel</button>' +
          '<button class="btn btn-filled" id="ged-url-confirm"><span class="mi">download</span>Load</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modalEl);
    modalInput = document.getElementById('ged-url-input');
    modalError = document.getElementById('ged-url-error');

    document.getElementById('ged-url-cancel').addEventListener('click', hideModal);
    modalEl.addEventListener('click', function(e) { if (e.target === modalEl) hideModal(); });
    document.getElementById('ged-url-confirm').addEventListener('click', function() {
      doLoad(modalInput.value);
    });
    modalInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') doLoad(modalInput.value);
      if (e.key === 'Escape') hideModal();
    });
  }

  function showModal(cb) {
    ensureModal();
    currentCallback = cb;
    modalError.textContent = '';
    modalInput.value = '';
    modalEl.classList.add('show');
    setTimeout(function() { modalInput.focus(); }, 120);
  }

  function hideModal() {
    if (modalEl) modalEl.classList.remove('show');
  }

  async function doLoad(url) {
    url = (url || '').trim();
    if (!url) return;
    if (!/^https?:\/\/.+/i.test(url)) {
      modalError.textContent = 'URL must start with http:// or https://';
      return;
    }
    hideModal();
    try {
      var resp = await fetch(url);
      if (!resp.ok) throw new Error('HTTP ' + resp.status + ' ' + resp.statusText);
      var text = await resp.text();
      if (!/^0\s/.test(text.trim().slice(0, 10))) {
        alert('Downloaded file does not appear to be valid GEDCOM.\nFirst line: ' + text.trim().slice(0, 60));
        return;
      }
      var fname = url.split('/').pop().split('?')[0] || 'remote.ged';
      if (currentCallback) currentCallback(text, fname);
    } catch (err) {
      var msg = 'Failed to load: ' + err.message;
      if (err instanceof TypeError) {
        msg += '\n\nThis is likely a CORS issue. The server hosting the .ged file must allow cross-origin requests.\nTry downloading the file manually and using the File button.';
      }
      alert(msg);
    }
  }

  /**
   * Create a standardized action bar with File + URL buttons.
   * @param {HTMLElement} container - Element to insert the bar into
   * @param {Object} opts
   * @param {Function} opts.onFile - Called with (text, filename) when file loaded
   * @param {string} [opts.accept] - File accept string (default: '.ged')
   */
  function createActionBar(container, opts) {
    opts = opts || {};
    var accept = opts.accept || '.ged,.gedcom,.GED';
    var bar = document.createElement('div');
    bar.className = 'action-bar';
    bar.innerHTML =
      '<button class="btn btn-tonal" id="ged-file-btn"><span class="mi">folder_open</span>Open file</button>' +
      '<button class="btn btn-tonal" id="ged-url-btn"><span class="mi">link</span>Load from URL</button>' +
      '<input type="file" id="ged-file-input" accept="' + accept + '" style="display:none">';
    container.insertBefore(bar, container.firstChild);

    var fileInput = bar.querySelector('#ged-file-input');
    bar.querySelector('#ged-file-btn').addEventListener('click', function() { fileInput.click(); });
    bar.querySelector('#ged-url-btn').addEventListener('click', function() {
      showModal(opts.onFile);
    });
    fileInput.addEventListener('change', function(e) {
      var file = e.target.files[0];
      if (!file) return;
      fileInput.value = '';
      var reader = new FileReader();
      reader.onload = function(ev) {
        if (opts.onFile) opts.onFile(ev.target.result, file.name);
      };
      reader.onerror = function() { alert('Could not read file.'); };
      reader.readAsText(file, 'UTF-8');
    });
  }

  /**
   * Auto-load from ?url= query parameter.
   * @param {Function} callback - Called with (text, filename) when loaded
   */
  function autoLoadFromParams(callback) {
    var params = new URLSearchParams(window.location.search);
    var url = params.get('url');
    if (url) {
      currentCallback = callback;
      setTimeout(function() { doLoad(url); }, 400);
    }
  }

  return {
    createActionBar: createActionBar,
    showUrlModal: showModal,
    loadFromUrl: doLoad,
    autoLoadFromParams: autoLoadFromParams
  };
})();
