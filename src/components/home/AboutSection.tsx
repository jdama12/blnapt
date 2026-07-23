import apartmentHero from '../../assets/apartment-hero.jpg'

const aboutPoints = [
  '보라매공원 생활권',
  '편리한 대중교통',
  '교육시설 접근성',
  '의료시설 접근성',
]

export default function AboutSection() {
  return (
    <section className="home-section home-about" id="about">
      <div className="home-container home-split">
        <div className="home-about-copy">
          <p className="home-eyebrow">BORAMAE LOTTE NAKCHEONDAE</p>
          <h2>보라매의 중심에서<br />누리는 편안한 일상</h2>
          <p className="home-section-description">
            공원과 교통, 교육과 의료가 일상 가까이 이어지는 곳. 보라매롯데낙천대는
            7개동 734세대가 함께하는 안정적인 주거단지입니다.
          </p>
          <ul className="home-about-points">
            {aboutPoints.map((point, index) => <li key={point}><span>{String(index + 1).padStart(2, '0')}</span>{point}</li>)}
          </ul>
        </div>
        <figure className="home-about-photo">
          <img src={apartmentHero} alt="보라매롯데낙천대 101동과 103동 전경" loading="lazy" />
          <figcaption>
            <strong>7개동 734세대</strong>
            <span>보라매롯데낙천대 단지 전경</span>
          </figcaption>
        </figure>
      </div>
    </section>
  )
}
