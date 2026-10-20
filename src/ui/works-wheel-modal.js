/**
 * Tactical Works Wheel 3D Mode Navigation Engine
 * Suporte compartilhado para Student OS, Modo Clássico (Edital) e Portal de Início
 */

(function () {
  const TACTICAL_WHEEL_MODES = [
    {
      title: "Student OS • Operacional",
      subtitle: "Dashboard Tático & Produtividade",
      image: "assets/preview_student_os.png",
      href: "student_os.html",
      badge: "SISTEMA OPERACIONAL"
    },
    {
      title: "Modo Clássico • Edital",
      subtitle: "Cronograma Tático & Simulados",
      image: "assets/preview_modo_classico.png",
      href: "concurso_tatico.html",
      badge: "EDITAL POLICIAL"
    },
    {
      title: "Tela de Início • Portal Tático",
      subtitle: "Escultura Líquida & Visão Geral",
      image: "assets/sculpture_dark.webp",
      href: "landing.html",
      badge: "PORTAL GERAL"
    }
  ];

  window.TACTICAL_WHEEL_MODES = TACTICAL_WHEEL_MODES;

  window.worksWheelState = {
    isOpen: false,
    turn: 0,
    target: 0,
    active: 0,
    animFrameId: null,
    dragStart: null,
    settleTimeout: null
  };

  function playBlip(freq, duration) {
    if (typeof playTacticalBlip === 'function') {
      try { playTacticalBlip(freq, duration); } catch (e) {}
    }
  }

  window.openWorksWheelModal = function () {
    const modal = document.getElementById('modalWorksWheel');
    if (!modal) return;
    modal.classList.add('open');
    modal.style.display = 'flex';
    window.worksWheelState.isOpen = true;

    modal.onclick = function (e) {
      if (e.target === modal) {
        window.closeWorksWheelModal();
      }
    };

    playBlip(720, 0.08);
    setTimeout(window.initWorksWheelStage, 60);
  };

  window.closeWorksWheelModal = function () {
    const modal = document.getElementById('modalWorksWheel');
    if (!modal) return;
    modal.classList.remove('open');
    modal.style.display = 'none';
    window.worksWheelState.isOpen = false;
    if (window.worksWheelState.animFrameId) {
      cancelAnimationFrame(window.worksWheelState.animFrameId);
      window.worksWheelState.animFrameId = null;
    }
    playBlip(420, 0.05);
  };

  window.navigateToActiveMode = function () {
    const items = TACTICAL_WHEEL_MODES;
    const activeItem = items[window.worksWheelState.active];
    if (activeItem && activeItem.href) {
      if (activeItem.href.indexOf('student_os') !== -1) {
        localStorage.setItem('preferred_desktop_view', 'student_os');
      } else if (activeItem.href.indexOf('concurso') !== -1 || activeItem.href.indexOf('index') !== -1) {
        localStorage.setItem('preferred_desktop_view', 'concursos');
      } else {
        localStorage.removeItem('preferred_desktop_view');
      }
      playBlip(880, 0.09);
      window.location.href = activeItem.href;
    }
  };

  window.initWorksWheelStage = function () {
    const stage = document.getElementById('worksWheelStage');
    if (!stage) return;

    const items = TACTICAL_WHEEL_MODES;
    const count = items.length;
    const last = Math.max(count - 1, 0);

    stage.innerHTML = (
      '<div id="worksWheelInteractionArea" tabindex="0" role="listbox" aria-label="Navegador de Modos 3D" class="works-wheel-stage">' +
        '<div id="worksWheelDrum" class="works-wheel-drum"></div>' +
      '</div>' +
      '<div id="worksWheelCenterLabel" class="works-wheel-center-label">MODOS \'26</div>' +
      '<div id="worksWheelActiveTitle" class="works-wheel-active-title"></div>' +
      '<ol id="worksWheelIndexList" class="works-wheel-index"></ol>'
    );

    const drum = document.getElementById('worksWheelDrum');
    const indexList = document.getElementById('worksWheelIndexList');
    const activeTitle = document.getElementById('worksWheelActiveTitle');
    const centerLabel = document.getElementById('worksWheelCenterLabel');
    const interactiveArea = document.getElementById('worksWheelInteractionArea');

    drum.innerHTML = items.map((item, i) => (
      '<div id="worksWheelCard_' + i + '" class="works-wheel-card" role="button" tabindex="0" onclick="window.handleWorksWheelCardClick(' + i + ', event)">' +
        '<span class="works-wheel-card-inner">' +
          '<img src="' + item.image + '" alt="' + item.title + '" draggable="false">' +
          '<span class="works-wheel-action-badge">' +
            '<svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 9 9 3M4 3h5v5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
            'Acessar Modo' +
          '</span>' +
        '</span>' +
      '</div>'
    )).join('');

    indexList.innerHTML = items.map((item, i) => (
      '<li>' +
        '<button type="button" class="works-wheel-index-btn ' + (i === window.worksWheelState.active ? 'active' : '') + '" id="worksWheelIdxBtn_' + i + '" onclick="window.setWorksWheelTarget(' + (i + 1) + ')">' +
          item.title +
        '</button>' +
      '</li>'
    )).join('');

    const CARD_H = 0.38;
    const CARD_MAX_W = 0.34;
    const CARD_RATIO = 1.45;
    const STEP = 40;
    const DRUM = 2.22;
    const LENS = 2.7;
    const RING_R = 1.14;
    const BOW = 1.82;
    const TITLE = 0.124;
    const INDEX = 0.04;
    const CULL = 1.6;
    const WHEEL_UNITS = 900;
    const DRAG_UNITS = 420;
    const SETTLE = 140;
    const EASE = 0.12;

    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
    const lerp = (a, b, t) => a + (b - a) * t;
    const rad = (deg) => (deg * Math.PI) / 180;
    const bowAt = (drumDeg, bow) => -bow * (1 - Math.cos(rad(drumDeg)));

    function place(ringDeg, drumDeg, ringR, drumR, bow, m) {
      return (
        'translateX(' + (m * bowAt(drumDeg, bow)) + 'px) ' +
        'rotateZ(' + ((1 - m) * ringDeg) + 'deg) translateY(' + (-(1 - m) * ringR) + 'px) ' +
        'rotateX(' + (m * drumDeg) + 'deg) translateZ(' + (m * drumR) + 'px)'
      );
    }

    function getMetrics() {
      const w = stage.clientWidth || 800;
      const h = stage.clientHeight || 560;
      const cardW = Math.min(h * CARD_H * CARD_RATIO, w * CARD_MAX_W);
      const cardH = cardW / CARD_RATIO;
      const drumR = cardH * DRUM;
      const ringR = cardH * RING_R;
      const ringScale = count ? clamp((((2 * Math.PI * ringR) / count) * 0.82) / (cardW || 1), 0.16, 1) : 1;

      return {
        cardW, cardH, ringR, ringScale, drumR,
        bow: cardH * BOW,
        depth: cardH * LENS,
        title: cardH * TITLE,
        index: cardH * INDEX
      };
    }

    let mtr = getMetrics();
    interactiveArea.style.perspective = mtr.depth + 'px';
    centerLabel.style.fontSize = mtr.title + 'px';
    activeTitle.style.fontSize = mtr.title + 'px';
    indexList.style.fontSize = mtr.index + 'px';

    const cardEls = items.map((_, i) => document.getElementById('worksWheelCard_' + i));
    cardEls.forEach(card => {
      if (card) {
        card.style.width = mtr.cardW + 'px';
        card.style.height = mtr.cardH + 'px';
        card.style.marginLeft = (-mtr.cardW / 2) + 'px';
        card.style.marginTop = (-mtr.cardH / 2) + 'px';
      }
    });

    window.setWorksWheelTarget = function (next) {
      window.worksWheelState.target = clamp(next, 0, last + 1);
      playBlip(560, 0.03);
    };

    let pointerMoved = 0;
    let startY = 0;
    let startX = 0;

    window.handleWorksWheelCardClick = function (index, e) {
      if (pointerMoved > 8) return;
      const targetTurn = index + 1;
      if (window.worksWheelState.active === index || Math.abs(window.worksWheelState.target - targetTurn) < 0.2) {
        window.navigateToActiveMode();
      } else {
        window.setWorksWheelTarget(targetTurn);
      }
    };

    interactiveArea.onwheel = function (e) {
      const next = window.worksWheelState.target + (e.deltaY / WHEEL_UNITS);
      if (next > 0 && next < last + 1) e.preventDefault();
      window.worksWheelState.target = clamp(next, 0, last + 1);

      clearTimeout(window.worksWheelState.settleTimeout);
      window.worksWheelState.settleTimeout = setTimeout(() => {
        window.worksWheelState.target = clamp(Math.round(window.worksWheelState.target), 0, last + 1);
      }, SETTLE);
    };

    interactiveArea.onpointerdown = function (e) {
      window.worksWheelState.dragStart = e.clientY;
      startY = e.clientY;
      startX = e.clientX;
      pointerMoved = 0;
    };

    interactiveArea.onpointermove = function (e) {
      if (window.worksWheelState.dragStart === null) return;
      const dy = window.worksWheelState.dragStart - e.clientY;
      pointerMoved += Math.abs(dy) + Math.abs(startX - e.clientX);
      if (pointerMoved > 6 && !interactiveArea.hasPointerCapture(e.pointerId)) {
        try { interactiveArea.setPointerCapture(e.pointerId); } catch (err) {}
      }
      const delta = dy / DRAG_UNITS;
      window.worksWheelState.target = clamp(window.worksWheelState.target + delta, 0, last + 1);
      window.worksWheelState.dragStart = e.clientY;
      startX = e.clientX;
    };

    interactiveArea.onpointerup = function (e) {
      if (interactiveArea.hasPointerCapture && interactiveArea.hasPointerCapture(e.pointerId)) {
        try { interactiveArea.releasePointerCapture(e.pointerId); } catch (err) {}
      }
      window.worksWheelState.dragStart = null;
      if (window.worksWheelState.target > 1) {
        window.worksWheelState.target = clamp(Math.round(window.worksWheelState.target), 0, last + 1);
      }
    };

    interactiveArea.onkeydown = function (e) {
      if (e.key === 'ArrowDown') {
        window.worksWheelState.target = clamp(Math.round(window.worksWheelState.target) + 1, 0, last + 1);
        e.preventDefault();
      } else if (e.key === 'ArrowUp') {
        window.worksWheelState.target = clamp(Math.round(window.worksWheelState.target) - 1, 0, last + 1);
        e.preventDefault();
      } else if (e.key === 'Escape') {
        window.closeWorksWheelModal();
        e.preventDefault();
      } else if (e.key === 'Enter') {
        window.navigateToActiveMode();
        e.preventDefault();
      }
    };

    function updateActiveDisplay(index) {
      if (activeTitle && items[index]) {
        activeTitle.innerText = items[index].title;
      }
      const activeTag = document.getElementById('worksWheelActiveTag');
      if (activeTag && items[index]) {
        activeTag.innerText = items[index].title;
      }
      items.forEach((_, i) => {
        const btn = document.getElementById('worksWheelIdxBtn_' + i);
        if (btn) {
          if (i === index) btn.classList.add('active');
          else btn.classList.remove('active');
        }
      });
    }

    function drawFrame() {
      if (!window.worksWheelState.isOpen) return;

      const gap = window.worksWheelState.target - window.worksWheelState.turn;
      if (Math.abs(gap) < 0.0005) {
        window.worksWheelState.turn = window.worksWheelState.target;
      } else {
        window.worksWheelState.turn += gap * EASE;
      }

      const t = window.worksWheelState.turn;
      const m = clamp(t, 0, 1);
      const pos = Math.max(0, t - 1);

      if (drum) {
        drum.style.transform = 'translateZ(' + (-m * mtr.drumR) + 'px)';
      }

      for (let i = 0; i < count; i++) {
        const d = i - pos;
        const drumDeg = d * STEP;
        const card = cardEls[i];
        if (card) {
          card.style.transform = place(d * (360 / count), drumDeg, mtr.ringR, mtr.drumR, mtr.bow, m);
          card.style.opacity = (m > 0.5 && Math.abs(d) > CULL) ? '0' : '1';
          card.style.zIndex = String(Math.round(100 - Math.abs(d) * 2));
          const inner = card.querySelector('.works-wheel-card-inner');
          if (inner) {
            inner.style.transform = 'scale(' + lerp(mtr.ringScale, 1, m) + ')';
          }
        }
      }

      if (centerLabel) centerLabel.style.opacity = String(1 - m);
      if (activeTitle) activeTitle.style.opacity = String(m);

      const near = clamp(Math.round(pos), 0, last);
      if (window.worksWheelState.active !== near) {
        window.worksWheelState.active = near;
        updateActiveDisplay(near);
      }

      window.worksWheelState.animFrameId = requestAnimationFrame(drawFrame);
    }

    updateActiveDisplay(window.worksWheelState.active);
    window.worksWheelState.animFrameId = requestAnimationFrame(drawFrame);
    try { interactiveArea.focus(); } catch (err) {}
  };
})();
