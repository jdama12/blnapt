import { useEffect, useRef } from 'react'
import neighborhoodMap from '../../assets/neighborhood-map-illustration.jpg'
import { naverMapUrl } from './homeData'

const mapPlaces = [
  { label: '신풍역', type: 'station', icon: '●', left: '15%', top: '12%' },
  { label: '보라매역', type: 'station', icon: '●', left: '48%', top: '14%' },
  { label: '보라매공원역', type: 'station', icon: '●', left: '78%', top: '22%' },
  { label: '강남성심병원', type: 'hospital', icon: '+', left: '10%', top: '59%' },
  { label: '보라매병원', type: 'hospital', icon: '+', left: '75%', top: '36%' },
  { label: '보라매공원', type: 'nature', icon: '♧', left: '70%', top: '72%' },
  { label: '보라매초등학교', type: 'school', icon: '▤', left: '15%', top: '29%' },
  { label: '대방중학교', type: 'school', icon: '▤', left: '22%', top: '44%' },
  { label: '수도여고', type: 'school', icon: '▤', left: '34%', top: '32%' },
  { label: '동작구민체육센터', type: 'sports', icon: '◆', left: '82%', top: '53%' },
  { label: '와우산', type: 'nature', icon: '△', left: '18%', top: '82%' },
] as const

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
        <div className="home-map-viewport" ref={mapViewportRef}>
          <figure className="home-illustrated-map" aria-label="보라매롯데낙천대 주변 생활권 안내 지도">
            <img src={neighborhoodMap} alt="" loading="lazy" aria-hidden="true" />
            {mapPlaces.map((place) => (
              <div
                className={`home-map-place is-${place.type}`}
                key={place.label}
                style={{ left: place.left, top: place.top }}
              >
                <span aria-hidden="true">{place.icon}</span>
                <strong>{place.label}</strong>
              </div>
            ))}
            <div className="home-map-place is-home" style={{ left: '50%', top: '47%' }}>
              <span aria-hidden="true">▥</span>
              <strong>보라매롯데낙천대아파트</strong>
            </div>
            <figcaption>주요 생활시설의 위치를 이해하기 쉽게 축약한 안내도입니다.</figcaption>
          </figure>
        </div>
      </div>
    </section>
  )
}
