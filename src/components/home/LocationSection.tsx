import { naverMapUrl } from './homeData'

const mapPreviewUrl =
  'https://www.openstreetmap.org/export/embed.html?bbox=126.9075%2C37.4899%2C126.9198%2C37.4986&layer=mapnik'

export default function LocationSection() {
  return (
    <section className="home-section home-location">
      <div className="home-container home-location-grid">
        <div className="home-location-copy">
          <p className="home-eyebrow">LOCATION</p>
          <h2>생활의 중심에 위치한<br />보라매롯데낙천대</h2>
          <address>서울특별시 동작구<br />여의대방로10길 38</address>
          <a className="home-primary-button" href={naverMapUrl} target="_blank" rel="noopener noreferrer">
            네이버 부동산에서 보기 <span aria-hidden="true">↗</span>
          </a>
        </div>

        <figure className="home-map-preview">
          <iframe
            src={mapPreviewUrl}
            title="보라매롯데낙천대 주변 지도"
            loading="lazy"
            tabIndex={-1}
          />
          <div className="home-map-apartment-pin" aria-hidden="true">
            <span>APT</span>
            <strong>보라매롯데낙천대</strong>
            <small>여의대방로10길 38</small>
          </div>
          <div className="home-map-preview-footer">
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
              © OpenStreetMap contributors
            </a>
            <a className="home-map-open" href={naverMapUrl} target="_blank" rel="noopener noreferrer">
              네이버 부동산 상세 지도 <span aria-hidden="true">↗</span>
            </a>
          </div>
        </figure>
      </div>
    </section>
  )
}
