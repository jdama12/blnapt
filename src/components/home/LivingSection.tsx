import HomeIcon from './HomeIcon'
import { livingItems } from './homeData'
import parkIllustration from '../../assets/living-park.jpg'
import transportIllustration from '../../assets/living-transport.jpg'
import educationIllustration from '../../assets/living-education.jpg'
import medicalIllustration from '../../assets/living-medical.jpg'

const livingIllustrations = {
  park: parkIllustration,
  transport: transportIllustration,
  education: educationIllustration,
  medical: medicalIllustration,
}

export default function LivingSection() {
  return (
    <section className="home-section home-living" id="living">
      <div className="home-container">
        <div className="home-section-heading">
          <p className="home-eyebrow">LIVING ENVIRONMENT</p>
          <h2>생활환경</h2>
          <p>가까이에서 누리는 편리한 일상</p>
        </div>
        <div className="home-living-grid">
          {livingItems.map((item) => (
            <article className="home-living-card" key={item.eyebrow}>
              <div className={`home-living-visual is-${item.icon}`} aria-hidden="true">
                <img src={livingIllustrations[item.icon]} alt="" loading="lazy" />
                <HomeIcon name={item.icon} />
                <span>{item.eyebrow}</span>
              </div>
              <div>
                <small>{item.eyebrow}</small>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
