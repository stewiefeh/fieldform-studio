/* ==========================================================================
   FIELDFORM STUDIO
   main.js
   One dependency-free script. Each feature is a small module that checks
   its own preconditions, so pages can opt in by adding the right hooks.
   ========================================================================== */

(function () {
  "use strict";

  var doc = document;
  var root = doc.documentElement;
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

  /* ----------------------------------------------------------------------
     1. THEME
     Persists the choice, falls back to the system preference on first visit,
     and flips before paint via the inline snippet in <head>.
     ---------------------------------------------------------------------- */
  var Theme = {
    key: "fieldform-theme",
    get: function () {
      var saved = null;
      try { saved = localStorage.getItem(this.key); } catch (e) { /* storage can be blocked */ }
      if (saved === "dark" || saved === "light") return saved;
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    },
    set: function (mode) {
      root.setAttribute("data-theme", mode);
      try { localStorage.setItem(this.key, mode); } catch (e) { /* ignore */ }
      this.sync();
    },
    toggle: function () {
      this.set(root.getAttribute("data-theme") === "dark" ? "light" : "dark");
    },
    sync: function () {
      var buttons = doc.querySelectorAll(".theme-toggle");
      var dark = root.getAttribute("data-theme") === "dark";
      buttons.forEach(function (btn) {
        btn.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
        btn.setAttribute("aria-pressed", String(dark));
      });
    }
  };

  doc.querySelectorAll(".theme-toggle").forEach(function (btn) {
    btn.addEventListener("click", function () { Theme.toggle(); });
  });
  Theme.sync();

  /* Follow the OS when the user has not made their own choice yet. */
  try {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function (e) {
      if (!localStorage.getItem(Theme.key)) {
        root.setAttribute("data-theme", e.matches ? "dark" : "light");
        Theme.sync();
      }
    });
  } catch (e) { /* older browsers */ }

  /* ----------------------------------------------------------------------
     2. HEADER
     Sticky state + scroll progress bar.
     ---------------------------------------------------------------------- */
  var header = doc.querySelector(".site-head");
  var progressBar = doc.querySelector(".progress-bar span");

  function onScroll() {
    var y = window.scrollY;
    if (header) header.classList.toggle("is-stuck", y > 12);

    if (progressBar) {
      var max = doc.documentElement.scrollHeight - window.innerHeight;
      var p = max > 0 ? Math.min(y / max, 1) : 0;
      progressBar.style.transform = "scaleX(" + p + ")";
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ----------------------------------------------------------------------
     3. MOBILE NAV
     ---------------------------------------------------------------------- */
  var burger = doc.querySelector(".burger");
  var nav = doc.querySelector("#site-nav");

  if (burger && nav) {
    burger.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      burger.setAttribute("aria-expanded", String(open));
      burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });

    /* close after picking a destination, and on Escape */
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        nav.classList.remove("open");
        burger.setAttribute("aria-expanded", "false");
      }
    });
    doc.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("open")) {
        nav.classList.remove("open");
        burger.setAttribute("aria-expanded", "false");
        burger.focus();
      }
    });
  }

  /* ----------------------------------------------------------------------
     4. ENTRANCE REVEALS
     IntersectionObserver staggers children inside a [data-reveal-group].
     ---------------------------------------------------------------------- */
  var revealEls = doc.querySelectorAll("[data-reveal]");

  if ("IntersectionObserver" in window && !reducedMotion.matches) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });

    /* auto-stagger: siblings sharing one group get incremental delays */
    doc.querySelectorAll("[data-reveal-group]").forEach(function (group) {
      var kids = group.querySelectorAll("[data-reveal]");
      kids.forEach(function (el, i) {
        if (!el.style.getPropertyValue("--d")) {
          el.style.setProperty("--d", (i % 8) * 90 + "ms");
        }
      });
    });

    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ----------------------------------------------------------------------
     5. ANIMATED COUNTERS
     <span data-count="87" data-suffix="+"> runs once when visible.
     ---------------------------------------------------------------------- */
  function animateCount(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var suffix = el.getAttribute("data-suffix") || "";
    var dur = 1400;
    var start = null;

    if (reducedMotion.matches) {
      el.textContent = Math.round(target) + suffix;
      return;
    }

    function tick(ts) {
      if (start === null) start = ts;
      var t = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - t, 4); /* easeOutQuart */
      el.textContent = Math.round(target * eased) + suffix;
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  var counters = doc.querySelectorAll("[data-count]");
  if (counters.length && "IntersectionObserver" in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        animateCount(entry.target);
        cio.unobserve(entry.target);
      });
    }, { threshold: 0.5 });
    counters.forEach(function (el) { cio.observe(el); });
  } else {
    counters.forEach(function (el) {
      el.textContent = Math.round(parseFloat(el.getAttribute("data-count"))) + (el.getAttribute("data-suffix") || "");
    });
  }

  /* ----------------------------------------------------------------------
     6. MARQUEE
     Duplicate the track so the CSS loop can wrap seamlessly.
     ---------------------------------------------------------------------- */
  doc.querySelectorAll(".marquee").forEach(function (m) {
    var track = m.querySelector(".marquee-track");
    if (!track || reducedMotion.matches) return;
    var clone = track.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    m.appendChild(clone);
  });

  /* ----------------------------------------------------------------------
     7. PROJECT FILTERS
     Buttons with [data-filter] drive cards with [data-cat]. "all" is home.
     ---------------------------------------------------------------------- */
  var filterBar = doc.querySelector(".filter-bar");
  if (filterBar) {
    var cards = doc.querySelectorAll(".work-card");
    var emptyNote = doc.querySelector(".empty-note");

    filterBar.addEventListener("click", function (e) {
      var btn = e.target.closest(".filter-btn");
      if (!btn) return;

      filterBar.querySelectorAll(".filter-btn").forEach(function (b) {
        b.setAttribute("aria-pressed", String(b === btn));
      });

      var cat = btn.getAttribute("data-filter");
      var shown = 0;

      cards.forEach(function (card) {
        var match = cat === "all" || (card.getAttribute("data-cat") || "").split(" ").indexOf(cat) !== -1;
        card.classList.toggle("hide", !match);
        if (match) {
          shown++;
          /* retrigger the entrance so refiltering feels alive */
          card.classList.remove("is-in");
          void card.offsetWidth; /* reflow to restart the transition */
          card.classList.add("is-in");
        }
      });

      if (emptyNote) emptyNote.classList.toggle("show", shown === 0);
    });
  }

  /* ----------------------------------------------------------------------
     8. ACCORDION
     One open at a time; the answer height animates through grid rows.
     ---------------------------------------------------------------------- */
  doc.querySelectorAll(".acc").forEach(function (acc) {
    acc.addEventListener("click", function (e) {
      var q = e.target.closest(".acc-q");
      if (!q) return;
      var item = q.parentElement;
      var willOpen = !item.classList.contains("open");

      acc.querySelectorAll(".acc-item.open").forEach(function (other) {
        other.classList.remove("open");
        other.querySelector(".acc-q").setAttribute("aria-expanded", "false");
      });

      item.classList.toggle("open", willOpen);
      q.setAttribute("aria-expanded", String(willOpen));
    });
  });

  /* ----------------------------------------------------------------------
     9. FORMS
     Client-side validation with inline errors and a toast confirmation.
     The contact form has no backend: it composes a mailto fallback.
     ---------------------------------------------------------------------- */
  function showToast(msg) {
    var toast = doc.querySelector(".toast");
    if (!toast) {
      toast = doc.createElement("div");
      toast.className = "toast";
      toast.setAttribute("role", "status");
      doc.body.appendChild(toast);
    }
    toast.textContent = msg;
    /* force reflow so the transition restarts if it is already visible */
    void toast.offsetWidth;
    toast.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { toast.classList.remove("show"); }, 3800);
  }

  function validateField(field) {
    var input = field.querySelector("input, textarea, select");
    if (!input) return true;
    var ok = input.checkValidity();
    field.classList.toggle("invalid", !ok && input.value.trim() !== "");
    field.classList.toggle("valid", ok && input.value.trim() !== "");
    return ok;
  }

  doc.querySelectorAll("form[data-validate]").forEach(function (form) {
    form.setAttribute("novalidate", "");

    form.querySelectorAll(".field").forEach(function (field) {
      var input = field.querySelector("input, textarea, select");
      if (!input) return;
      input.addEventListener("blur", function () { validateField(field); });
      input.addEventListener("input", function () {
        if (field.classList.contains("invalid")) validateField(field);
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var allValid = true;
      var firstBad = null;
      form.querySelectorAll(".field").forEach(function (field) {
        var ok = validateField(field);
        var input = field.querySelector("input, textarea, select");
        var required = input && input.hasAttribute("required");
        if (required && !ok && !firstBad) firstBad = field;
        if (required && !ok) allValid = false;
        if (required) {
          /* untouched required fields count as invalid too */
          if (input.value.trim() === "") {
            field.classList.add("invalid");
            allValid = false;
            if (!firstBad) firstBad = field;
          }
        }
      });

      if (!allValid) {
        if (firstBad) firstBad.querySelector("input, textarea, select").focus();
        showToast("Check the highlighted fields.");
        return;
      }

      var name = form.querySelector('[name="name"]');
      var email = form.querySelector('[name="email"]');
      var msg = form.querySelector('[name="message"]');
      var subject = form.getAttribute("data-subject") || "New enquiry";
      var mailto = "mailto:studio@fieldform.studio"
        + "?subject=" + encodeURIComponent(subject)
        + "&body=" + encodeURIComponent(
            (name ? name.value + "\n\n" : "")
            + (msg ? msg.value + "\n\n" : "")
            + "Reply to: " + (email ? email.value : "")
          );

      form.reset();
      form.querySelectorAll(".field").forEach(function (f) { f.classList.remove("valid", "invalid"); });
      showToast("Opening your mail app to send it.");
      window.location.href = mailto;
    });
  });

  /* newsletter chips off a lighter flow */
  doc.querySelectorAll("form[data-newsletter]").forEach(function (form) {
    form.setAttribute("novalidate", "");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var input = form.querySelector('input[type="email"]');
      if (!input || input.checkValidity() === false) {
        showToast("That email does not look right yet.");
        if (input) input.focus();
        return;
      }
      input.value = "";
      showToast("You are on the list. One letter a month.");
    });
  });

  /* ----------------------------------------------------------------------
     10. GALLERY LIGHTBOX (project detail pages)
     ---------------------------------------------------------------------- */
  var gallery = doc.querySelector(".gallery");
  if (gallery) {
    var lb = doc.createElement("div");
    lb.className = "lightbox";
    lb.setAttribute("role", "dialog");
    lb.setAttribute("aria-modal", "true");
    lb.setAttribute("aria-label", "Image preview");
    lb.innerHTML =
      '<button class="icon-btn lightbox-close" aria-label="Close preview">' +
      '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">' +
      '<path d="M3 3l10 10M13 3L3 13"/></svg></button><img alt="">';
    doc.body.appendChild(lb);

    var lbImg = lb.querySelector("img");
    var closeBtn = lb.querySelector(".lightbox-close");
    var lastFocus = null;

    function openLightbox(src, alt) {
      lastFocus = doc.activeElement;
      lbImg.src = src;
      lbImg.alt = alt || "";
      lb.classList.add("open");
      closeBtn.focus();
      doc.body.style.overflow = "hidden";
    }

    function closeLightbox() {
      lb.classList.remove("open");
      doc.body.style.overflow = "";
      if (lastFocus) lastFocus.focus();
    }

    gallery.addEventListener("click", function (e) {
      var fig = e.target.closest("figure");
      if (!fig) return;
      var img = fig.querySelector("img");
      if (img) openLightbox(img.currentSrc || img.src, img.alt);
    });

    closeBtn.addEventListener("click", closeLightbox);
    lb.addEventListener("click", function (e) { if (e.target === lb) closeLightbox(); });
    doc.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && lb.classList.contains("open")) closeLightbox();
    });
  }

  /* ----------------------------------------------------------------------
     11. TABLE OF CONTENTS (journal)
     Highlights the section currently in view.
     ---------------------------------------------------------------------- */
  var toc = doc.querySelector(".toc");
  if (toc && "IntersectionObserver" in window) {
    var tocLinks = toc.querySelectorAll("a");
    var sections = [];
    tocLinks.forEach(function (a) {
      var id = a.getAttribute("href").slice(1);
      var sec = doc.getElementById(id);
      if (sec) sections.push({ link: a, sec: sec });
    });

    var tio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        sections.forEach(function (s) {
          s.link.classList.toggle("active", s.sec === entry.target);
        });
      });
    }, { rootMargin: "-30% 0px -60% 0px" });

    sections.forEach(function (s) { tio.observe(s.sec); });
  }

  /* ----------------------------------------------------------------------
     12. PAGE TRANSITIONS
     Uses the View Transitions API where available, with a graceful fade
     fallback for everything else.
     ---------------------------------------------------------------------- */
  if (!reducedMotion.matches && doc.startViewTransition) {
    doc.addEventListener("click", function (e) {
      var a = e.target.closest("a[href]");
      if (!a) return;
      var href = a.getAttribute("href");
      var url = new URL(href, location.href);
      var isInternal = url.origin === location.origin;
      var isHashOnly = url.pathname === location.pathname && url.hash;
      var isNewTab = a.target === "_blank" || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey;

      if (!isInternal || isHashOnly || isNewTab) return;

      e.preventDefault();
      doc.startViewTransition(function () {
        location.href = url.href;
      });
    });
  }

  /* ----------------------------------------------------------------------
     13. CURSOR + MAGNETIC BUTTONS
     Desktop only, disabled for reduced motion.
     ---------------------------------------------------------------------- */
  if (finePointer.matches && !reducedMotion.matches) {
    var dot = doc.createElement("div");
    dot.className = "cursor-dot";
    doc.body.appendChild(dot);

    var dotX = 0, dotY = 0, curX = 0, curY = 0, raf = null;

    function loop() {
      curX += (dotX - curX) * 0.22;
      curY += (dotY - curY) * 0.22;
      dot.style.transform = "translate(" + curX + "px," + curY + "px) translate(-50%,-50%)";
      if (Math.abs(dotX - curX) > 0.1 || Math.abs(dotY - curY) > 0.1) {
        raf = requestAnimationFrame(loop);
      } else {
        raf = null;
      }
    }

    doc.addEventListener("mousemove", function (e) {
      dotX = e.clientX;
      dotY = e.clientY;
      dot.classList.add("is-live");
      if (!raf) raf = requestAnimationFrame(loop);
    }, { passive: true });

    doc.addEventListener("mouseover", function (e) {
      dot.classList.toggle("is-link", !!e.target.closest("a, button, .gallery figure, input, textarea, select"));
    });

    doc.addEventListener("mouseleave", function () { dot.classList.remove("is-live"); });

    /* buttons lean toward the pointer */
    doc.querySelectorAll(".btn, .icon-btn").forEach(function (el) {
      el.classList.add("magnetic");
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        var dx = (e.clientX - r.left - r.width / 2) / r.width;
        var dy = (e.clientY - r.top - r.height / 2) / r.height;
        el.style.transform = "translate(" + dx * 8 + "px," + dy * 6 + "px)";
      });
      el.addEventListener("mouseleave", function () {
        el.style.transform = "";
      });
    });
  }

  /* ----------------------------------------------------------------------
     14. PARALLAX
     [data-parallax] elements drift as the page scrolls. Uses rAF and a
     single scroll listener; cheap enough to keep everywhere.
     ---------------------------------------------------------------------- */
  var parallaxEls = doc.querySelectorAll("[data-parallax]");
  if (parallaxEls.length && !reducedMotion.matches) {
    var ticking = false;

    function parallaxTick() {
      var vh = window.innerHeight;
      parallaxEls.forEach(function (el) {
        var speed = parseFloat(el.getAttribute("data-parallax")) || 0.1;
        var rect = el.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > vh) return;
        var progress = (rect.top + rect.height / 2 - vh / 2) / vh;
        el.style.transform = "translateY(" + (progress * speed * 100).toFixed(2) + "px)";
      });
      ticking = false;
    }

    window.addEventListener("scroll", function () {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(parallaxTick);
      }
    }, { passive: true });
    parallaxTick();
  }

  /* ----------------------------------------------------------------------
     15. ACTIVE NAV LINK
     Marks the current page; harmless on pages that already set it in HTML.
     ---------------------------------------------------------------------- */
  (function markCurrent() {
    var here = location.pathname.split("/").pop() || "index.html";
    doc.querySelectorAll(".nav a").forEach(function (a) {
      var target = a.getAttribute("href").split("/").pop();
      if (target === here && !a.hasAttribute("aria-current")) {
        a.setAttribute("aria-current", "page");
      }
    });
  })();

  /* ----------------------------------------------------------------------
     16. FOOTER YEAR
     ---------------------------------------------------------------------- */
  doc.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });
})();
