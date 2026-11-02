/* auth.js — shared by login.php and signup.php. No dependencies. */
(function () {
  'use strict';

  /* ---- Show / hide password -------------------------------------------- */
  document.querySelectorAll('[data-toggle-password]').forEach(function (btn) {
    var input = document.getElementById(btn.getAttribute('aria-controls'));
    if (!input) { return; }
    var name = btn.getAttribute('data-name') || 'password';

    btn.hidden = false; // only revealed when JS is running

    btn.addEventListener('click', function () {
      var show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.textContent = show ? 'Hide' : 'Show';
      btn.setAttribute('aria-label', (show ? 'Hide ' : 'Show ') + name);
    });
  });

  /* ---- Client-side validation (forms with data-validate) --------------- */
  var form = document.querySelector('form[data-validate]');
  if (form) {
    var fields = Array.prototype.slice.call(form.querySelectorAll('[data-field]'));

    var errorEl = function (input) {
      return document.getElementById(input.id + '-error');
    };

    var messageFor = function (input) {
      var value = input.value;

      if (input.required && !value.trim()) {
        return input.getAttribute('data-msg-missing');
      }
      if (!value) { return ''; }

      if (input.type === 'email' && input.validity.typeMismatch) {
        return input.getAttribute('data-msg-invalid');
      }
      if (input.type === 'tel') {
        var digits = value.replace(/\D/g, '');
        var okChars = /^\+?[0-9 ()\-.]+$/.test(value.trim());
        if (!okChars || digits.length < 7 || digits.length > 15) {
          return input.getAttribute('data-msg-invalid');
        }
      }
      var min = parseInt(input.getAttribute('data-minlength') || '0', 10);
      if (min && value.length < min) {
        return input.getAttribute('data-msg-short');
      }
      var matchId = input.getAttribute('data-match');
      if (matchId) {
        var other = document.getElementById(matchId);
        if (other && other.value !== value) {
          return input.getAttribute('data-msg-mismatch');
        }
      }
      return '';
    };

    var showError = function (input, message) {
      var el = errorEl(input);
      if (el) {
        el.textContent = message;
        el.hidden = !message;
      }
      input.setAttribute('aria-invalid', message ? 'true' : 'false');
    };

    // Once a field is showing an error, re-check it as the person types
    // so the message clears the moment the problem is fixed.
    form.addEventListener('input', function () {
      fields.forEach(function (input) {
        var el = errorEl(input);
        if (el && !el.hidden) { showError(input, messageFor(input)); }
      });
    });

    form.addEventListener('submit', function (event) {
      var firstInvalid = null;

      fields.forEach(function (input) {
        var message = messageFor(input);
        showError(input, message);
        if (message && !firstInvalid) { firstInvalid = input; }
      });

      if (firstInvalid) {
        event.preventDefault();
        firstInvalid.focus();
      }
    });
  }

  /* ---- Move focus to the first server-side problem ---------------------- */
  var target = document.querySelector('[data-focus-on-load]');
  if (target) { target.focus(); }
})();
