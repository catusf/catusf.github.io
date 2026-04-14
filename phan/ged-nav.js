/**
 * ged-nav.js — M3 Top App Bar for Phan tools
 * Usage: <script src="ged-nav.js" data-active="pedigree"></script>
 */
(function() {
  'use strict';
  var TOOLS = [
    { id: 'pedigree',  icon: 'account_tree', label: 'Pedigree',  href: 'PedigreeChart.html' },
    { id: 'fanchart',  icon: 'donut_large',  label: 'Fan Chart', href: 'Fanchart.html' },
    { id: 'validator', icon: 'verified',      label: 'Validator', href: 'Validator.html' },
    { id: 'reverser',  icon: 'swap_horiz',    label: 'Reverser',  href: 'Reverser.html' }
  ];
  var scriptTag = document.currentScript || document.querySelector('script[data-active]');
  var activeId = scriptTag ? scriptTag.getAttribute('data-active') : '';
  var THEME_KEY = 'ged_theme';

  function getStored() { try { return localStorage.getItem(THEME_KEY); } catch(e) { return null; } }
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem(THEME_KEY, t); } catch(e) {}
    var ico = document.getElementById('ged-theme-ico');
    if (ico) ico.textContent = t === 'dark' ? 'dark_mode' : 'light_mode';
  }
  function toggleTheme() {
    var cur = document.documentElement.getAttribute('data-theme') || 'dark';
    applyTheme(cur === 'dark' ? 'light' : 'dark');
    window.dispatchEvent(new CustomEvent('ged-theme-change', {
      detail: { theme: document.documentElement.getAttribute('data-theme') }
    }));
  }
  var stored = getStored();
  if (stored) document.documentElement.setAttribute('data-theme', stored);

  function buildNav() {
    var nav = document.createElement('nav');
    nav.className = 'ged-nav';
    var h = '<a class="ged-nav__brand" href="Tools.html"><span class="mi filled">local_florist</span>Họ Phan</a>';
    h += '<div class="ged-nav__links">';
    for (var i = 0; i < TOOLS.length; i++) {
      var t = TOOLS[i], cls = t.id === activeId ? ' active' : '';
      h += '<a class="ged-nav__link' + cls + '" href="' + t.href + '"><span class="mi" style="font-size:18px">' + t.icon + '</span>' + t.label + '</a>';
    }
    h += '</div><div class="ged-nav__spacer"></div><div class="ged-nav__actions">';
    h += '<div class="theme-toggle" id="ged-theme-tog" title="Toggle theme">';
    h += '<div class="theme-toggle__track"><div class="theme-toggle__thumb"><span class="mi" id="ged-theme-ico">dark_mode</span></div></div>';
    h += '</div></div>';
    nav.innerHTML = h;
    return nav;
  }

  function init() {
    if (document.querySelector('.ged-nav')) return;
    document.body.insertBefore(buildNav(), document.body.firstChild);
    document.getElementById('ged-theme-tog').addEventListener('click', toggleTheme);
    applyTheme(document.documentElement.getAttribute('data-theme') || 'dark');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.GedNav = { toggleTheme: toggleTheme, setTheme: applyTheme,
    getTheme: function() { return document.documentElement.getAttribute('data-theme') || 'dark'; }
  };
})();
