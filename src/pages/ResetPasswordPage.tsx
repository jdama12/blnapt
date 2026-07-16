import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { resetPassword } from '../lib/backend'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage('')

    if (password.length < 6) {
      setMessage('비밀번호는 6자 이상 입력해 주세요.')
      return
    }
    if (password !== passwordConfirm) {
      setMessage('비밀번호 확인이 일치하지 않습니다.')
      return
    }

    setSubmitting(true)
    try {
      await resetPassword(password)
      window.alert('비밀번호가 변경되었습니다. 새 비밀번호로 로그인해 주세요.')
      navigate('/login', { replace: true })
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '비밀번호를 변경하지 못했습니다.')
      setSubmitting(false)
    }
  }

  return (
    <section className="auth-wrap">
      <div className="auth-visual">
        <div className="brand-lockup">
          <div className="brand-mark">APT</div>
          <div>
            <div className="brand-title">보라매SK뷰 아파트 생활지원</div>
            <div className="brand-sub">안전한 계정 복구</div>
          </div>
        </div>
        <div className="hero-copy">
          <h1>새 비밀번호를<br />설정해 주세요.</h1>
          <p>메일로 받은 재설정 링크를 통해서만 비밀번호를 변경할 수 있습니다.</p>
        </div>
      </div>
      <div className="auth-panel">
        <div className="auth-card">
          <h2>비밀번호 재설정</h2>
          <p className="lead">앞으로 사용할 새 비밀번호를 입력하세요.</p>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="newPassword">새 비밀번호</label>
              <input
                className="control"
                id="newPassword"
                type="password"
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="newPasswordConfirm">새 비밀번호 확인</label>
              <input
                className="control"
                id="newPasswordConfirm"
                type="password"
                minLength={6}
                autoComplete="new-password"
                value={passwordConfirm}
                onChange={(event) => setPasswordConfirm(event.target.value)}
                required
              />
            </div>
            {message && <div className="demo-box" role="alert">{message}</div>}
            <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
              {submitting ? '변경 중...' : '비밀번호 변경'}
            </button>
          </form>
          <div className="auth-help" style={{ marginTop: 18 }}>
            <Link className="auth-link-button" to="/login">로그인으로 돌아가기</Link>
          </div>
        </div>
      </div>
    </section>
  )
}
