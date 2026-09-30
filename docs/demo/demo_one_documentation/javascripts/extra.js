/* Gesture-Based Drone Control — extra.js
   Runs after MkDocs Material's own scripts. */

document$.subscribe(function () {
  /* Re-run any custom init after instant navigation */

  /* Animate cards into view on scroll */
  if ('IntersectionObserver' in window) {
    const cards = document.querySelectorAll('.tx-card, .tx-member, .tx-partner')
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.style.opacity = '1'
            entry.target.style.transform = 'translateY(0)'
            io.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1 }
    )
    cards.forEach((card) => {
      card.style.opacity = '0'
      card.style.transform = 'translateY(16px)'
      card.style.transition = 'opacity 0.4s ease, transform 0.4s ease'
      io.observe(card)
    })
  }
})