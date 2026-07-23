import { useEffect, useRef } from 'react'
import { naverMapUrl } from './homeData'


export default function LocationSection() {
  const mapViewportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const centerMap = () => {
      const viewport = mapViewportRef.current
      if (!viewport || viewport.scrollWidth <= viewport.clientWidth) return
      viewport.scrollLeft = (viewport.scrollWidth - viewport.clientWidth) / 2
    }

    const frameId = window.requestAnimationFrame(centerMap)
    window.addEventListener('resize', centerMap)
    return () => {
      window.cancelAnimationFrame(frameId)
      window.removeEventListener('resize', centerMap)
    }
  }, [])

  return (
    <section className="home-section home-location">
      <div className="home-container home-location-grid">
        <div className="home-location-copy">
          <p className="home-eyebrow">LOCATION</p>
          <h2>생활의 중심에 위치한<br />보라매롯데낙천대</h2>
          <address>서울특별시 동작구<br />여의대방로10길 38</address>
          <a className="home-primary-button" href={naverMapUrl} target="_blank" rel="noopener noreferrer">
            네이버 지도에서 보기 <span aria-hidden="true">↗</span>
          </a>
        </div>
        
      </div>
    </section>
  )
}
