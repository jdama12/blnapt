import { newsItems } from './homeData'

export default function NewsSection() {
  return (
    <section className="home-section home-news" id="news">
      <div className="home-container">
        <div className="home-section-heading is-row">
          <div><p className="home-eyebrow">COMMUNITY NEWS</p><h2>우리 아파트 소식</h2></div>
          <p>단지의 주요 소식과 안내를 전합니다.</p>
        </div>
        <div className="home-news-list">
          {newsItems.map((news, index) => (
            <article key={`${news.date}-${news.title}`}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <time>{news.date}</time>
              <h3>{news.title}</h3>
              <i aria-hidden="true">—</i>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
