import { useEffect, useState, type ReactNode, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'

const productionHosts = new Set(['blnapt.vercel.app', 'www.blnapt.vercel.app'])

interface ResidentLoginLinkProps {
  children: ReactNode
  className: string
  onNavigate?: () => void
}

function isProductionSite() {
  return __VERCEL_ENV__ === 'production'
    || productionHosts.has(window.location.hostname.toLowerCase())
}

export default function ResidentLoginLink({ children, className, onNavigate }: ResidentLoginLinkProps) {
  const [noticeVisible, setNoticeVisible] = useState(false)

  useEffect(() => {
    if (!noticeVisible) return
    const timeoutId = window.setTimeout(() => setNoticeVisible(false), 2800)
    return () => window.clearTimeout(timeoutId)
  }, [noticeVisible])

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (isProductionSite()) {
      event.preventDefault()
      setNoticeVisible(true)
      return
    }

    onNavigate?.()
  }

  return (
    <>
      <Link className={className} to="/login" onClick={handleClick}>{children}</Link>
      {noticeVisible && createPortal(
        <div className="home-service-notice" role="status" aria-live="polite">
          <strong>입주민 서비스 준비 중</strong>
          <span>현재 운영 준비 중입니다. 조금만 기다려 주세요.</span>
        </div>,
        document.body,
      )}
    </>
  )
}
