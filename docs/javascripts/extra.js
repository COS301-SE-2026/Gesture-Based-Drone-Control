/* Gesture-Based Drone Control — extra.js
   Runs after MkDocs Material's own scripts. */

const TX_GLYPHS = String.raw`ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#_/\<>`
const TX_RAND = new Uint32Array(1)

function txRand(max) {
  crypto.getRandomValues(TX_RAND)
  return TX_RAND[0] % max
}

function txScramble(el, duration = 900) {
  if (el.dataset.txScrambled) return
  el.dataset.txScrambled = "1"
  const original = el.textContent
  const start = performance.now()

  function frame(now) {
    const progress = Math.min((now - start) / duration, 1)
    const settled = Math.floor(original.length * progress)
    let out = ""
    for (let i = 0; i < original.length; i++) {
      const ch = original[i]
      if (i < settled || ch === " " || ch === "·") {
        out += ch
      } else {
        out += TX_GLYPHS[txRand(TX_GLYPHS.length)]
      }
    }
    el.textContent = out
    if (progress < 1) {
      requestAnimationFrame(frame)
    } else {
      el.textContent = original
    }
  }
  requestAnimationFrame(frame)
}

function txSpotlight(card) {
  if (card.dataset.txSpot) return
  card.dataset.txSpot = "1"
  card.addEventListener("mousemove", (e) => {
    const r = card.getBoundingClientRect()
    card.style.setProperty("--spot-x", e.clientX - r.left + "px")
    card.style.setProperty("--spot-y", e.clientY - r.top + "px")
  })
}

function txBackLink() {
  const header = document.querySelector(".md-header__inner")
  if (!header || header.querySelector(".tx-back")) return

  const a = document.createElement("a")
  a.className = "tx-back"
  const logo = document.querySelector(".md-header__button.md-logo")
  const docsRoot = logo
    ? new URL(logo.getAttribute("href"), window.location.href)
    : new URL(".", window.location.href)
  a.href = new URL("..", docsRoot).href
  a.innerHTML = '<span class="tx-back__arrow">←</span><span>Mudra Home</span>'
  a.title = "Back to the landing page"

  const search = header.querySelector(".md-search")
  if (search) {
    search.before(a)
  } else {
    header.appendChild(a)
  }
}

document$.subscribe(function () {
  document
    .querySelectorAll(".tx-hero__eyebrow, .tx-divider__label")
    .forEach((el) => txScramble(el))

  document
    .querySelectorAll(".tx-card, .tx-member, .tx-partner")
    .forEach((el) => txSpotlight(el))

  txBackLink()

  /* Animate cards into view on scroll */
  if ("IntersectionObserver" in window) {
    const cards = document.querySelectorAll(
      ".tx-card:not([data-tx-io]), .tx-member:not([data-tx-io]), .tx-partner:not([data-tx-io])"
    )
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.style.opacity = "1"
            entry.target.style.transform = "translateY(0)"
            io.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1 }
    )
    cards.forEach((card) => {
      card.dataset.txIo = "1"
      card.style.opacity = "0"
      card.style.transform = "translateY(16px)"
      card.style.transition = "opacity 0.4s ease, transform 0.4s ease"
      io.observe(card)
    })
  }
})