import { useLayoutEffect } from 'react'

const revealItemSelector = [
  '.home-stats-grid > div',
  '.home-stats-address',
  '.home-about-copy > :not(.home-about-points)',
  '.home-about-points > li',
  '.home-about-photo',
  '.home-section-heading > *',
  '.home-living-card',
  '.home-location-copy > *',
  '.home-map-preview',
  '.home-news-list > article',
  '.home-resident-inner > div > *',
  '.home-resident-inner > ul > li',
  '.home-external-links h2',
  '.home-external-grid > *',
].join(',')

export default function useHomeScrollReveal() {
  useLayoutEffect(() => {
    const root = document.querySelector<HTMLElement>('.public-home')
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>('#home-main > section:not(.home-hero)'),
    )

    if (!root || sections.length === 0) return

    sections.forEach((section) => {
      section.classList.add('home-reveal-section')

      section.querySelectorAll<HTMLElement>(revealItemSelector).forEach((item, index) => {
        item.classList.add('home-reveal-item')
        item.style.setProperty('--home-reveal-index', String(Math.min(index, 7)))
        item.style.setProperty('--home-reveal-distance', `${28 + (index % 3) * 8}px`)
      })
    })

    if (!('IntersectionObserver' in window)) {
      sections.forEach((section) => section.classList.add('is-visible'))
      root.classList.add('is-reveal-ready')
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          entry.target.classList.add('is-visible')
          observer.unobserve(entry.target)
        })
      },
      {
        threshold: 0.14,
        rootMargin: '0px 0px -8% 0px',
      },
    )

    sections.forEach((section) => observer.observe(section))
    root.classList.add('is-reveal-ready')

    return () => observer.disconnect()
  }, [])
}
