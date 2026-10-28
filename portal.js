/* Blinkslow Client Portal. Reads the Google Sheet and renders each client portal. Edited through Claude. */
(function () {
  /* ===== Settings: fill these two in once ===== */
  var SHEET_ID = '1IM1Q9iIPrD6WsuePpD8UD2HDgmpDbMZmXokJgH8CXpA';
  var LOGO_URL = 'https://blinkslow54.github.io/blinkslow-portal/logo.png';
  /* ============================================ */

  var root = document.getElementById('bp');
  var I = {
    down: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M8 2v9M4 7.5 8 11.5l4-4M2.5 14h11"/></svg>',
    eye: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M1 8s2.6-5 7-5 7 5 7 5-2.6 5-7 5-7-5-7-5Z"/><circle cx="8" cy="8" r="2"/></svg>',
    copy: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="5" y="5" width="9" height="9" rx="1.5"/><path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2h-6A1.5 1.5 0 0 0 2 3.5v6A1.5 1.5 0 0 0 3.5 11H5"/></svg>',
    img: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2" y="2" width="12" height="12" rx="1.5"/><circle cx="6" cy="6" r="1.3"/><path d="m2.5 12 3.5-3.5 2.5 2.5 2-2 3 3"/></svg>',
    back: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M10 3 5 8l5 5"/></svg>',
    arrow: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 8h10M9 4l4 4-4 4"/></svg>'
  };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function safe(u) { u = String(u || '').trim(); return /^https?:\/\//i.test(u) ? u : ''; }
  function dl(u) { return /dropbox\.com/.test(u) ? (/[?&]dl=\d/.test(u) ? u.replace(/([?&])dl=\d/, '$1dl=1') : u + (u.indexOf('?') > -1 ? '&' : '?') + 'dl=1') : u; }
  function plural(n, w) { return n + ' ' + (n === 1 ? w : w + 's'); }
  function slug(s) { return String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
  function yes(v) { return /^(y|yes|true|1)$/i.test(String(v || '').trim()); }

  function parseCSV(t) {
    var rows = [], row = [], f = '', q = false;
    for (var i = 0; i < t.length; i++) {
      var c = t[i];
      if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
      else if (c === '"') q = true;
      else if (c === ',') { row.push(f); f = ''; }
      else if (c === '\n') { row.push(f); rows.push(row); row = []; f = ''; }
      else if (c !== '\r') f += c;
    }
    if (f !== '' || row.length) { row.push(f); rows.push(row); }
    var head = (rows.shift() || []).map(function (h) { return h.trim().toLowerCase(); });
    return rows.map(function (r) { var o = {}; head.forEach(function (h, k) { o[h] = (r[k] || '').trim(); }); return o; });
  }
  function getTab(name) {
    var url = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID + '/gviz/tq?tqx=out:csv&headers=1&sheet=' + encodeURIComponent(name);
    return fetch(url).then(function (r) { if (!r.ok) throw new Error('sheet'); return r.text(); }).then(parseCSV);
  }

  /* Rows -> deliveries (newest first) -> pieces -> versions */
  function build(rows) {
    var dels = [], byName = {};
    rows.forEach(function (r) {
      var dn = r['delivery'], title = r['content title'], link = safe(r['dropbox link']);
      if (!dn || (!title && !link)) return;
      var d = byName[dn];
      if (!d) { d = byName[dn] = { name: dn, pieces: [], byTitle: {}, all: '', covers: '' }; dels.push(d); }
      if (!d.all) d.all = safe(r['delivery folder link']);
      if (!d.covers) d.covers = safe(r['covers folder link']);
      var key = title || ('#' + d.pieces.length), p = d.byTitle[key];
      if (!p) { p = d.byTitle[key] = { title: title, type: r['type'] || 'Reel', caption: '', cover: '', files: [] }; d.pieces.push(p); }
      if (!p.caption && r['caption']) p.caption = r['caption'];
      if (!p.cover) p.cover = safe(r['cover link']);
      if (link) p.files.push({ label: r['version name'], url: link });
    });
    return dels.reverse();
  }

  var S = { client: '', covers: true, dels: [] };
  function slugs() { var seen = {}; return S.dels.map(function (d, i) { var s = slug(d.name) || 'delivery-' + (S.dels.length - i); if (seen[s]) s += '-' + (++seen[s]); else seen[s] = 1; return s; }); }
  function countLine(ps) { var c = {}, o = []; ps.forEach(function (p) { c[p.type] = (c[p.type] || 0) + 1; }); for (var t in c) o.push(c[t] + ' ' + (c[t] === 1 || t === 'Photos' ? t : t + 's')); return o.join(' · '); }
  var brand = function () { return '<div class="brand">' + (/^https?:/.test(LOGO_URL) ? '<img src="' + esc(LOGO_URL) + '" alt="">' : '') + '<div>Blinkslow MKTG</div></div>'; };
  var footer = '<footer class="wrap"><span>Blinkslow Marketing · Columbus, Ohio</span><span>Files are hosted on Dropbox. Downloads open in a new tab.</span></footer>';

  function home() {
    var sl = slugs(), total = 0;
    S.dels.forEach(function (d) { total += d.pieces.length; });
    function card(d, i, big) {
      return '<a class="dcard' + (big ? ' big' : '') + '" href="#' + sl[i] + '"><div class="dmeta">' + (i === 0 ? '<span class="tag">Latest</span>' : '') +
        '<span class="dcount">' + plural(d.pieces.length, 'content piece') + '</span></div><h2>' + esc(d.name) + '</h2>' +
        '<p class="types">' + esc(countLine(d.pieces)) + '</p><span class="go">Open delivery ' + I.arrow + '</span></a>';
    }
    return '<header class="band"><div class="wrap">' + brand() + '<div><div class="eyebrow">Content portal</div>' +
      '<h1>' + (S.client ? esc(S.client) + '’s content' : 'Your content') + ' <span>library.</span></h1>' +
      '<p class="lede">Every delivery from Blinkslow in one place, newest first. Open a delivery to download its files, covers and captions.</p>' +
      '<div class="facts"><div><b>' + S.dels.length + '</b><span>' + (S.dels.length === 1 ? 'Delivery' : 'Deliveries') + '</span></div><div><b>' + total + '</b><span>Content pieces in total</span></div></div></div></div></header>' +
      '<main class="wrap home">' + (S.dels.length ? '<section><div class="seclabel">Latest delivery</div>' + card(S.dels[0], 0, true) + '</section>' : '<div class="empty">Your first delivery will appear here.</div>') +
      (S.dels.length > 1 ? '<section><div class="seclabel">Past deliveries</div><div class="dgrid">' + S.dels.slice(1).map(function (d, j) { return card(d, j + 1); }).join('') + '</div></section>' : '') +
      '</main>' + footer;
  }

  function delivery(i) {
    var d = S.dels[i], c = {}, facts;
    d.pieces.forEach(function (p) { c[p.type] = (c[p.type] || 0) + 1; });
    facts = '<div><b>' + d.pieces.length + '</b><span>Content ' + (d.pieces.length === 1 ? 'piece' : 'pieces') + '</span></div>';
    if (Object.keys(c).length > 1) for (var t in c) facts += '<div><b>' + c[t] + '</b><span>' + esc(t) + '</span></div>';
    var bulk = [];
    if (d.all) bulk.push(['Download everything', 'Every content piece in one folder', d.all]);
    if (S.covers && d.covers) bulk.push(['Download all covers', 'Every cover image', d.covers]);
    var cards = d.pieces.map(function (p, k) {
      var f = p.files, multi = f.length > 1, view = /^(Photos|Folder|Carousel)$/.test(p.type) ? 'View' : 'Preview';
      var pair = function (u) { return '<a class="btn primary" href="' + esc(dl(u)) + '" target="_blank" rel="noopener">' + I.down + 'Download</a><a class="btn" href="' + esc(u) + '" target="_blank" rel="noopener">' + I.eye + view + '</a>'; };
      var versions = multi ? '<div class="versions">' + f.map(function (x, j) { return '<div class="version"><div class="vname">' + esc(x.label || 'Version ' + (j + 1)) + '</div><div class="actions">' + pair(x.url) + '</div></div>'; }).join('') + '</div>' : '';
      var btns = f.length === 1 ? pair(f[0].url) : '';
      if (S.covers && p.cover) btns += '<a class="btn" href="' + esc(dl(p.cover)) + '" target="_blank" rel="noopener">' + I.img + 'Cover</a>';
      if (p.caption) btns += '<button class="btn" type="button" data-copy="' + k + '">' + I.copy + '<span>Copy caption</span></button>';
      return '<article class="post"><div class="stub">CONTENT <br>PIECE<b>' + (k + 1) + '</b></div><div class="card"><div><span class="tag">' + esc(p.type) + (multi ? ' · ' + plural(f.length, 'version') : '') + '</span><h3>' + esc(p.title || 'Content piece ' + (k + 1)) + '</h3></div>' +
        (p.caption ? '<div class="caption" id="bp-cap-' + k + '">' + esc(p.caption) + '</div>' : '') + versions + (btns ? '<div class="actions">' + btns + '</div>' : '') + '</div></article>';
    }).join('');
    return '<header class="band"><div class="wrap">' + brand() + '<div><a class="backlink" href="#all">' + I.back + 'Back to all deliveries</a>' +
      '<div class="eyebrow">' + (S.client ? esc(S.client) + ' · ' : '') + (i === 0 ? 'Latest delivery' : 'Past delivery') + '</div><h1>' + esc(d.name) + '</h1>' +
      '<p class="lede">Every content piece below is edited and ready to post. Download the files, copy the caption, and you’re set.</p><div class="facts">' + facts + '</div></div></div></header>' +
      (bulk.length ? '<div class="wrap"><div class="bulk">' + bulk.map(function (b) { return '<a href="' + esc(dl(b[2])) + '" target="_blank" rel="noopener"><span><strong>' + b[0] + '</strong><em>' + b[1] + '</em></span>' + I.down + '</a>'; }).join('') + '</div></div>' : '') +
      '<main class="wrap del"><div class="list">' + (cards || '<div class="empty">This delivery’s content will appear here once it’s ready.</div>') + '</div>' +
      '<div class="backbottom"><a class="btn primary" href="#all">' + I.back + 'Back to all deliveries</a></div></main>' + footer;
  }

  function msg(t) { root.innerHTML = '<header class="band"><div class="wrap">' + brand() + '<div><h1>' + t + '</h1></div></div></header>' + footer; }
  function render() {
    var h = decodeURIComponent((location.hash || '').slice(1)), i = slugs().indexOf(h);
    root.innerHTML = i >= 0 ? delivery(i) : home();
  }
  window.addEventListener('hashchange', function () { render(); window.scrollTo(0, 0); });
  root.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-copy]'); if (!b) return;
    var i = S.dels[slugs().indexOf(decodeURIComponent(location.hash.slice(1)))], text = i.pieces[+b.dataset.copy].caption, label = b.querySelector('span');
    var done = function (m) { label.textContent = m; setTimeout(function () { label.textContent = 'Copy caption'; }, 2000); };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { done('Copied'); }, function () { done('Select the caption to copy'); });
    else done('Select the caption to copy');
  });

  var code = (new URLSearchParams(location.search).get('c') || '').trim().toLowerCase();
  if (!code) { msg('This portal link is missing its client code.'); return; }
  getTab('Clients').then(function (list) {
    var c = list.filter(function (r) { return (r['portal code'] || '').toLowerCase() === code; })[0];
    if (!c) { msg('We couldn\u2019t find this portal. Check the link Blinkslow sent you.'); return; }
    return getTab(code).then(function (rows) {
      S.client = c['client name']; S.covers = yes(c['covers']); S.dels = build(rows);
      document.title = (S.client ? S.client + ' \u00b7 ' : '') + 'Blinkslow Content Portal';
      render();
    });
  }).catch(function () { msg('Your content couldn\u2019t load. Please refresh, or contact Blinkslow if it keeps happening.'); });
})();
