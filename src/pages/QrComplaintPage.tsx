import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { createComplaint, createGuestQrComplaint, resolveHouseholdQr, signInWithQr } from '../lib/backend'

type HouseholdInfo = { building: number; unit: number; registered: boolean }
type QrSession = { building: number; unit: number; residentId: string; householdId: number }

const categories = ['시설', '전기', '청소', '주차', '경비', '조경', '소음', '기타']

export default function QrComplaintPage() {
  const { qrCode = '' } = useParams()
  const [household, setHousehold] = useState<HouseholdInfo | null>(null)
  const [session, setSession] = useState<QrSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [complaintId, setComplaintId] = useState<number | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const previewUrl = useMemo(() => imageFile ? URL.createObjectURL(imageFile) : '', [imageFile])

  useEffect(() => {
    let active = true
    resolveHouseholdQr(qrCode)
      .then((result) => { if (active) setHousehold(result) })
      .catch((cause: Error) => { if (active) setError(cause.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [qrCode])

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    const form = new FormData(event.currentTarget)
    try {
      const result = await signInWithQr(qrCode, String(form.get('password') ?? ''))
      setSession(result)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'QR 로그인을 처리하지 못했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleComplaint(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!household) return
    setSubmitting(true)
    setError('')
    const form = new FormData(event.currentTarget)
    try {
      const complaintInput = {
        category: String(form.get('category') ?? ''),
        title: String(form.get('title') ?? '').trim(),
        location: String(form.get('location') ?? '').trim(),
        content: String(form.get('content') ?? '').trim(),
        file: imageFile ?? undefined,
      }
      const id = session
        ? await createComplaint({ ...complaintInput, authorId: session.residentId, status: 'pending', source: 'qr' })
        : await createGuestQrComplaint(qrCode, complaintInput)
      setComplaintId(id)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '민원을 등록하지 못했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleImage(file: File | null) {
    if (!file) return setImageFile(null)
    if (!file.type.startsWith('image/')) return setError('이미지 파일만 첨부할 수 있습니다.')
    if (file.size > 10 * 1024 * 1024) return setError('이미지는 10MB 이하만 첨부할 수 있습니다.')
    setError('')
    setImageFile(file)
  }

  return (
    <main className="qr-page">
      <section className="qr-flow-card">
        <div className="brand-lockup qr-brand">
          <div className="brand-mark">APT</div>
          <div><div className="brand-title">보라매롯데낙천대</div><div className="brand-sub">QR 간편 민원접수</div></div>
        </div>

        {loading && <div className="loading-state qr-loading"><div className="spinner" /><b>세대 QR을 확인하고 있습니다.</b></div>}

        {!loading && !household && <div className="empty-state"><div className="empty-icon">!</div><strong>QR을 사용할 수 없습니다.</strong><p>{error || '관리사무소에서 새 QR을 발급받아 주세요.'}</p></div>}

        {household?.registered && !session && (
          <>
            <div className="qr-household-badge"><strong>{household.building}동 {household.unit}호</strong><span>세대 전용 QR</span></div>
            <h1>비밀번호를 입력하세요.</h1>
            <p className="lead">승인된 현재 입주민의 비밀번호로 민원접수 화면에 접속합니다.</p>
            <form onSubmit={handleLogin}>
              <div className="field"><label htmlFor="qrPassword">비밀번호</label><input className="control" id="qrPassword" name="password" type="password" autoComplete="current-password" minLength={8} maxLength={72} required autoFocus /></div>
              {error && <div className="qr-error" role="alert">{error}</div>}
              <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>{submitting ? '확인 중…' : '민원접수 시작'}</button>
            </form>
            <a className="btn btn-secondary btn-block qr-normal-login" href="/login">일반 로그인으로 이동</a>
          </>
        )}

        {household && (!household.registered || session) && complaintId === null && (
          <>
            <div className="qr-household-badge"><strong>{household.building}동 {household.unit}호</strong><span>{session ? '입주민 QR 접수' : '미가입 세대 접수'}</span></div>
            <h1>민원 내용을 작성하세요.</h1>
            <p className="lead">{session ? '접수한 민원은 기존 민원 처리현황에서 동일하게 관리됩니다.' : '민원은 바로 접수됩니다. 접수현황 확인과 추가 의견 작성은 회원가입 후 이용할 수 있습니다.'}</p>
            <form onSubmit={handleComplaint}>
              <div className="field"><label htmlFor="qrCategory">민원 분류</label><select className="control" id="qrCategory" name="category" required>{categories.map((category) => <option key={category}>{category}</option>)}</select></div>
              <div className="field"><label htmlFor="qrTitle">민원 제목</label><input className="control" id="qrTitle" name="title" maxLength={200} required /></div>
              <div className="field"><label htmlFor="qrLocation">위치</label><input className="control" id="qrLocation" name="location" placeholder="예: 101동 1층 출입구" maxLength={200} required /></div>
              <div className="field"><label htmlFor="qrContent">상세 내용</label><textarea className="control" id="qrContent" name="content" maxLength={3000} required /></div>
              <div className="field"><label htmlFor="qrImage">사진 첨부 <span className="muted">(선택, 최대 10MB)</span></label><input className="control" id="qrImage" type="file" accept="image/*" onChange={(event) => handleImage(event.target.files?.[0] ?? null)} /></div>
              {previewUrl && <div className="notice-upload-preview qr-image-preview"><img src={previewUrl} alt="민원 첨부 미리보기" /></div>}
              {error && <div className="qr-error" role="alert">{error}</div>}
              <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>{submitting ? '접수 중…' : '민원 접수'}</button>
            </form>
          </>
        )}

        {household && complaintId !== null && (
          <div className="qr-success">
            <div className="qr-success-icon">✓</div><h1>민원이 접수되었습니다.</h1><p>민원번호 <strong>#{complaintId}</strong></p>
            {session
              ? <a className="btn btn-primary btn-block" href="/complaints">처리현황 확인</a>
              : <><div className="demo-box">현재는 민원 접수만 완료되었습니다. 처리현황을 확인하려면 입주민 회원가입과 관리자 승인이 필요합니다.</div><a className="btn btn-primary btn-block qr-normal-login" href="/register">회원가입</a></>}
          </div>
        )}
      </section>
    </main>
  )
}
