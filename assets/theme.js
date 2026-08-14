/* Mr. Sniff's theme JS
   Hamburger nav, editorial accordions, hero parallax, AJAX cart drawer,
   and the Smell Test quiz. Everything binds via event delegation so
   section-rendered HTML swaps never need re-binding. */
(function () {
  'use strict';

  var root = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------
     Hamburger nav
  ------------------------------------------------------------------ */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-menu-toggle]');
    if (!btn) return;
    var menu = document.querySelector('[data-menu]');
    if (!menu) return;
    var open = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', open ? 'false' : 'true');
    btn.setAttribute('aria-label', open ? 'Open menu' : 'Close menu');
    menu.hidden = open;
  });

  /* ------------------------------------------------------------------
     Editorial accordions (homepage rows, FAQ)
  ------------------------------------------------------------------ */
  document.addEventListener('click', function (e) {
    var row = e.target.closest('[data-accordion-row]');
    if (!row) return;
    var panel = document.getElementById(row.getAttribute('aria-controls'));
    if (!panel) return;
    var open = row.getAttribute('aria-expanded') === 'true';
    row.setAttribute('aria-expanded', open ? 'false' : 'true');
    panel.classList.toggle('is-open', !open);
  });

  /* ------------------------------------------------------------------
     Hero parallax — sets --parallax on [data-parallax]
  ------------------------------------------------------------------ */
  function initParallax() {
    var el = document.querySelector('[data-parallax]');
    if (!el || reducedMotion) return;
    var speed = parseFloat(el.getAttribute('data-parallax')) || 0.35;
    var raf = 0;
    function onScroll() {
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0;
        el.style.setProperty('--parallax', window.scrollY * speed + 'px');
      });
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ------------------------------------------------------------------
     Cart drawer
  ------------------------------------------------------------------ */
  function drawer() { return document.querySelector('[data-cart-drawer]'); }
  function backdrop() { return document.querySelector('[data-cart-backdrop]'); }

  function setCartOpen(open) {
    var d = drawer();
    var b = backdrop();
    if (!d) return;
    d.classList.toggle('is-open', open);
    d.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (b) b.classList.toggle('is-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  }

  function updateCartCount(count) {
    document.querySelectorAll('[data-cart-count]').forEach(function (el) {
      el.textContent = count > 0 ? count : '';
    });
  }

  function refreshCartDrawer() {
    return fetch(root + '?sections=cart-drawer')
      .then(function (r) { return r.json(); })
      .then(function (sections) {
        var html = sections['cart-drawer'];
        if (!html) return;
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var fresh = doc.querySelector('[data-cart-drawer-content]');
        var current = document.querySelector('[data-cart-drawer-content]');
        if (fresh && current) current.innerHTML = fresh.innerHTML;
        var count = doc.querySelector('[data-cart-drawer]');
        if (count) updateCartCount(parseInt(count.getAttribute('data-item-count'), 10) || 0);
      })
      .catch(function () {});
  }

  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-cart-open]')) {
      e.preventDefault();
      // close the mobile menu if it's open
      var menuBtn = document.querySelector('[data-menu-toggle][aria-expanded="true"]');
      if (menuBtn) menuBtn.click();
      setCartOpen(true);
      return;
    }
    if (e.target.closest('[data-cart-close]') || e.target.closest('[data-cart-backdrop]')) {
      setCartOpen(false);
      return;
    }
    var removeBtn = e.target.closest('[data-cart-remove]');
    if (removeBtn) {
      e.preventDefault();
      removeBtn.disabled = true;
      fetch(root + 'cart/change.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: removeBtn.getAttribute('data-cart-remove'), quantity: 0 })
      })
        .then(function (r) { return r.json(); })
        .then(function (cart) { updateCartCount(cart.item_count); })
        .then(refreshCartDrawer);
      return;
    }
    var upsellBtn = e.target.closest('[data-cart-upsell]');
    if (upsellBtn) {
      e.preventDefault();
      upsellBtn.disabled = true;
      addToCart(upsellBtn.getAttribute('data-cart-upsell'), 1);
      return;
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setCartOpen(false);
  });

  function addToCart(variantId, quantity) {
    return fetch(root + 'cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: parseInt(variantId, 10), quantity: quantity || 1 })
    })
      .then(function (r) {
        if (!r.ok) throw new Error('add failed');
        return fetch(root + 'cart.js');
      })
      .then(function (r) { return r.json(); })
      .then(function (cart) { updateCartCount(cart.item_count); })
      .then(refreshCartDrawer)
      .then(function () { setCartOpen(true); });
  }

  // Product form: intercept and add via AJAX
  document.addEventListener('submit', function (e) {
    var form = e.target.closest('form.product-form, form[action*="/cart/add"]');
    if (!form) return;
    e.preventDefault();
    var btn = form.querySelector('[type="submit"]');
    var idInput = form.querySelector('[name="id"]');
    if (!idInput) return;
    if (btn) btn.disabled = true;
    addToCart(idInput.value, 1).finally(function () {
      if (btn) btn.disabled = false;
    });
  });

  /* ------------------------------------------------------------------
     Smell Test quiz
  ------------------------------------------------------------------ */
  function initSmellTest() {
    var host = document.querySelector('[data-smell-test]');
    if (!host) return;
    var dataEl = host.querySelector('[data-smell-test-config]');
    if (!dataEl) return;
    var config;
    try { config = JSON.parse(dataEl.textContent); } catch (err) { return; }
    var questions = config.questions || [];
    var scents = config.scents || {}; // keyed 'a' / 'b'
    if (!questions.length) return;

    var state = { step: 0, tally: { a: 0, b: 0 }, last: null };

    function el(tag, className, text) {
      var node = document.createElement(tag);
      if (className) node.className = className;
      if (text != null) node.textContent = text;
      return node;
    }

    function renderQuestion() {
      var q = questions[state.step];
      host.innerHTML = '';
      var quiz = el('div', 'smell-quiz');

      var head = el('header', 'smell-quiz__head');
      var progress = el('p', 'smell-quiz__progress');
      progress.appendChild(el('span', 'smell-quiz__progress-label', config.label || 'The Smell Test'));
      progress.appendChild(el('span', 'smell-quiz__progress-count', 'Q' + (state.step + 1) + ' / ' + questions.length));
      head.appendChild(progress);
      var track = el('div', 'smell-quiz__track');
      track.setAttribute('aria-hidden', 'true');
      var fill = el('span', 'smell-quiz__track-fill');
      fill.style.transform = 'scaleX(' + state.step / questions.length + ')';
      track.appendChild(fill);
      head.appendChild(track);
      quiz.appendChild(head);

      var stepWrap = el('div', 'smell-quiz__step');
      stepWrap.appendChild(el('h2', 'smell-quiz__prompt', q.prompt));
      var answers = el('div', 'smell-quiz__answers');
      [['a', q.answer_a, 'A/'], ['b', q.answer_b, 'B/']].forEach(function (entry) {
        var btn = el('button', 'smell-quiz__answer');
        btn.type = 'button';
        btn.appendChild(el('span', 'smell-quiz__key', entry[2]));
        btn.appendChild(el('span', 'smell-quiz__answer-label', entry[1]));
        var arrow = el('span', 'smell-quiz__arrow', '→');
        arrow.setAttribute('aria-hidden', 'true');
        btn.appendChild(arrow);
        btn.addEventListener('click', function () { pick(entry[0]); });
        answers.appendChild(btn);
      });
      stepWrap.appendChild(answers);
      quiz.appendChild(stepWrap);
      host.appendChild(quiz);
    }

    function renderResult() {
      var winnerKey =
        state.tally.a > state.tally.b ? 'a' :
        state.tally.b > state.tally.a ? 'b' :
        (state.last || 'a');
      var scent = scents[winnerKey] || {};
      host.innerHTML = '';
      var result = el('div', 'smell-result');
      result.appendChild(el('p', 'smell-result__kicker', 'Your Whiff Match Is'));
      var tag = el('span', 'flavor-tag flavor-tag--solid flavor-tag--lg smell-result__tag', scent.title || '…');
      if (scent.color) tag.style.setProperty('--tag-color', scent.color);
      result.appendChild(tag);
      if (scent.notes) result.appendChild(el('p', 'smell-result__notes', scent.notes));
      var actions = el('div', 'smell-result__actions');
      if (scent.url) {
        var cta = el('a', 'smell-result__cta', 'Meet ' + (scent.title || 'It'));
        cta.href = scent.url;
        actions.appendChild(cta);
      }
      var restart = el('button', 'smell-result__restart', 'Take It Again');
      restart.type = 'button';
      restart.addEventListener('click', function () {
        state.step = 0;
        state.tally = { a: 0, b: 0 };
        state.last = null;
        renderQuestion();
      });
      actions.appendChild(restart);
      result.appendChild(actions);
      host.appendChild(result);
    }

    function pick(key) {
      state.tally[key] += 1;
      state.last = key;
      state.step += 1;
      if (state.step >= questions.length) renderResult();
      else renderQuestion();
    }

    renderQuestion();
  }

  /* ------------------------------------------------------------------
     Boot
  ------------------------------------------------------------------ */
  function init() {
    initParallax();
    initSmellTest();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
