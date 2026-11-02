/* employer.js — employer dashboard. No dependencies.
 * Layers: (1) mock data + service layer (swap `api` for real endpoints later),
 *         (2) small helpers, (3) screens, (4) router. */
(function () {
  'use strict';

  /* ================= 1. Mock data + service layer ================= */
  var RAW = [
    ['Aarav Mehta', 6, 'Software', 24, 'Bengaluru', 'Senior Backend Engineer', ['Node.js', 'AWS', 'SQL']],
    ['Diya Sharma', 3, 'Marketing', 9, 'Mumbai', 'Growth Marketer', ['SEO', 'Analytics', 'Copywriting']],
    ['Rohan Iyer', 9, 'Finance', 32, 'Chennai', 'Finance Manager', ['FP&A', 'Excel', 'Audit']],
    ['Meera Nair', 4, 'Design', 14, 'Pune', 'Product Designer', ['Figma', 'UX Research', 'Prototyping']],
    ['Kabir Singh', 2, 'Sales', 8, 'Delhi', 'Sales Executive', ['CRM', 'Negotiation', 'B2B']],
    ['Ananya Rao', 7, 'Software', 28, 'Hyderabad', 'Full-Stack Developer', ['React', 'PHP', 'MySQL']],
    ['Vikram Joshi', 11, 'Operations', 30, 'Ahmedabad', 'Operations Lead', ['Logistics', 'Lean', 'Vendor management']],
    ['Sana Khan', 5, 'HR', 12, 'Mumbai', 'Talent Acquisition Partner', ['Sourcing', 'Interviewing', 'ATS']],
    ['Arjun Patel', 1, 'Software', 7, 'Ahmedabad', 'Junior Developer', ['JavaScript', 'HTML', 'Git']],
    ['Isha Gupta', 8, 'Marketing', 22, 'Delhi', 'Brand Manager', ['Branding', 'Campaigns', 'Budgeting']],
    ['Neel Desai', 4, 'Finance', 13, 'Pune', 'Financial Analyst', ['Modeling', 'SQL', 'Reporting']],
    ['Tara Menon', 6, 'Design', 19, 'Bengaluru', 'UX Lead', ['Design systems', 'Figma', 'Mentoring']]
  ];
  var CANDS = RAW.map(function (r, i) {
    return { id: i + 1, name: r[0], exp: r[1], domain: r[2], lpa: r[3], loc: r[4], title: r[5], skills: r[6], hue: (i * 47) % 360 };
  });

  var NOTIFS = [
    { id: 1, cat: 'match', title: 'New match: Ananya Rao', text: 'React and PHP skills fit your open role.', when: '2m', read: false, to: '#/candidate/6' },
    { id: 2, cat: 'interview', title: 'Interview scheduled', text: 'Rohan Iyer, tomorrow at 11:00 AM.', when: '1h', read: false, to: '#/interview' },
    { id: 3, cat: 'reminder', title: 'Interview reminder', text: 'Starts in 30 minutes with Meera Nair.', when: '3h', read: false, to: '#/interview' },
    { id: 4, cat: 'application', title: 'Application update', text: 'Diya Sharma applied for Growth Marketer.', when: 'Yesterday', read: true, to: '#/candidate/2' },
    { id: 5, cat: 'job', title: 'Job posting update', text: 'Your Senior Developer post reached 140 views.', when: 'Yesterday', read: true, to: '#/post' },
    { id: 6, cat: 'system', title: 'Complete your profile', text: 'Add a company logo to build trust.', when: '2d', read: true, to: '#/profile' }
  ];
  var CATS = {
    match: ['\u2605', 'Candidate match', '#ffb938'], application: ['\u2709', 'Application', '#5ec8ff'],
    interview: ['\u25A3', 'Interview', '#2fd6a3'], reminder: ['\u25F7', 'Reminder', '#ff6b57'],
    job: ['\u25A4', 'Job post', '#8f7bff'], system: ['\u24D8', 'System', '#d3dbe0']
  };

  var store = {
    get: function (k, d) { try { var v = localStorage.getItem('ra.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('ra.' + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }
  };
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  var api = {
    candidates: function () { return wait(350).then(function () { return CANDS; }); },
    decisions: function () { return store.get('dec', {}); },            // { id: 'approved' | 'rejected' }
    decide: function (id, d) {
      return wait(60).then(function () {
        var m = store.get('dec', {});
        if (d === 'approved' && m[id] === 'approved') { return m; }     // no duplicate approvals
        if (d === null) { delete m[id]; } else { m[id] = d; }
        store.set('dec', m);
        return m;
      });
    },
    notifications: function () { return store.get('notifs', NOTIFS); },
    saveNotifications: function (list) { store.set('notifs', list); }
  };

  /* ================= 2. Helpers ================= */
  var view = document.getElementById('view');
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var ICON = {
    search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>',
    bell: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 16V11a6 6 0 0112 0v5l2 2H4z"/><path d="M10 21h4"/></svg>'
  };

  // Placeholder portrait. Replace with `candidate.photo` URLs from your real API.
  function photo(c) {
    var s = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 560'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>" +
      "<stop offset='0' stop-color='hsl(" + c.hue + " 70% 45%)'/><stop offset='1' stop-color='hsl(" + ((c.hue + 60) % 360) + " 70% 30%)'/></linearGradient></defs>" +
      "<rect width='400' height='560' fill='url(#g)'/><circle cx='200' cy='210' r='80' fill='rgba(255,255,255,.28)'/>" +
      "<path d='M60 560c0-110 60-170 140-170s140 60 140 170z' fill='rgba(255,255,255,.28)'/></svg>";
    var enc = encodeURIComponent(s).replace(/'/g, '%27').replace(/\(/g, '%28').replace(/\)/g, '%29');
    return 'url(data:image/svg+xml,' + enc + ')';
  }
  var meta = function (c) { return c.exp + ' yrs \u00B7 ' + esc(c.domain) + ' \u00B7 ' + esc(c.loc) + ' \u00B7 \u20B9' + c.lpa + ' LPA'; };

  var toastTimer;
  function toast(msg) {
    var t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2200);
  }
  function unread() { return api.notifications().filter(function (n) { return !n.read; }).length; }
  function back(title, extra) {
    return '<header class="vh"><a class="iconbtn" href="#/home" aria-label="Back to Home">\u2039</a><h1>' + title + '</h1>' + (extra || '') + '</header>';
  }
  function state(title, text, action) {
    return '<div class="state"><div class="orb" aria-hidden="true"></div><h2>' + title + '</h2><p>' + text + '</p>' + (action || '') + '</div>';
  }
  function row(c, extra) {
    return '<li class="li"><a class="item" href="#/candidate/' + c.id + '"><span class="av" style="--photo:' + photo(c) + '"></span>' +
      '<span class="grow"><strong>' + esc(c.name) + '</strong><span class="sub">' + esc(c.title) + '</span><span class="sub">' + meta(c) + '</span></span>' +
      '<span aria-hidden="true">\u203A</span></a>' + (extra || '') + '</li>';
  }

  // Shared with employer-tabs.js
  var RA = window.RA = { $: $, esc: esc, store: store, view: view, toast: toast, api: api, CANDS: CANDS, photo: photo,
    row: row, state: state, wait: wait, ICON: ICON, focusTitle: focusTitle, routes: null, start: null, schedule: null };

  /* ================= 3. Screens ================= */

  /* ---- Home: swipe discovery ---- */
  var queue = [], busy = false;

  function move(el, dx) {
    el.style.transform = 'translateX(' + dx + 'px) rotate(' + (dx / 18) + 'deg)';
    el.style.setProperty('--ok', Math.max(0, Math.min(1, dx / 110)));
    el.style.setProperty('--no', Math.max(0, Math.min(1, -dx / 110)));
  }

  function attachDrag(el) {
    var sx = 0, dx = 0, drag = false;
    el.addEventListener('pointerdown', function (e) {
      if (busy) { return; }
      drag = true; sx = e.clientX; dx = 0; el.classList.add('drag');
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    });
    el.addEventListener('pointermove', function (e) { if (drag) { dx = e.clientX - sx; move(el, dx); } });
    function end() {
      if (!drag) { return; }
      drag = false; el.classList.remove('drag');
      if (Math.abs(dx) > 110) { act(dx > 0 ? 'approved' : 'rejected'); } else { move(el, 0); }
      dx = 0;
    }
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  function cardHtml(c, pos) {
    return '<article class="card" data-pos="' + pos + '" style="--photo:' + photo(c) + '"' + (pos ? ' aria-hidden="true"' : '') + '>' +
      '<span class="stamp ok" aria-hidden="true">APPROVE</span><span class="stamp no" aria-hidden="true">REJECT</span>' +
      '<h2>' + esc(c.name) + '</h2><p class="role">' + esc(c.title) + '</p>' +
      '<div class="chips"><span class="chip">' + c.exp + ' yrs exp</span><span class="chip">' + esc(c.domain) + '</span>' +
      '<span class="chip">\u20B9' + c.lpa + ' LPA</span><span class="chip">' + esc(c.loc) + '</span></div></article>';
  }

  function drawDeck() {
    var deck = $('#deck'); if (!deck) { return; }
    var acts = $('#actions'), n = Object.keys(api.decisions()).filter(function (k) { return api.decisions()[k] === 'approved'; }).length;
    $('#slcount').textContent = 'Shortlisted (' + n + ')';
    acts.hidden = !queue.length;
    if (!queue.length) {
      deck.style.aspectRatio = 'auto'; deck.style.maxHeight = 'none';
      deck.innerHTML = state('You\u2019re all caught up', 'No more candidates right now. Review your shortlist or search by skill.',
        '<a class="btn ok" href="#/shortlist">View shortlist</a>');
      return;
    }
    deck.style.aspectRatio = ''; deck.style.maxHeight = '';
    deck.innerHTML = queue.slice(0, 3).map(function (c, i) { return cardHtml(c, i); }).reverse().join('');
    attachDrag($('.card[data-pos="0"]', deck));
  }

  function act(decision) {
    if (busy || !queue.length) { return Promise.resolve(); }
    busy = true;
    var el = $('.card[data-pos="0"]'), dir = decision === 'approved' ? 1 : -1;
    el.classList.remove('drag');
    el.style.setProperty(dir > 0 ? '--ok' : '--no', 1);
    el.style.transform = 'translateX(' + dir * window.innerWidth + 'px) rotate(' + dir * 25 + 'deg)';
    el.style.opacity = 0;
    var c = queue[0];
    return wait(280).then(function () { return api.decide(c.id, decision); }).then(function () {
      queue.shift();
      toast(decision === 'approved' ? c.name + ' shortlisted' : c.name + ' skipped');
    }).catch(function () {
      toast('Could not save that. Please try again.');
    }).then(function () { busy = false; drawDeck(); });
  }

  function home() {
    var n = unread();
    view.innerHTML =
      '<header class="vh"><h1>Discover</h1>' +
      '<a class="iconbtn" href="#/notifications" aria-label="Notifications' + (n ? ', ' + n + ' unread' : '') + '">' + ICON.bell + (n ? '<span class="count" aria-hidden="true">' + n + '</span>' : '') + '</a></header>' +
      '<a class="searchbar" href="#/search">' + ICON.search + 'Search name, title, skill or location</a>' +
      '<div class="subrow"><span class="muted">Swipe or use the buttons</span><a id="slcount" href="#/shortlist">Shortlisted</a></div>' +
      '<div class="deck" id="deck" aria-live="polite"><div class="sk"></div></div>' +
      '<div class="actions" id="actions" hidden>' +
      '<button type="button" class="btn no" id="rej">Reject</button><button type="button" class="btn ok" id="acc">Accept</button></div>';
    $('#rej').onclick = function () { act('rejected'); };
    $('#acc').onclick = function () { act('approved'); };

    api.candidates().then(function (list) {
      if (!$('#deck')) { return; }
      var dec = api.decisions();
      queue = list.filter(function (c) { return !dec[c.id]; });
      drawDeck();
    }).catch(function () {
      var d = $('#deck'); if (!d) { return; }
      d.style.aspectRatio = 'auto';
      d.innerHTML = state('Couldn\u2019t load candidates', 'Check your connection and try again.', '<button type="button" class="btn ok" id="retry">Try again</button>');
      $('#retry').onclick = home;
    });
  }

  /* ---- Shortlist ---- */
  function shortlist() {
    api.candidates().then(function (all) {
      var dec = api.decisions(), mine = all.filter(function (c) { return dec[c.id] === 'approved'; });
      view.innerHTML = back('Shortlisted') + (mine.length
        ? '<ul class="list">' + mine.map(function (c) { return row(c, '<button type="button" class="btn ghost" data-rm="' + c.id + '" aria-label="Remove ' + esc(c.name) + ' from shortlist">Remove</button>'); }).join('') + '</ul>'
        : state('No one shortlisted yet', 'Candidates you accept will appear here.', '<a class="btn ok" href="#/home">Discover candidates</a>'));
      view.querySelectorAll('[data-rm]').forEach(function (b) {
        b.onclick = function () { api.decide(+b.dataset.rm, null).then(function () { toast('Removed from shortlist'); shortlist(); }); };
      });
      focusTitle();
    });
    return true;
  }

  /* ---- Global search ---- */
  function search() {
    api.candidates().then(function (all) {
      var uniq = function (k) { return all.map(function (c) { return c[k]; }).filter(function (v, i, a) { return a.indexOf(v) === i; }).sort(); };
      var opts = function (arr, label) { return '<option value="">' + label + '</option>' + arr.map(function (v) { return '<option>' + esc(v) + '</option>'; }).join(''); };
      var num = function (id, label) { return '<div><label for="' + id + '">' + label + '</label><input class="ctl" id="' + id + '" type="number" min="0" inputmode="numeric"></div>'; };
      view.innerHTML = back('Search') +
        '<form id="sf" role="search" autocomplete="off"><label class="sr" for="q">Search candidates</label>' +
        '<input class="ctl" id="q" type="search" placeholder="Name, title, skill, industry or location">' +
        '<details class="filters"><summary>Filters</summary><div class="grid">' +
        '<div><label for="floc">Location</label><select class="ctl" id="floc">' + opts(uniq('loc'), 'Any') + '</select></div>' +
        '<div><label for="find">Industry</label><select class="ctl" id="find">' + opts(uniq('domain'), 'Any') + '</select></div>' +
        num('emin', 'Min experience (yrs)') + num('emax', 'Max experience (yrs)') + num('smin', 'Min salary (LPA)') + num('smax', 'Max salary (LPA)') +
        '</div></details>' +
        '<div class="tools"><label for="sort">Sort by</label><select class="ctl" id="sort"><option value="name">Name</option>' +
        '<option value="exp">Experience: high to low</option><option value="lo">Salary: low to high</option><option value="hi">Salary: high to low</option></select></div></form>' +
        '<p id="count" class="muted" role="status"></p><ul class="list" id="res"></ul>' +
        '<p><button type="button" class="btn ghost" id="more" hidden>Load more</button></p>';

      var shown = 6;
      function run(reset) {
        if (reset) { shown = 6; }
        var q = $('#q').value.toLowerCase().split(/\s+/).filter(Boolean);
        var v = function (id) { var x = $('#' + id).value; return x === '' ? null : +x; };
        var loc = $('#floc').value, ind = $('#find').value, emin = v('emin'), emax = v('emax'), smin = v('smin'), smax = v('smax');
        var out = all.filter(function (c) {
          var hay = [c.name, c.title, c.domain, c.loc].concat(c.skills).join(' ').toLowerCase();
          return q.every(function (t) { return hay.indexOf(t) > -1; }) &&
            (!loc || c.loc === loc) && (!ind || c.domain === ind) &&
            (emin === null || c.exp >= emin) && (emax === null || c.exp <= emax) &&
            (smin === null || c.lpa >= smin) && (smax === null || c.lpa <= smax);
        });
        var s = $('#sort').value;
        out.sort(function (a, b) { return s === 'exp' ? b.exp - a.exp : s === 'lo' ? a.lpa - b.lpa : s === 'hi' ? b.lpa - a.lpa : a.name.localeCompare(b.name); });
        $('#count').textContent = out.length + (out.length === 1 ? ' candidate found' : ' candidates found');
        $('#res').innerHTML = out.length ? out.slice(0, shown).map(function (c) { return row(c); }).join('')
          : '<li>' + state('No matches', 'Try removing a filter or searching a different skill.') + '</li>';
        $('#more').hidden = out.length <= shown;
      }
      $('#sf').addEventListener('input', function () { run(true); });
      $('#sf').addEventListener('submit', function (e) { e.preventDefault(); });
      $('#more').onclick = function () { shown += 6; run(false); };
      run(true); focusTitle();
    });
    return true;
  }

  /* ---- Candidate profile ---- */
  function candidate(id) {
    api.candidates().then(function (all) {
      var c = all.filter(function (x) { return x.id === +id; })[0];
      if (!c) { view.innerHTML = back('Not found') + state('Candidate not found', 'This profile may have been removed.'); focusTitle(); return; }
      var d = api.decisions()[c.id];
      view.innerHTML = back('Profile') + '<section class="profile"><div class="hero" style="--photo:' + photo(c) + '" role="img" aria-label="Photo of ' + esc(c.name) + '"></div>' +
        '<h2>' + esc(c.name) + '</h2><p class="muted">' + esc(c.title) + '</p>' +
        '<div class="chips"><span class="chip">' + c.exp + ' yrs exp</span><span class="chip">' + esc(c.domain) + '</span><span class="chip">\u20B9' + c.lpa + ' LPA</span><span class="chip">' + esc(c.loc) + '</span></div>' +
        '<h3>Skills</h3><div class="chips">' + c.skills.map(function (s) { return '<span class="chip">' + esc(s) + '</span>'; }).join('') + '</div>' +
        '<div class="btnrow"><button type="button" class="btn no" id="pr">' + (d === 'rejected' ? 'Rejected' : 'Reject') + '</button>' +
        '<button type="button" class="btn ok" id="pa">' + (d === 'approved' ? 'Shortlisted \u2713' : 'Shortlist') + '</button>' + (d === 'approved' ? '<button type="button" class="btn ghost" id="ps">Schedule interview</button>' : '') + '</div></section>';
      $('#pa').onclick = function () { api.decide(c.id, 'approved').then(function () { toast(c.name + ' shortlisted'); candidate(id); }); };
      $('#pr').onclick = function () { api.decide(c.id, 'rejected').then(function () { toast(c.name + ' rejected'); candidate(id); }); };
      if ($('#ps')) { $('#ps').onclick = function () { RA.schedule(c); }; }
      focusTitle();
    });
    return true;
  }

  /* ---- Notification centre ---- */
  function notifs() {
    var list = api.notifications(), n = unread();
    view.innerHTML = back('Notifications', n ? '<button type="button" class="btn ghost" id="all">Mark all as read</button>' : '') +
      (list.length ? '<ul class="list notif">' + list.map(function (x) {
        var c = CATS[x.cat];
        return '<li><button type="button" class="item' + (x.read ? '' : ' unread') + '" data-n="' + x.id + '">' +
          '<span class="glyph" style="background:' + c[2] + '" aria-hidden="true">' + c[0] + '</span>' +
          '<span class="grow"><strong>' + esc(x.title) + (x.read ? '' : '<span class="sr"> (unread)</span>') + '</strong><span class="sub">' + esc(x.text) + '</span><span class="sub">' + c[1] + '</span></span>' +
          '<span class="when">' + esc(x.when) + '</span></button></li>';
      }).join('') + '</ul>' : state('Nothing here yet', 'Updates about candidates and interviews will show up here.'));
    var all = $('#all');
    if (all) { all.onclick = function () { api.saveNotifications(api.notifications().map(function (x) { x.read = true; return x; })); toast('All caught up'); notifs(); }; }
    view.querySelectorAll('[data-n]').forEach(function (b) {
      b.onclick = function () {
        var l = api.notifications(), t = '#/home';
        l.forEach(function (x) { if (x.id === +b.dataset.n) { x.read = true; t = x.to; } });
        api.saveNotifications(l); location.hash = t;
      };
    });
    focusTitle();
    return true;
  }

  /* ---- Tabs still to build ---- */
  function soon(title, text) {
    return function () {
      view.innerHTML = '<header class="vh"><h1>' + title + '</h1></header>' + state('Coming next', text, '<a class="btn ok" href="#/home">Back to Home</a>');
      focusTitle(); return true;
    };
  }

  /* ================= 4. Router ================= */
  var routes = [
    [/^#\/home$/, home, 'Discover', 'home'],
    [/^#\/search$/, search, 'Search', 'home'],
    [/^#\/shortlist$/, shortlist, 'Shortlisted', 'home'],
    [/^#\/candidate\/(\d+)$/, candidate, 'Candidate', 'home'],
    [/^#\/notifications$/, notifs, 'Notifications', 'home']
  ];

  function focusTitle() {
    var h = $('h1', view);
    if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
  }

  function route() {
    var h = location.hash || '#/home', hit = null, m;
    routes.forEach(function (r) { if (!hit && (m = h.match(r[0]))) { hit = [r, m]; } });
    if (!hit) { location.hash = '#/home'; return; }
    var r = hit[0], res = r[1](hit[1][1]);
    document.title = r[2] + ' \u00B7 Employer';
    document.querySelectorAll('.tabbar a').forEach(function (a) {
      if (a.dataset.tab === r[3]) { a.setAttribute('aria-current', 'page'); } else { a.removeAttribute('aria-current'); }
    });
    window.scrollTo(0, 0);
    if (!res) { focusTitle(); }   // synchronous screens focus now; async ones focus when ready
  }

  RA.routes = routes;
  RA.start = route;   // employer-tabs.js registers its routes, then calls RA.start()
  window.addEventListener('hashchange', route);
})();
