import { Link } from 'react-router-dom'
import { residentServices } from './homeData'

export default function ResidentServiceSection() {
  return (
    <section className="home-section home-resident" id="resident">
      <div className="home-resident-pattern" aria-hidden="true" />
      <div className="home-container home-resident-inner">
        <div>
          <p className="home-eyebrow is-light">RESIDENT SERVICE</p>
          <h2>더 편리한<br />아파트 생활을 위해</h2>
          <p>입주민을 위한 생활지원 서비스를 한곳에서 편리하게 이용하세요.</p>
          <Link className="home-primary-button is-warm" to="/login">입주민 서비스 로그인 <span aria-hidden="true">→</span></Link>
        </div>
        <ul>
          {residentServices.map((service, index) => (
            <li key={service}><span>{String(index + 1).padStart(2, '0')}</span><strong>{service}</strong></li>
          ))}
        </ul>
      </div>
    </section>
  )
}
