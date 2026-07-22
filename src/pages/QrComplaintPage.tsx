import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { clearSessionForQr, createGuestQrComplaint, getQrNotices, resolveHouseholdQr, type QrNotice } from '../lib/backend'

type HouseholdInfo = { building: number; unit: number; registered: boolean }
type QrView = 'menu' | 'complaint' | 'notices'

const categories = ['시설', '전기', '청소', '주차', '경비', '조경', '소음', '기타']

export default function QrComplaintPage() {
  const { qrCode = '' } = useParams()
  const [household, setHousehold] = useState<HouseholdInfo | null>(null)
  const [view, setView] = useState<QrView>('menu')
  const [notices, setNotices] = useState<QrNotice[]>([])
  const [selectedNotice, setSelectedNotice] = useState<QrNotice | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [complaintId, setComplaintId] = useState<number | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const previewUrl = useMemo(() => imageFile ? URL.createObjectURL(imageFile) : '', [imageFile])

  useEffect(() => {
    let active = true
    const prepareQrSession = async () => {
      try {
        await clearSessionForQr()
        const result = await resolveHouseholdQr(qrCode)
        if (active) setHousehold(result)
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'QR 접속을 준비하지 못했습니다.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void prepareQrSession()
    return () => { active = false }
  }, [qrCode])

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])

  async function openNotices() {
    setSubmitting(true)
    setError('')
    try {
      const result = await getQrNotices(qrCode)
      setNotices(result)
      setSelectedNotice(null)
      setView('notices')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '공고를 불러오지 못했습니다.')
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
      const id = await createGuestQrComplaint(qrCode, complaintInput)
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

        {household && view === 'menu' && complaintId === null && (
          <>
            <div className="qr-household-badge"><strong>{household.building}동 {household.unit}호</strong><span>세대 전용 QR</span></div>
            <h1>이용할 메뉴를 선택하세요.</h1>
            <p className="lead">세대 QR로 필요한 아파트 서비스를 빠르게 이용할 수 있습니다.</p>
            <div className="qr-service-menu">
              <button className="qr-service-item" type="button" onClick={() => { setError(''); setView('complaint') }}><span className="qr-service-icon">!</span><span><strong>민원접수</strong><small>불편사항을 바로 접수합니다.</small></span><b>›</b></button>
              <button className="qr-service-item" type="button" onClick={openNotices} disabled={submitting}><span className="qr-service-icon">▣</span><span><strong>공고 보기</strong><small>관리소와 단지의 공고를 확인합니다.</small></span><b>›</b></button>
              <button className="qr-service-item is-preparing" type="button" disabled><span className="qr-service-icon">₩</span><span><strong>관리비 보기</strong><small>현재 서비스 준비중입니다.</small></span><em>준비중</em></button>
              <button className="qr-service-item is-preparing" type="button" disabled><span className="qr-service-icon">i</span><span><strong>아파트 생활 가이드</strong><small>새로운 생활 안내를 준비하고 있습니다.</small></span><em>준비중</em></button>
            </div>
            {error && <div className="qr-error" role="alert">{error}</div>}
            <a className="btn btn-secondary btn-block qr-normal-login" href="/login">입주민 로그인</a>
          </>
        )}

        {household && view === 'complaint' && complaintId === null && (
          <>
            <div className="qr-household-badge"><strong>{household.building}동 {household.unit}호</strong><span>QR 간편접수</span></div>
            <h1>민원 내용을 작성하세요.</h1>
            <p className="lead">가입 여부와 관계없이 바로 접수됩니다. 처리현황 확인과 추가 의견 작성은 입주민 로그인 후 이용할 수 있습니다.</p>
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
            <button className="btn btn-secondary btn-block qr-normal-login" type="button" onClick={() => setView('menu')}>메뉴로 돌아가기</button>
          </>
        )}

        {household && view === 'notices' && complaintId === null && (
          <>
            <div className="qr-household-badge"><strong>{household.building}동 {household.unit}호</strong><span>아파트 공고</span></div>
            {selectedNotice ? (
              <article className="qr-notice-detail">
                <button className="qr-back-link" type="button" onClick={() => setSelectedNotice(null)}>‹ 공고 목록</button>
                <div className="qr-notice-meta"><span>{selectedNotice.category}</span><time>{selectedNotice.date}</time></div>
                <h1>{selectedNotice.title}</h1>
                {selectedNotice.image && <img src={selectedNotice.image} alt={`${selectedNotice.title} 공고 이미지`} />}
                <p>{selectedNotice.body}</p>
              </article>
            ) : (
              <>
                <h1>아파트 공고</h1>
                <p className="lead">관리소·입대의·선관위의 최신 소식입니다.</p>
                <div className="qr-notice-list">
                  {notices.length ? notices.map((notice) => (
                    <button type="button" key={notice.id} onClick={() => setSelectedNotice(notice)}>
                      <span><em>{notice.category}</em>{notice.pinned && <b>중요</b>}</span>
                      <strong>{notice.title}</strong><time>{notice.date}</time>
                    </button>
                  )) : <div className="empty-state"><strong>등록된 공고가 없습니다.</strong></div>}
                </div>
                <button className="btn btn-secondary btn-block qr-normal-login" type="button" onClick={() => setView('menu')}>메뉴로 돌아가기</button>
              </>
            )}
          </>
        )}

        {household && complaintId !== null && (
          <div className="qr-success">
            <div className="qr-success-icon">✓</div><h1>민원이 접수되었습니다.</h1><p>민원번호 <strong>#{complaintId}</strong></p>
            <div className="demo-box">접수현황을 확인하려면 입주민 로그인이 필요합니다. 미가입 세대는 회원가입과 관리자 승인 후 확인할 수 있습니다.</div>
            <a className="btn btn-primary btn-block qr-normal-login" href={household.registered ? '/login' : '/register'}>{household.registered ? '입주민 로그인' : '회원가입'}</a>
            <button className="btn btn-secondary btn-block qr-normal-login" type="button" onClick={() => { setComplaintId(null); setView('menu') }}>메뉴로 돌아가기</button>
          </div>
        )}
      </section>
    </main>
  )
}
