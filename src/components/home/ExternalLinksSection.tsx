import { externalLinks } from './homeData'

export default function ExternalLinksSection() {
  return (
    <section className="home-external-links" aria-labelledby="external-links-title">
      <div className="home-container">
        <h2 id="external-links-title">관련 정보 바로가기</h2>
        <div className="home-external-grid">
          {externalLinks.map((link) => link.href ? (
            <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer">
              <span><strong>{link.label}</strong><small>{link.description}</small></span><b aria-hidden="true">↗</b>
            </a>
          ) : (
            <div className="is-disabled" key={link.label} aria-disabled="true">
              <span><strong>{link.label}</strong><small>{link.description}</small></span><em>준비 중</em>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
