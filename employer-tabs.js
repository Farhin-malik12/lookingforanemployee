/* employer-tabs.js — Post Job, Interview and Profile tabs. Loads after employer.js.
 * Data lives in localStorage through RA.store (swap for real API calls later). */
(function () {
  'use strict';
  var R = window.RA, $ = R.$, esc = R.esc, store = R.store, view = R.view, toast = R.toast, CANDS = R.CANDS;

  /* ================= Helpers ================= */
  var pad = function (n) { return String(n).padStart(2, '0'); };
  var isoDay = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  var dayFmt = function (s) { return new Date(s + 'T00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); };
  var dtFmt = function (iso) { return new Date(iso).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }); };
  var localInput = function (d) { return isoDay(d) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  var chips = function (a) { return a.filter(Boolean).map(function (t) { return '<span class="chip">' + esc(t) + '</span>'; }).join(''); };
  var head = function (title, back, extra) {
    return '<header class="vh">' + (back ? '<a class="iconbtn" href="' + back + '" aria-label="Back">\u2039</a>' : '') + '<h1>' + title + '</h1>' + (extra || '') + '</header>';
  };
  function notify(cat, title, text, to) {
    var l = R.api.notifications(); l.unshift({ id: Date.now(), cat: cat, title: title, text: text, when: 'Just now', read: false, to: to });
    R.api.saveNotifications(l);
  }
  function copy(text, msg) {
    function fallback() {
      var t = document.createElement('textarea'); t.value = text; t.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); toast(msg); } catch (e) { toast('Could not copy'); }
      t.remove();
    }
    if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(text).then(function () { toast(msg); }, fallback); } else { fallback(); }
  }

  // Modal dialog: buttons = [{ label, cls, fn }]; fn returning false keeps it open.
  var dlg = $('#dlg');
  dlg.addEventListener('click', function (e) { if (e.target === dlg) { dlg.close(); } });
  function dialog(title, body, buttons) {
    dlg.innerHTML = '<h2 id="dlg-title">' + title + '</h2><div>' + body + '</div><div class="btnrow" id="dlg-bar"></div>';
    buttons.forEach(function (b) {
      var el = document.createElement('button'); el.type = 'button'; el.className = 'btn ' + (b.cls || 'ghost'); el.textContent = b.label;
      el.onclick = function () { if (!b.fn || b.fn() !== false) { dlg.close(); } };
      $('#dlg-bar', dlg).appendChild(el);
    });
    dlg.showModal();
    return dlg;
  }

  // Form field helpers
  var fld = function (id, label, control, hint) {
    return '<div class="field"><label for="' + id + '">' + label + '</label>' + control +
      (hint ? '<p class="hint" id="' + id + '-hint">' + hint + '</p>' : '') + '<p class="field-error" id="' + id + '-error" hidden></p></div>';
  };
  var inp = function (id, type, val, extra) {
    return '<input class="ctl" id="' + id + '" name="' + id + '" type="' + type + '" value="' + esc(val == null ? '' : val) + '" aria-describedby="' + id + '-error" ' + (extra || '') + '>';
  };
  var sel = function (id, val, arr, ph) {
    return '<select class="ctl" id="' + id + '" name="' + id + '" aria-describedby="' + id + '-error"><option value="">' + ph + '</option>' +
      arr.map(function (v) { return '<option' + (v === val ? ' selected' : '') + '>' + esc(v) + '</option>'; }).join('') + '</select>';
  };
  var dl = function (id, arr) { return '<datalist id="' + id + '">' + arr.map(function (v) { return '<option value="' + esc(v) + '">'; }).join('') + '</datalist>'; };
  function err(id, msg) {
    var e = $('#' + id + '-error'), i = $('#' + id);
    if (e) { e.textContent = msg || ''; e.hidden = !msg; }
    if (i) { i.setAttribute('aria-invalid', msg ? 'true' : 'false'); }
  }
  function showErrors(ids, e) {
    ids.forEach(function (id) { err(id, e[id]); });
    var first = ids.filter(function (id) { return e[id]; })[0];
    if (first) { $('#' + first).focus(); toast('Please fix the highlighted fields.'); return false; }
    return true;
  }
  // Keep only simple formatting from the rich-text description.
  function clean(html) {
    var t = document.createElement('template'); t.innerHTML = html;
    var ok = { B: 1, I: 1, STRONG: 1, EM: 1, UL: 1, OL: 1, LI: 1, P: 1, BR: 1, DIV: 1 };
    (function walk(n) {
      Array.prototype.slice.call(n.childNodes).forEach(function (c) {
        if (c.nodeType === 3) { return; }
        if (c.nodeType !== 1 || /^(SCRIPT|STYLE)$/.test(c.tagName)) { c.remove(); return; }
        walk(c);
        if (!ok[c.tagName]) { while (c.firstChild) { n.insertBefore(c.firstChild, c); } c.remove(); }
        else { while (c.attributes.length) { c.removeAttribute(c.attributes[0].name); } }
      });
    })(t.content);
    return t.innerHTML;
  }

  var CATS = ['Engineering', 'Sales', 'Marketing', 'Finance', 'HR', 'Design', 'Operations'];
  var TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance'];
  var WORK = ['On-site', 'Hybrid', 'Remote'];
  var INDS = ['Software', 'Marketing', 'Finance', 'Design', 'Sales', 'Operations', 'HR', 'Healthcare', 'Education', 'Manufacturing'];
  var LOCS = ['Bengaluru', 'Mumbai', 'Delhi', 'Hyderabad', 'Chennai', 'Pune', 'Ahmedabad'];
  var EDUS = ['High school', 'Diploma', 'B.Tech / B.E.', 'B.Com', 'BBA', 'MBA', 'M.Tech', 'Any graduate'];

  /* ================= Profile data (also supplies the default company name) ================= */
  var profile = function () {
    return store.get('profile', { name: 'Employer', dob: '', loc: '', nat: '', edu: '', desig: '', company: 'Appname', ind: '', contact: '', about: '', photo: '' });
  };

  /* ================= POST JOB ================= */
  var today = isoDay(new Date()), plus = function (n) { var d = new Date(); d.setDate(d.getDate() + n); return isoDay(d); };
  var SEED_JOBS = [
    { id: 1, title: 'Senior Backend Engineer', company: 'Appname', type: 'Full-time', sMin: 20, sMax: 30, eMin: 5, eMax: 9, loc: 'Bengaluru', cat: 'Engineering',
      work: 'Hybrid', ind: 'Software', desc: '<p>Build and scale the APIs behind our hiring platform.</p>', skills: ['Node.js', 'AWS', 'SQL'], edu: 'B.Tech / B.E.',
      open: 2, deadline: plus(30), status: 'published', pub: plus(-3), apps: [1, 6, 9] },
    { id: 2, title: 'Product Designer', company: 'Appname', type: 'Full-time', sMin: 12, sMax: 18, eMin: 3, eMax: 6, loc: 'Pune', cat: 'Design',
      work: 'On-site', ind: 'Design', desc: '', skills: ['Figma'], edu: '', open: 1, deadline: '', status: 'draft', pub: '', apps: [] }
  ];
  var jobs = function () { return store.get('jobs', SEED_JOBS); };
  var saveJobs = function (l) { store.set('jobs', l); };
  var statusLabel = { published: 'Published', draft: 'Draft', closed: 'Closed' };

  function myJobs() {
    var list = jobs();
    view.innerHTML = head('Post Job', null, '<a class="btn ok" href="#/post/new">New job</a>') +
      (list.length ? '<ul class="list">' + list.map(function (j) {
        var info = j.status === 'draft' ? 'Not published yet' : 'Published ' + dayFmt(j.pub) + ' \u00B7 ' + j.apps.length + (j.apps.length === 1 ? ' applicant' : ' applicants');
        return '<li class="jobc"><h2>' + esc(j.title) + ' <span class="pill ' + j.status + '">' + statusLabel[j.status] + '</span></h2>' +
          '<span class="sub">' + esc(j.company) + ' \u00B7 ' + esc(j.type || '') + ' \u00B7 ' + esc(j.loc || '') + (j.sMax != null ? ' \u00B7 \u20B9' + j.sMin + '\u2013' + j.sMax + ' LPA' : '') + '</span>' +
          '<span class="sub">' + info + '</span><div class="rowx">' +
          '<a class="btn ghost" href="#/post/edit/' + j.id + '">Edit</a>' +
          (j.status !== 'draft' ? '<a class="btn ghost" href="#/post/applicants/' + j.id + '">View applicants</a>' : '') +
          (j.status === 'published' ? '<button type="button" class="btn no" data-st="closed" data-id="' + j.id + '">Close job</button>' : '') +
          (j.status === 'closed' ? '<button type="button" class="btn ok" data-st="published" data-id="' + j.id + '">Reopen</button>' : '') +
          '</div></li>';
      }).join('') + '</ul>' : R.state('No jobs yet', 'Create your first job post to start receiving applicants.', '<a class="btn ok" href="#/post/new">Post a job</a>'));
    view.querySelectorAll('[data-st]').forEach(function (b) {
      b.onclick = function () {
        var l = jobs(); l.forEach(function (j) { if (j.id === +b.dataset.id) { j.status = b.dataset.st; } });
        saveJobs(l); toast(b.dataset.st === 'closed' ? 'Job closed' : 'Job reopened'); myJobs(); R.focusTitle();
      };
    });
  }

  function applicants(id) {
    var j = jobs().filter(function (x) { return x.id === +id; })[0];
    if (!j) { view.innerHTML = head('Not found', '#/post') + R.state('Job not found', 'It may have been removed.'); return; }
    var c = j.apps.map(function (i) { return CANDS.filter(function (x) { return x.id === i; })[0]; }).filter(Boolean);
    view.innerHTML = head('Applicants', '#/post') + '<p class="muted">' + esc(j.title) + ' \u00B7 ' + c.length + ' applicant' + (c.length === 1 ? '' : 's') + '</p>' +
      (c.length ? '<ul class="list">' + c.map(function (x) { return R.row(x); }).join('') + '</ul>' : R.state('No applicants yet', 'Applicants will appear here once people apply.'));
  }

  var FIELD_IDS = ['title', 'company', 'type', 'sMin', 'sMax', 'eMin', 'eMax', 'loc', 'cat', 'work', 'ind', 'desc', 'skills', 'edu', 'open', 'deadline'];

  function jobForm(id) {
    var j = id ? jobs().filter(function (x) { return x.id === +id; })[0] : null;
    if (id && !j) { view.innerHTML = head('Not found', '#/post') + R.state('Job not found', 'It may have been removed.'); return; }
    j = j || { title: '', company: profile().company || '', type: '', sMin: null, sMax: null, eMin: null, eMax: null, loc: '', cat: '', work: '', ind: '', desc: '', skills: [], edu: '', open: 1, deadline: '', status: 'draft', pub: '', apps: [] };
    var live = j.status !== 'draft';
    view.innerHTML = head(id ? 'Edit job' : 'New job', '#/post') +
      '<form id="jf" novalidate>' +
      fld('title', 'Job title', inp('title', 'text', j.title, 'required')) +
      fld('company', 'Company name', inp('company', 'text', j.company)) +
      fld('type', 'Employment type', sel('type', j.type, TYPES, 'Select type')) +
      '<div class="grid">' + fld('sMin', 'Salary min (LPA)', inp('sMin', 'number', j.sMin, 'min="0" step="0.5" inputmode="decimal"')) +
      fld('sMax', 'Salary max (LPA)', inp('sMax', 'number', j.sMax, 'min="0" step="0.5" inputmode="decimal"')) +
      fld('eMin', 'Min experience (yrs)', inp('eMin', 'number', j.eMin, 'min="0" inputmode="numeric"')) +
      fld('eMax', 'Max experience (yrs)', inp('eMax', 'number', j.eMax, 'min="0" inputmode="numeric"')) + '</div>' +
      fld('loc', 'Job location', inp('loc', 'text', j.loc, 'list="dl-loc" autocomplete="off"')) +
      fld('cat', 'Job category', sel('cat', j.cat, CATS, 'Select category')) +
      fld('work', 'Workplace type', sel('work', j.work, WORK, 'Select workplace')) +
      fld('ind', 'Industry', inp('ind', 'text', j.ind, 'list="dl-ind" autocomplete="off"')) +
      '<div class="field"><label id="desc-l">Job description</label>' +
      '<div class="rtb" role="toolbar" aria-label="Formatting"><button type="button" data-cmd="bold" aria-label="Bold">B</button><button type="button" data-cmd="italic" aria-label="Italic"><i>I</i></button><button type="button" data-cmd="insertUnorderedList" aria-label="Bulleted list">\u2022</button></div>' +
      '<div class="rte" id="desc" contenteditable="true" role="textbox" aria-multiline="true" aria-labelledby="desc-l" aria-describedby="desc-error">' + (j.desc || '') + '</div>' +
      '<p class="field-error" id="desc-error" hidden></p></div>' +
      fld('skills', 'Required skills', inp('skills', 'text', j.skills.join(', '), 'autocomplete="off"'), 'Separate skills with commas.') +
      fld('edu', 'Educational qualification', inp('edu', 'text', j.edu, 'list="dl-edu" autocomplete="off"')) +
      '<div class="grid">' + fld('open', 'Number of openings', inp('open', 'number', j.open, 'min="1" inputmode="numeric"')) +
      fld('deadline', 'Application deadline', inp('deadline', 'date', j.deadline, 'min="' + today + '"')) + '</div>' +
      dl('dl-loc', LOCS) + dl('dl-ind', INDS) + dl('dl-edu', EDUS) +
      '<div class="btnrow">' + (live ? '' : '<button type="button" class="btn ghost" id="sd">Save as draft</button>') +
      '<button type="button" class="btn ghost" id="pv">Preview</button>' +
      '<button type="button" class="btn ok" id="pb">' + (live ? 'Save changes' : 'Publish') + '</button></div></form>';

    view.querySelectorAll('[data-cmd]').forEach(function (b) {
      b.onmousedown = function (e) { e.preventDefault(); };
      b.onclick = function () { document.execCommand(b.dataset.cmd); };
    });
    var num = function (k) { var x = ($('#' + k).value || '').trim(); return x === '' ? null : +x; };
    var txt = function (k) { return ($('#' + k).value || '').trim(); };
    function collect() {
      return Object.assign({}, j, {
        title: txt('title'), company: txt('company'), type: txt('type'), sMin: num('sMin'), sMax: num('sMax'), eMin: num('eMin'), eMax: num('eMax'),
        loc: txt('loc'), cat: txt('cat'), work: txt('work'), ind: txt('ind'), desc: clean($('#desc').innerHTML),
        skills: txt('skills').split(',').map(function (s) { return s.trim(); }).filter(Boolean), edu: txt('edu'), open: num('open'), deadline: txt('deadline')
      });
    }
    function check(x, full) {
      var e = {};
      if (!x.title) { e.title = 'Enter a job title.'; }
      if (!full) { return e; }
      if (!x.company) { e.company = 'Enter the company name.'; }
      if (!x.type) { e.type = 'Choose an employment type.'; }
      if (x.sMin === null) { e.sMin = 'Enter the minimum salary.'; }
      if (x.sMax === null) { e.sMax = 'Enter the maximum salary.'; } else if (x.sMin !== null && x.sMin > x.sMax) { e.sMax = 'Maximum must be at least the minimum.'; }
      if (x.eMin === null) { e.eMin = 'Enter the minimum experience.'; }
      if (x.eMax === null) { e.eMax = 'Enter the maximum experience.'; } else if (x.eMin !== null && x.eMin > x.eMax) { e.eMax = 'Maximum must be at least the minimum.'; }
      if (!x.loc) { e.loc = 'Enter the job location.'; }
      if (!x.cat) { e.cat = 'Choose a category.'; }
      if (!x.work) { e.work = 'Choose a workplace type.'; }
      if (!x.ind) { e.ind = 'Enter the industry.'; }
      if ($('#desc').textContent.trim().length < 20) { e.desc = 'Describe the role in at least 20 characters.'; }
      if (!x.skills.length) { e.skills = 'Add at least one skill.'; }
      if (!x.edu) { e.edu = 'Enter the required qualification.'; }
      if (!x.open || x.open < 1) { e.open = 'Enter at least 1 opening.'; }
      if (!x.deadline) { e.deadline = 'Choose an application deadline.'; } else if (x.deadline < today) { e.deadline = 'The deadline can\u2019t be in the past.'; }
      return e;
    }
    function persist(x) {
      var l = jobs(), i = l.map(function (y) { return y.id; }).indexOf(x.id);
      if (i < 0) { x.id = Date.now(); l.unshift(x); } else { l[i] = x; }
      saveJobs(l);
    }
    if ($('#sd')) {
      $('#sd').onclick = function () {
        var x = collect(); if (!showErrors(FIELD_IDS, check(x, false))) { return; }
        x.status = 'draft'; persist(x); toast('Draft saved'); location.hash = '#/post';
      };
    }
    $('#pv').onclick = function () {
      var x = collect();
      dialog('Preview', '<h3>' + esc(x.title || 'Untitled job') + '</h3><p class="muted">' + esc([x.company, x.type, x.work, x.loc].filter(Boolean).join(' \u00B7 ')) + '</p>' +
        '<div class="chips">' + chips([x.cat, x.ind, x.sMax != null ? '\u20B9' + x.sMin + '\u2013' + x.sMax + ' LPA' : '', x.eMax != null ? x.eMin + '\u2013' + x.eMax + ' yrs' : '', x.open ? x.open + ' opening' + (x.open > 1 ? 's' : '') : '']) + '</div>' +
        '<div class="rt">' + (x.desc || '<p>No description yet.</p>') + '</div><h3>Skills</h3><div class="chips">' + chips(x.skills) + '</div>' +
        '<p class="muted">' + (x.edu ? esc(x.edu) + '. ' : '') + (x.deadline ? 'Apply by ' + dayFmt(x.deadline) + '.' : '') + '</p>', [{ label: 'Close' }]);
    };
    $('#pb').onclick = function () {
      var x = collect(); if (!showErrors(FIELD_IDS, check(x, true))) { return; }
      var first = x.status === 'draft';
      x.status = 'published'; x.pub = x.pub || today; x.apps = x.apps || []; persist(x);
      if (first) { notify('job', 'Job published', x.title + ' is now live.', '#/post'); }
      toast(first ? 'Job published' : 'Changes saved'); location.hash = '#/post';
    };
  }

  /* ================= INTERVIEW ================= */
  var rid = function () {
    var a = 'abcdefghijklmnopqrstuvwxyz', r = function (n) { var s = ''; for (var i = 0; i < n; i++) { s += a[Math.floor(Math.random() * 26)]; } return s; };
    return r(3) + '-' + r(4) + '-' + r(3);
  };
  var mk = function (id, cid, job, when, status, mid) { return { id: id, cid: cid, job: job, company: 'Appname', when: when.toISOString(), status: status, mid: mid, link: 'https://meet.example.com/' + mid }; };
  var off = function (ms) { return new Date(Date.now() + ms); }, H = 3600000, D = 86400000;
  var ivs = function () {
    return store.get('ivs', [
      mk(1, 4, 'Product Designer', off(-15 * 60000), 'inprogress', 'pdx-meet-001'),
      mk(2, 6, 'Senior Backend Engineer', off(2 * H), 'scheduled', 'sbe-chat-002'),
      mk(3, 3, 'Finance Manager', off(D + H), 'scheduled', 'fin-room-003'),
      mk(4, 12, 'Product Designer', off(3 * D), 'rescheduled', 'ux-lead-004'),
      mk(5, 2, 'Growth Marketer', off(-D), 'completed', 'gro-talk-005'),
      mk(6, 5, 'Sales Executive', off(-4 * D), 'cancelled', 'sal-call-006')
    ]);
  };
  var saveIvs = function (l) { store.set('ivs', l); };
  var statusText = { scheduled: 'Scheduled', inprogress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled', rescheduled: 'Rescheduled' };
  var ivTab = 'present';
  function bucket(iv) {
    var d = new Date(iv.when), n = new Date();
    if (iv.status === 'inprogress' || d.toDateString() === n.toDateString()) { return 'present'; }
    return d < n ? 'past' : 'future';
  }
  var isLive = function (iv) { return iv.status === 'scheduled' || iv.status === 'rescheduled' || iv.status === 'inprogress'; };

  function ivCard(iv) {
    var c = CANDS.filter(function (x) { return x.id === iv.cid; })[0] || CANDS[0], live = isLive(iv), b = bucket(iv), a = [];
    if (live && b === 'present') { a.push(['join', 'Join meeting', 'ok']); }
    a.push(['cid', 'Copy ID', 'ghost'], ['clink', 'Copy link', 'ghost'], ['profile', 'View profile', 'ghost']);
    if (live) { a.push(['resched', 'Reschedule', 'ghost'], ['done', 'Mark completed', 'ghost'], ['cancel', 'Cancel', 'no']); }
    return '<li class="ivc"><div class="ivh"><span class="av" style="--photo:' + R.photo(c) + '"></span><div class="grow"><strong>' + esc(c.name) + '</strong>' +
      '<span class="sub">' + esc(iv.job) + ' \u00B7 ' + esc(iv.company) + '</span></div><span class="pill s-' + iv.status + '">' + statusText[iv.status] + '</span></div>' +
      '<dl class="ivd"><div><dt>Meeting ID</dt><dd>' + esc(iv.mid) + '</dd></div><div><dt>Date and time</dt><dd>' + dtFmt(iv.when) + '</dd></div>' +
      '<div><dt>Meeting link</dt><dd>' + esc(iv.link) + '</dd></div></dl><div class="ivacts">' +
      a.map(function (x) { return '<button type="button" class="btn ' + x[2] + '" data-a="' + x[0] + '" data-id="' + iv.id + '">' + x[1] + '</button>'; }).join('') + '</div></li>';
  }

  function interview() {
    var all = ivs(), names = { present: 'Present', past: 'Past', future: 'Future' };
    var counts = {}; Object.keys(names).forEach(function (k) { counts[k] = all.filter(function (i) { return bucket(i) === k; }).length; });
    view.innerHTML = head('Interviews') +
      '<div class="seg" role="tablist" aria-label="Interview timing">' + Object.keys(names).map(function (k) {
        return '<button type="button" role="tab" id="t-' + k + '" data-k="' + k + '" aria-selected="' + (k === ivTab) + '" aria-controls="ivp" tabindex="' + (k === ivTab ? 0 : -1) + '">' + names[k] + ' (' + counts[k] + ')</button>';
      }).join('') + '</div><div id="ivp" role="tabpanel" aria-labelledby="t-' + ivTab + '"></div>';

    function panel() {
      var l = all.filter(function (i) { return bucket(i) === ivTab; }).sort(function (a, b) { return ivTab === 'past' ? new Date(b.when) - new Date(a.when) : new Date(a.when) - new Date(b.when); });
      $('#ivp').innerHTML = l.length ? '<ul class="list">' + l.map(ivCard).join('') + '</ul>'
        : R.state('No ' + ivTab + ' interviews', ivTab === 'future' ? 'Shortlist a candidate and schedule an interview from their profile.' : 'Nothing here right now.');
    }
    panel();
    view.querySelectorAll('[role="tab"]').forEach(function (t) {
      t.onclick = function () { ivTab = t.dataset.k; interview(); $('#t-' + ivTab).focus(); };
      t.onkeydown = function (e) {
        var k = Object.keys(names), i = k.indexOf(ivTab), n = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (n) { e.preventDefault(); ivTab = k[(i + n + 3) % 3]; interview(); $('#t-' + ivTab).focus(); }
      };
    });
    $('#ivp').onclick = function (e) {
      var b = e.target.closest('[data-a]'); if (!b) { return; }
      var all2 = ivs(), iv = all2.filter(function (x) { return x.id === +b.dataset.id; })[0], a = b.dataset.a;
      var c = CANDS.filter(function (x) { return x.id === iv.cid; })[0] || CANDS[0];
      var set = function (st, msg) { iv.status = st; saveIvs(all2); toast(msg); interview(); };
      if (a === 'join') { iv.status = 'inprogress'; saveIvs(all2); window.open(iv.link, '_blank', 'noopener'); interview(); }
      else if (a === 'cid') { copy(iv.mid, 'Meeting ID copied'); }
      else if (a === 'clink') { copy(iv.link, 'Meeting link copied'); }
      else if (a === 'profile') { location.hash = '#/candidate/' + iv.cid; }
      else if (a === 'done') { set('completed', 'Marked as completed'); }
      else if (a === 'cancel') {
        dialog('Cancel interview?', '<p>Cancel the interview with ' + esc(c.name) + '? The candidate will be notified.</p>',
          [{ label: 'Keep it' }, { label: 'Cancel interview', cls: 'no', fn: function () { notify('interview', 'Interview cancelled', 'Interview with ' + c.name + ' was cancelled.', '#/interview'); set('cancelled', 'Interview cancelled'); } }]);
      } else if (a === 'resched') {
        dialog('Reschedule interview', fld('rs', 'New date and time', inp('rs', 'datetime-local', localInput(new Date(iv.when)), 'min="' + localInput(new Date()) + '"')), [{ label: 'Close' },
          { label: 'Reschedule', cls: 'ok', fn: function () {
            var v = $('#rs').value, d = new Date(v);
            if (!v || isNaN(d) || d < new Date()) { err('rs', 'Choose a future date and time.'); $('#rs').focus(); return false; }
            iv.when = d.toISOString(); notify('interview', 'Interview rescheduled', c.name + ': ' + dtFmt(iv.when), '#/interview'); set('rescheduled', 'Interview rescheduled');
          } }]);
      }
    };
  }

  // "Schedule interview" from a shortlisted candidate's profile
  R.schedule = function (c) {
    var titles = jobs().filter(function (j) { return j.status === 'published'; }).map(function (j) { return j.title; });
    var soon = new Date(Date.now() + D); soon.setMinutes(0, 0, 0);
    dialog('Schedule interview', '<p class="muted">With ' + esc(c.name) + '</p>' + fld('sj', 'Job title', inp('sj', 'text', titles[0] || c.title, 'list="dl-sj" autocomplete="off"')) + dl('dl-sj', titles) +
      fld('sw', 'Date and time', inp('sw', 'datetime-local', localInput(soon), 'min="' + localInput(new Date()) + '"')), [{ label: 'Close' },
      { label: 'Schedule', cls: 'ok', fn: function () {
        var job = $('#sj').value.trim(), d = new Date($('#sw').value), bad = false;
        err('sj', job ? '' : 'Enter the job title.'); if (!job) { bad = true; }
        if (isNaN(d) || d < new Date()) { err('sw', 'Choose a future date and time.'); bad = true; } else { err('sw', ''); }
        if (bad) { return false; }
        var l = ivs(), m = rid(); l.push({ id: Date.now(), cid: c.id, job: job, company: profile().company || 'Appname', when: d.toISOString(), status: 'scheduled', mid: m, link: 'https://meet.example.com/' + m });
        saveIvs(l); notify('interview', 'Interview scheduled', c.name + ': ' + dtFmt(d.toISOString()), '#/interview');
        toast('Interview scheduled'); ivTab = bucket(l[l.length - 1]); location.hash = '#/interview';
      } }]);
  };

  /* ================= PROFILE ================= */
  var PREFS = { interviews: true, matches: true, jobs: true, email: true, push: false, visible: true, showCompany: true, twofa: false };
  var prefs = function () { return Object.assign({}, PREFS, store.get('prefs', {})); };
  var sw = function (k, label) { return '<label class="switch"><input type="checkbox" role="switch" data-pref="' + k + '"' + (prefs()[k] ? ' checked' : '') + '><span class="sw" aria-hidden="true"></span><span>' + label + '</span></label>'; };
  function wirePrefs(root) {
    root.querySelectorAll('[data-pref]').forEach(function (i) {
      i.onchange = function () { var p = prefs(); p[i.dataset.pref] = i.checked; store.set('prefs', p); toast('Preference saved'); };
    });
  }
  function shrink(file, cb) {
    var fr = new FileReader();
    fr.onload = function () {
      var img = new Image();
      img.onload = function () {
        var s = Math.min(1, 360 / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); cb(c.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = function () { toast('That file isn\u2019t a valid image.'); };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  }

  function photoDialog() {
    var pending = null;
    dialog('Profile photo', '<p class="muted">Choose how to add a new photo.</p><div class="btnrow" style="justify-content:flex-start">' +
      '<button type="button" class="btn ghost" id="cam">Take a photo</button><button type="button" class="btn ghost" id="gal">Choose from gallery</button></div>' +
      '<input type="file" id="f-cam" accept="image/*" capture="user" hidden><input type="file" id="f-gal" accept="image/*" hidden>' +
      '<img class="pv" id="pvimg" alt="Preview of the new profile photo" hidden>', [{ label: 'Cancel' },
      { label: 'Save photo', cls: 'ok', fn: function () {
        if (!pending) { toast('Choose a photo first.'); return false; }
        var p = profile(); p.photo = pending; store.set('profile', p); toast('Photo updated'); profileView();
      } }]);
    ['cam', 'gal'].forEach(function (k) {
      $('#' + k).onclick = function () { $('#f-' + k).click(); };   // permission prompts happen only now
      $('#f-' + k).onchange = function (e) {
        var f = e.target.files[0]; if (!f) { return; }
        if (f.type.indexOf('image/') !== 0 || f.size > 10 * 1024 * 1024) { toast('Choose an image under 10 MB.'); return; }
        shrink(f, function (url) { pending = url; var im = $('#pvimg'); im.src = url; im.hidden = false; });
      };
    });
  }

  function profileView() {
    var p = profile();
    view.innerHTML = '<header class="phead"><button type="button" class="avbig" id="chg" aria-label="Change profile photo"></button>' +
      '<div class="grow"><h1>' + esc(p.name || 'Your name') + '</h1><span class="sub">' + esc([p.desig, p.company].filter(Boolean).join(' \u00B7 ')) + '</span></div>' +
      '<button type="button" class="iconbtn" id="ed" aria-label="Edit profile"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/></svg></button></header>' +
      '<form id="pf" novalidate><h2 class="sec" style="margin-top:0">Personal information</h2>' +
      fld('pname', 'Full name', inp('pname', 'text', p.name, 'autocomplete="name"')) + fld('pdob', 'Date of birth', inp('pdob', 'date', p.dob, 'max="' + today + '" autocomplete="bday"')) +
      fld('ploc', 'Location', inp('ploc', 'text', p.loc, 'list="dl-loc" autocomplete="address-level2"')) + fld('pnat', 'Nationality', inp('pnat', 'text', p.nat)) +
      fld('pedu', 'Educational qualifications', inp('pedu', 'text', p.edu, 'list="dl-edu"')) + fld('pdes', 'Professional designation', inp('pdes', 'text', p.desig)) +
      fld('pco', 'Company name', inp('pco', 'text', p.company, 'autocomplete="organization"')) + fld('pind', 'Industry', inp('pind', 'text', p.ind, 'list="dl-ind"')) +
      fld('pcon', 'Contact (email or phone)', inp('pcon', 'text', p.contact, 'autocomplete="email"')) +
      fld('pab', 'About', '<textarea class="ctl" id="pab" maxlength="500" aria-describedby="pab-error">' + esc(p.about) + '</textarea>', 'Up to 500 characters.') +
      dl('dl-loc', LOCS) + dl('dl-ind', INDS) + dl('dl-edu', EDUS) + '<button type="submit" class="btn ok" style="width:100%">Save changes</button></form>' +
      '<h2 class="sec">Notification preferences</h2><div class="card2">' + sw('interviews', 'Interview reminders') + sw('matches', 'Candidate matches') + sw('jobs', 'Job updates') + sw('email', 'Email notifications') + sw('push', 'Push notifications') + '</div>' +
      '<h2 class="sec">Settings</h2><div class="card2">' + [['sec', 'Account security'], ['pw', 'Change password'], ['lang', 'Language preferences'], ['priv', 'Privacy settings'],
        ['help', 'Help and support'], ['terms', 'Terms and conditions'], ['policy', 'Privacy policy']].map(function (x) {
        return '<button type="button" class="srow" data-s="' + x[0] + '">' + x[1] + '<span aria-hidden="true">\u203A</span></button>'; }).join('') +
      '<button type="button" class="srow" data-s="out">Sign out</button><button type="button" class="srow danger" data-s="del">Delete account</button></div>';

    if (p.photo) { $('#chg').style.backgroundImage = 'url(' + p.photo + ')'; } else { $('#chg').style.backgroundImage = R.photo({ hue: 250 }); }
    $('#chg').onclick = photoDialog;
    $('#ed').onclick = function () { $('#pname').focus(); $('#pname').scrollIntoView({ block: 'center' }); };
    wirePrefs(view);

    $('#pf').onsubmit = function (e) {
      e.preventDefault();
      var v = function (k) { return $('#' + k).value.trim(); }, er = {};
      if (!v('pname')) { er.pname = 'Enter your full name.'; }
      if (v('pdob')) { var d = new Date(v('pdob')), age = (Date.now() - d) / (365.25 * D); if (d > new Date()) { er.pdob = 'Date of birth can\u2019t be in the future.'; } else if (age < 18) { er.pdob = 'You must be at least 18.'; } }
      if (v('pcon') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v('pcon')) && !/^\+?[0-9 ()\-]{7,18}$/.test(v('pcon'))) { er.pcon = 'Enter a valid email address or phone number.'; }
      if (!v('pco')) { er.pco = 'Enter your company name.'; }
      if (!showErrors(['pname', 'pdob', 'pcon', 'pco'], er)) { return; }
      var n = Object.assign(profile(), { name: v('pname'), dob: v('pdob'), loc: v('ploc'), nat: v('pnat'), edu: v('pedu'), desig: v('pdes'), company: v('pco'), ind: v('pind'), contact: v('pcon'), about: v('pab') });
      store.set('profile', n); toast('Profile saved'); profileView(); R.focusTitle();
    };

    view.querySelectorAll('[data-s]').forEach(function (b) {
      b.onclick = function () {
        var k = b.dataset.s;
        if (k === 'sec') { dialog('Account security', sw('twofa', 'Two-step verification') + '<p class="muted">Last password change: not recorded.</p>', [{ label: 'Done', cls: 'ok' }]); wirePrefs(dlg); }
        else if (k === 'priv') { dialog('Privacy settings', sw('visible', 'Let candidates see my profile') + sw('showCompany', 'Show my company name on job posts'), [{ label: 'Done', cls: 'ok' }]); wirePrefs(dlg); }
        else if (k === 'pw') {
          dialog('Change password', fld('cp', 'Current password', inp('cp', 'password', '', 'autocomplete="current-password"')) + fld('np', 'New password', inp('np', 'password', '', 'autocomplete="new-password"'), 'At least 8 characters.') +
            fld('cf', 'Confirm new password', inp('cf', 'password', '', 'autocomplete="new-password"')), [{ label: 'Cancel' }, { label: 'Update password', cls: 'ok', fn: function () {
              var e2 = {}; if (!$('#cp').value) { e2.cp = 'Enter your current password.'; } if ($('#np').value.length < 8) { e2.np = 'Use at least 8 characters.'; } if ($('#cf').value !== $('#np').value) { e2.cf = 'Passwords don\u2019t match.'; }
              if (!showErrors(['cp', 'np', 'cf'], e2)) { return false; } toast('Password updated');
            } }]);
        } else if (k === 'lang') {
          dialog('Language preferences', fld('lg', 'Language', sel('lg', store.get('lang', 'English'), ['English', 'Hindi', 'Gujarati'], 'Select language')), [{ label: 'Cancel' }, { label: 'Save', cls: 'ok', fn: function () {
            if (!$('#lg').value) { err('lg', 'Choose a language.'); return false; } store.set('lang', $('#lg').value); toast('Language saved');
          } }]);
        } else if (k === 'help') { dialog('Help and support', '<p>Questions? Email <strong>support@example.com</strong> and we\u2019ll reply within one business day.</p>', [{ label: 'Close', cls: 'ok' }]); }
        else if (k === 'terms') { dialog('Terms and conditions', '<p>Replace this text with your terms and conditions.</p>', [{ label: 'Close', cls: 'ok' }]); }
        else if (k === 'policy') { dialog('Privacy policy', '<p>Replace this text with your privacy policy.</p>', [{ label: 'Close', cls: 'ok' }]); }
        else if (k === 'out') { location.href = 'logout.php'; }
        else if (k === 'del') {
          dialog('Delete account?', '<p>This clears your saved profile, jobs, interviews and shortlist on this device. It can\u2019t be undone.</p>', [{ label: 'Keep account' },
            { label: 'Delete account', cls: 'no', fn: function () {
              try { Object.keys(localStorage).filter(function (x) { return x.indexOf('ra.') === 0; }).forEach(function (x) { localStorage.removeItem(x); }); } catch (e) { /* ignore */ }
              location.href = 'logout.php';
            } }]);
        }
      };
    });
  }

  /* ================= Routes ================= */
  R.routes.push(
    [/^#\/post$/, myJobs, 'Post Job', 'post'],
    [/^#\/post\/new$/, function () { jobForm(null); }, 'New job', 'post'],
    [/^#\/post\/edit\/(\d+)$/, jobForm, 'Edit job', 'post'],
    [/^#\/post\/applicants\/(\d+)$/, applicants, 'Applicants', 'post'],
    [/^#\/interview$/, interview, 'Interview', 'interview'],
    [/^#\/profile$/, profileView, 'Profile', 'profile']
  );
  R.start();
})();
