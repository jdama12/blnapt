import { naverMapUrl } from './homeData'

export default function LocationSection() {
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
        <div className="home-map-placeholder" role="img" aria-label="단지 위치 지도 영역">
          <div className="home-map-grid" aria-hidden="true" />
          <div className="home-map-pin" aria-hidden="true"><span /></div>
          <div className="home-map-label"><strong>보라매롯데낙천대</strong><small>서울 동작구</small></div>
        </div>
      </div>
    </section>
  )
}
