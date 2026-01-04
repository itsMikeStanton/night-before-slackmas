// app.js
window.addEventListener("DOMContentLoaded", () => {
  const PAGES = [
    { img: "assets/pages/coverflip.jpg", audio: "assets/audio/empty.mp3" },
    { img: "assets/pages/intro.jpg", audio: "assets/audio/slackmas0.mp3" },
    { img: "assets/pages/slackmas1.jpg", audio: "assets/audio/slackmas1.mp3" },
    { img: "assets/pages/slackmas2.jpg", audio: "assets/audio/slackmas2.mp3" },
    { img: "assets/pages/slackmas3.jpg", audio: "assets/audio/slackmas3.mp3" },
    { img: "assets/pages/slackmas4.jpg", audio: "assets/audio/slackmas4.mp3" },
    { img: "assets/pages/slackmas5.jpg", audio: "assets/audio/slackmas5.mp3" },
    { img: "assets/pages/slackmas6.jpg", audio: "assets/audio/slackmas6.mp3" },
    { img: "assets/pages/slackmas7.jpg", audio: "assets/audio/slackmas7.mp3" },
    { img: "assets/pages/slackmas8.jpg", audio: "assets/audio/slackmas8.mp3" },
    { img: "assets/pages/slackmas9.jpg",  audio: "assets/audio/empty.mp3" },
    { img: "assets/pages/slackmas10.jpg", audio: "assets/audio/empty.mp3" },
    { img: "assets/pages/slackmas11.jpg", audio: "assets/audio/empty.mp3" },
    { img: "assets/pages/slackmas12.jpg", audio: "assets/audio/slackmas12.mp3" },
    { img: "assets/pages/slackmas13.jpg", audio: "assets/audio/slackmas13.mp3" },
    { img: "assets/pages/slackmas14.jpg", audio: "assets/audio/slackmas14.mp3" },
    { img: "assets/pages/slackmas15.jpg", audio: "assets/audio/slackmas15.mp3" },
    { img: "assets/pages/slackmas16.jpg", audio: "assets/audio/slackmas16.mp3" },
    { img: "assets/pages/theend.jpg",     audio: "assets/audio/slackmas17.mp3" }
  ];

  const wrapEl = document.getElementById("bookWrap");
  const bookEl = document.getElementById("book");

  // Build pages
  bookEl.innerHTML = "";
  for (const p of PAGES) {
    const page = document.createElement("div");
    page.className = "page";
    const img = document.createElement("img");
    img.src = p.img;
    img.alt = "Page";
    page.appendChild(img);
    bookEl.appendChild(page);
  }

  // ----------------------------
  // AUDIO: VO + background + SFX
  // ----------------------------

  // Voiceover per page
  const vo = new Audio();
  vo.preload = "auto";

  // Background music (starts ONLY on first flip, loops)
  const bgMusic = new Audio("assets/audio/silent.mp3");
  bgMusic.loop = true;
  bgMusic.volume = 0.5;
  bgMusic.preload = "auto";
  let bgMusicStarted = false;

  // Page flip SFX
  const flipSfx = new Audio("assets/audio/pageflip.mp3");
  flipSfx.preload = "auto";
  flipSfx.volume = 0.6;

  function playFlipSfx() {
    try {
      flipSfx.pause();
      flipSfx.currentTime = 0;
      flipSfx.play().catch(() => {});
    } catch (_) {}
  }

  // iOS audio unlock (one-time)
  let audioUnlocked = false;
  function unlockAudio() {
    if (audioUnlocked) return;

    // attempt a tiny play/pause on BOTH channels so iOS "unlocks" them
    const tryUnlock = (a) =>
      a.play().then(() => {
        a.pause();
        a.currentTime = 0;
      }).catch(() => {});

    Promise.all([tryUnlock(bgMusic), tryUnlock(flipSfx), tryUnlock(vo)])
      .finally(() => { audioUnlocked = true; });
  }

  ["touchstart", "click"].forEach((evt) => {
    window.addEventListener(evt, unlockAudio, { once: true, passive: true });
  });

  // VO delay
  let voDelayTimer = null;

  function stopVO() {
    if (voDelayTimer) {
      clearTimeout(voDelayTimer);
      voDelayTimer = null;
    }
    vo.pause();
    vo.currentTime = 0;
  }

  function playVOFor(index) {
    // Cancel any pending delayed VO
    if (voDelayTimer) {
      clearTimeout(voDelayTimer);
      voDelayTimer = null;
    }

    stopVO();

    const src = PAGES[index]?.audio;
    if (!src) return;

    voDelayTimer = setTimeout(() => {
      vo.src = src;
      vo.play().catch(() => {});
      voDelayTimer = null;
    }, 1200); // your desired delay
  }

  // ---- PageFlip init / rebuild ----
  let currentIndex = 0;
  let pageFlip = null;

  let lastW = 0;
  let lastH = 0;
  let resizeTimer = null;
  let isRebuilding = false;

  function measureTargetSize() {
    // iOS: visualViewport changes as address bar shows/hides
    const vv = window.visualViewport;
    const vw = Math.floor(vv?.width ?? window.innerWidth);
    const vh = Math.floor(vv?.height ?? window.innerHeight);

    // breathing room (also helps iOS zoom quirks)
    const pad = 12;
    const maxW = vw - pad * 2;
    const maxH = vh - pad * 2;

    // target portrait 2:3
    const w = Math.min(maxW, Math.floor(maxH * (2 / 3)));
    const h = Math.floor(w * (3 / 2));

    return { w, h };
  }

  function buildFlip({ w, h }, startIndex) {
    // Lock wrapper size in px so iOS can't "helpfully" scale
    wrapEl.style.width = `${w}px`;
    wrapEl.style.height = `${h}px`;

    if (pageFlip) {
      try { pageFlip.destroy(); } catch (_) {}
      pageFlip = null;
    }

    pageFlip = new window.St.PageFlip(bookEl, {
      width: 1024,
      height: 1536,

      size: "stretch",
      minWidth: w,
      maxWidth: w,
      minHeight: h,
      maxHeight: h,

      usePortrait: true,
      showCover: false,
      autoSize: true,

      maxShadowOpacity: 0.25,
      useMouseEvents: true,
      mobileScrollSupport: false,
      flippingTime: 700,
    });

    pageFlip.loadFromHTML(bookEl.querySelectorAll(".page"));

    pageFlip.on("flip", (e) => {
      // SFX immediately
      playFlipSfx();

      // page index
      currentIndex = e.data;

      // bg music: first flip only (and not on cover index 0)
      if (!bgMusicStarted && currentIndex >= 1) {
        bgMusic.play().catch(() => {});
        bgMusicStarted = true;
      }

      // VO (delayed)
      playVOFor(currentIndex);
    });

    // Restore page without animating
    currentIndex = Math.max(0, Math.min(PAGES.length - 1, startIndex ?? 0));
    pageFlip.turnToPage(currentIndex);
  }

  function initFlip() {
    if (!wrapEl || !bookEl || !window.St?.PageFlip) return;
    const { w, h } = measureTargetSize();
    lastW = w;
    lastH = h;
    buildFlip({ w, h }, currentIndex);
  }

  function maybeRebuildAfterResize() {
    if (!pageFlip || isRebuilding) return;

    const { w, h } = measureTargetSize();
    const dw = Math.abs(w - lastW);
    const dh = Math.abs(h - lastH);
    if (dw < 6 && dh < 6) return;

    isRebuilding = true;
    const keepIndex = currentIndex;

    requestAnimationFrame(() => {
      lastW = w;
      lastH = h;
      buildFlip({ w, h }, keepIndex);
      isRebuilding = false;
    });
  }

  initFlip();

  // Debounced rebuild on window resize
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(maybeRebuildAfterResize, 150);
  });

  // iOS address bar / toolbar resize fix
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(maybeRebuildAfterResize, 80);
    });
  }

  // Optional: keyboard nav
  window.addEventListener("keydown", (e) => {
    if (!pageFlip) return;
    if (e.key === "ArrowRight") pageFlip.flipNext();
    if (e.key === "ArrowLeft") pageFlip.flipPrev();
  });
});
