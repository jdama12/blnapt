import apartmentHero from '../../assets/apartment-hero-illustration.jpg'
import ResidentLoginLink from './ResidentLoginLink'

export default function HeroSection() {
  return (
    <section className="home-hero" id="top">
      <div className="home-hero-media" aria-hidden="true">
        <img src={apartmentHero} alt="" />
      </div>
      <div className="home-hero-shade" aria-hidden="true" />
      <div className="home-container home-hero-content">
        <p className="home-eyebrow is-light">BORAMAE LOTTE NAKCHEONDAE</p>
        <h1>보라매롯데낙천대</h1>
        <p className="home-hero-lead">도심의 편리함과 보라매의 여유를 함께 누리는 곳</p>
        <address>서울특별시 동작구 여의대방로10길 38</address>
        <div className="home-hero-actions">
          <a className="home-primary-button" href="#about">단지 둘러보기</a>
          <ResidentLoginLink className="home-secondary-button is-light">입주민 생활지원</ResidentLoginLink>
        </div>
      </div>
    </section>
  )
}
