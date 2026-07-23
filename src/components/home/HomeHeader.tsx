import { useEffect, useState } from 'react'
import { navigationItems } from './homeData'
import HomeLogoMark from './HomeLogoMark'
import ResidentLoginLink from './ResidentLoginLink'

export default function HomeHeader() {
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (!menuOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [menuOpen])

  return (
    <header className="home-header">
      <div className="home-container home-header-inner">
        <a className="home-wordmark" href="#top" aria-label="보라매롯데낙천대 홈페이지 처음으로">
          <HomeLogoMark />
          <span><strong>보라매롯데낙천대</strong><small>BORAMAE LOTTE NAKCHEONDAE</small></span>
        </a>

        <nav className="home-desktop-nav" aria-label="홈페이지 주요 메뉴">
          {navigationItems.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}
        </nav>

        <ResidentLoginLink className="home-login-button home-desktop-login">입주민 로그인</ResidentLoginLink>
        <button
          className={`home-menu-toggle${menuOpen ? ' is-open' : ''}`}
          type="button"
          aria-label={menuOpen ? '메뉴 닫기' : '메뉴 열기'}
          aria-expanded={menuOpen}
          aria-controls="home-mobile-menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span /><span /><span />
        </button>
      </div>

      {menuOpen && (
        <div className="home-mobile-menu-backdrop" onClick={() => setMenuOpen(false)}>
          <nav
            className="home-mobile-menu"
            id="home-mobile-menu"
            aria-label="모바일 주요 메뉴"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="home-mobile-menu-head">
              <strong>전체 메뉴</strong>
              <button type="button" aria-label="메뉴 닫기" onClick={() => setMenuOpen(false)}>×</button>
            </div>
            {navigationItems.map((item) => (
              <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)}>{item.label}<span>›</span></a>
            ))}
            <ResidentLoginLink className="home-login-button" onNavigate={() => setMenuOpen(false)}>
              입주민 로그인
            </ResidentLoginLink>
          </nav>
        </div>
      )}
    </header>
  )
}
