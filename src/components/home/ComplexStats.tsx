import { complexStats } from './homeData'

export default function ComplexStats() {
  return (
    <section className="home-stats" aria-label="단지 주요 정보">
      <div className="home-container home-stats-inner">
        <div className="home-stats-grid">
          {complexStats.map((stat) => <div key={stat.label}><strong>{stat.value}</strong><span>{stat.label}</span></div>)}
        </div>
        <div className="home-stats-address"><small>ADDRESS</small><p>서울특별시 동작구 여의대방로10길 38</p></div>
      </div>
    </section>
  )
}
