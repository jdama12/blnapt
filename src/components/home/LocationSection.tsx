import { useEffect, useRef } from 'react'
import { naverMapUrl } from './homeData'

const mapCenter = { latitude: 37.4942585, longitude: 126.9136342 }
const mapRange = { latitude: 0.0064, longitude: 0.0113 }

const mapPlaces = [
  { label: '신풍역', type: 'station-seven', icon: '7', latitude: 37.5002556, longitude: 126.9121552, labelPosition: 'below-left' },
  { label: '보라매역', type: 'station-transfer', icon: '7', latitude: 37.49972, longitude: 126.91972, labelPosition: 'below' },
  { label: '보라매공원역', type: 'station-sillim', icon: 'S', latitude: 37.4958229, longitude: 126.9178162, labelPosition: 'above-right' },
  { label: '강남성심병원', type: 'hospital', icon: '+', latitude: 37.491359, longitude: 126.9074246, labelPosition: 'above' },
  { label: '보라매병원', type: 'hospital', icon: '+', latitude: 37.4939063, longitude: 126.9240874, labelPosition: 'above-left' },
  { label: '보라매공원', type: 'nature', icon: 'P', latitude: 37.4932422, longitude: 126.920474, labelPosition: 'below-left' },
  { label: '보라매초등학교', type: 'school', icon: 'E', latitude: 37.4954651, longitude: 126.9161798, labelPosition: 'above-right' },
  { label: '대방중학교', type: 'school', icon: 'M', latitude: 37.4951673, longitude: 126.9138379, labelPosition: 'above-left' },
  { label: '수도여고', type: 'school', icon: 'H', latitude: 37.4928154, longitude: 126.915433, labelPosition: 'below-right' },
  { label: '동작구민체육센터', type: 'sports', icon: 'C', latitude: 37.4945902, longitude: 126.9167288, labelPosition: 'below-right' },
  { label: '와우산', type: 'nature', icon: '▲', latitude: 37.4908784, longitude: 126.9140215, labelPosition: 'below' },
] as const

function getMapPosition(latitude: number, longitude: number) {
  return {
    left: `${50 + ((longitude - mapCenter.longitude) / mapRange.longitude) * 42}%`,
    top: `${50 - ((latitude - mapCenter.latitude) / mapRange.latitude) * 42}%`,
  }
}

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
          <figure className="home-schematic-map" aria-label="보라매롯데낙천대 주변 생활권 안내 지도">
            <svg className="home-map-drawing" viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true">
              <rect width="1000" height="600" fill="#eef1ef" />
              <g fill="#d9ddda">
                <rect x="28" y="36" width="190" height="106" rx="8" />
                <rect x="245" y="30" width="154" height="112" rx="8" />
                <rect x="420" y="25" width="156" height="120" rx="8" />
                <rect x="600" y="30" width="165" height="112" rx="8" />
                <rect x="788" y="38" width="182" height="104" rx="8" />
                <rect x="30" y="178" width="145" height="134" rx="8" />
                <rect x="198" y="176" width="175" height="128" rx="8" />
                <rect x="398" y="180" width="164" height="120" rx="8" />
                <rect x="590" y="175" width="174" height="132" rx="8" />
                <rect x="790" y="178" width="180" height="125" rx="8" />
                <rect x="28" y="348" width="170" height="116" rx="8" />
                <rect x="225" y="340" width="164" height="130" rx="8" />
                <rect x="412" y="342" width="155" height="126" rx="8" />
                <rect x="596" y="342" width="172" height="126" rx="8" />
                <rect x="790" y="338" width="182" height="134" rx="8" />
                <rect x="30" y="502" width="185" height="68" rx="8" />
                <rect x="245" y="505" width="180" height="67" rx="8" />
                <rect x="455" y="500" width="170" height="72" rx="8" />
                <rect x="655" y="503" width="145" height="67" rx="8" />
              </g>
              <path d="M-40 160C170 155 310 170 500 158S790 130 1040 160" fill="none" stroke="#fff" strokeWidth="48" />
              <path d="M170-30C180 150 250 270 370 650" fill="none" stroke="#fff" strokeWidth="42" />
              <path d="M550-30C535 130 520 265 505 640" fill="none" stroke="#fff" strokeWidth="40" />
              <path d="M830-30C790 125 748 310 710 650" fill="none" stroke="#fff" strokeWidth="44" />
              <path d="M-40 325C200 310 420 335 620 315S820 290 1040 325" fill="none" stroke="#fff" strokeWidth="38" />
              <path d="M-40 492C220 470 455 505 650 482S865 455 1040 490" fill="none" stroke="#fff" strokeWidth="36" />
              <path d="M330 0C430 85 480 120 725 86" fill="none" stroke="#74851a" strokeWidth="10" />
              <path d="M726 86C712 145 688 195 655 238S718 315 770 350" fill="none" stroke="#416f9f" strokeWidth="8" />
              <path d="M575 390C650 350 745 358 835 410L920 550H565Z" fill="#c9dfb8" opacity=".85" />
              <path d="M350 478C405 448 470 464 518 515L478 600H302Z" fill="#b9d5a6" opacity=".82" />
            </svg>
            <div className="home-map-line-label is-seven">7호선</div>
            <div className="home-map-line-label is-sillim">신림선</div>
            {mapPlaces.map((place) => (
              <div
                className={`home-map-point is-${place.type}`}
                key={place.label}
                style={getMapPosition(place.latitude, place.longitude)}
              >
                <span aria-hidden="true">{place.icon}</span>
                <strong className={`is-${place.labelPosition}`}>{place.label}</strong>
              </div>
            ))}
            <div className="home-map-point is-home" style={{ left: '50%', top: '50%' }}>
              <span aria-hidden="true">APT</span>
              <strong className="is-below">보라매롯데낙천대아파트</strong>
            </div>
            <figcaption>
              실제 위치를 기준으로 축약한 안내도 ·{' '}
              <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
                © OpenStreetMap contributors
              </a>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  )
}
