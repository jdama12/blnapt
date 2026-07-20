/* eslint-disable @typescript-eslint/ban-ts-comment */
// The prototype currently uses imperative DOM rendering. Keeping it in a mounted
// module preserves all interactions while screens can be migrated incrementally.
// @ts-nocheck

import type { AppRoute } from './routes'
import { addComplaintComment, approveUser, createComplaint, createNotice, fetchAppState, getSessionUser, rejectRegistration, signIn, signInAdmin, signOut, signUp, updateComplaintStatus, updateProfile } from './lib/backend'
import { isSupabaseConfigured } from './lib/supabase'

export function mountApartmentPrototype(
  appRoot: HTMLElement,
  modalRootElement: HTMLElement,
  initialRoute: AppRoute,
  onNavigate: (route: AppRoute, options?: { replace?: boolean }) => void,
) {
      const STATUS = {
        pending: { label: "접수대기", className: "status-pending", progress: 20 },
        received: { label: "접수완료", className: "status-received", progress: 45 },
        progress: { label: "처리중", className: "status-progress", progress: 72 },
        complete: { label: "처리완료", className: "status-complete", progress: 100 }
      };
  
      const emptyState = { currentUserId: null, users: [], households: [], registrationRequests: [], complaints: [], notices: [], fees: [], income: [] };
      let state = structuredClone(emptyState);
      let loading = true;
      let loadError = "";
      let disposed = false;
      let currentRoute = initialRoute;
      let authTab = "login";
      let complaintFilter = "current";
      let complaintSearch = "";
      let complaintStatusFilter = "all";
      let noticeCategory = "전체";
      let feeTab = "fee";
      let householdBuildingFilter = "all";
  
      const app = appRoot;
      const modalRoot = modalRootElement;
  
      function currentUser() {
        return state.users.find(u => u.id === state.currentUserId) || null;
      }
      function userById(id) {
        return state.users.find(u => u.id === id) || { name: "알 수 없음", building: "-", unit: "-", role: "resident" };
      }
      function fmtNumber(n) {
        return Number(n).toLocaleString("ko-KR");
      }
      function fmtDate(dateString) {
        const d = new Date(dateString.replace(" ", "T"));
        if (Number.isNaN(d.getTime())) return dateString;
        return `${d.getMonth()+1}월 ${d.getDate()}일`;
      }
      function escapeHtml(value="") {
        return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
      }
      function toast(message) {
        const el = document.getElementById("toast");
        el.textContent = message;
        el.classList.add("show");
        clearTimeout(window.__toastTimer);
        window.__toastTimer = setTimeout(() => el.classList.remove("show"), 2300);
      }
      async function refreshState() {
        state = await fetchAppState();
        if (!disposed) render();
      }
      function handleError(error, fallback="요청을 처리하지 못했습니다.") {
        console.error(error);
        toast(error?.message || fallback);
      }
      async function bootstrap() {
        if (!isSupabaseConfigured) {
          loading = false;
          loadError = "Supabase 환경변수가 설정되지 않았습니다.";
          render();
          return;
        }
        try {
          const sessionUser = await getSessionUser();
          if (sessionUser) state = await fetchAppState();
        } catch (error) {
          loadError = error?.message || "백엔드 연결에 실패했습니다.";
        } finally {
          loading = false;
          if (!disposed) render();
        }
      }
      function navigate(route) {
        currentRoute = route;
        window.scrollTo({ top: 0, behavior: "smooth" });
        render();
        onNavigate(route);
      }
  
      function statusBadge(status) {
        const s = STATUS[status] || STATUS.pending;
        return `<span class="status-pill ${s.className}">${s.label}</span>`;
      }
  
      function render() {
        if (loading) {
          app.innerHTML = `<div class="loading-state"><div class="spinner"></div><b>데이터를 불러오는 중입니다.</b></div>`;
          return;
        }
        if (loadError) {
          app.innerHTML = `<section class="auth-wrap"><div class="auth-panel" style="grid-column:1/-1"><div class="auth-card"><h2>백엔드 연결 설정 필요</h2><p class="lead">${escapeHtml(loadError)}</p><div class="demo-box"><code>VITE_SUPABASE_URL</code><br/><code>VITE_SUPABASE_PUBLISHABLE_KEY</code><p style="margin-top:10px">로컬은 <b>.env.local</b>, Vercel은 프로젝트 환경변수에 등록하세요.</p></div></div></div></section>`;
          return;
        }
        const user = currentUser();
        if (!user) {
          renderAuth();
          return;
        }
        app.innerHTML = `
          <div class="main-layout">
            ${renderSidebar(user)}
            <div class="content-wrap">
              ${renderTopbar(user)}
              ${renderMobileTopbar(user)}
              <main class="content">
                ${renderRoute(user)}
              </main>
            </div>
            ${renderBottomNav()}
          </div>
        `;
        bindGlobalEvents();
      }
  
      function renderAuth() {
        const adminMode = currentRoute === "adminLogin";
        app.innerHTML = `
          <section class="auth-wrap">
            <div class="auth-visual">
              <div class="brand-lockup">
                <div class="brand-mark">APT</div>
                <div>
                  <div class="brand-title">보라매롯데낙천대 아파트 생활지원</div>
                  <div class="brand-sub">민원 · 공고 · 관리비를 한곳에서</div>
                </div>
              </div>
              <div class="hero-copy">
                <h1>입주민과 관리사무소를<br/>더 빠르게 연결합니다.</h1>
                <p>민원 접수부터 처리 과정, 아파트 공고와 관리비 내역까지 PC와 모바일에서 편리하게 확인하세요.</p>
                <div class="hero-points">
                  <div class="hero-point"><div class="hero-icon">✓</div><div><b>실시간 민원 처리현황</b><br><span class="muted">댓글과 상태변경 이력을 한눈에 확인</span></div></div>
                  <div class="hero-point"><div class="hero-icon">▣</div><div><b>아파트 공고 통합</b><br><span class="muted">관리소·입대의·선관위·공문 통합관리</span></div></div>
                  <div class="hero-point"><div class="hero-icon">₩</div><div><b>월별 관리비·수입 비교</b><br><span class="muted">전월 증감과 세부항목을 쉽게 비교</span></div></div>
                </div>
              </div>
              <div class="muted">반응형 웹 · 하이브리드 앱 확장 고려 프로토타입</div>
            </div>
            <div class="auth-panel">
              <div class="auth-card">
                <div class="brand-lockup" style="margin-bottom:22px;">
                  <div class="brand-mark">APT</div>
                  <div>
                    <div class="brand-title">${adminMode ? '보라매롯데낙천대 관리사무소' : '보라매롯데낙천대 아파트 생활지원'}</div>
                    <div class="brand-sub">${adminMode ? '관리자 전용 시스템' : '입주민 생활지원 서비스'}</div>
                  </div>
                </div>
                ${adminMode ? '' : `
                  <div class="auth-tabs">
                    <button class="auth-tab ${authTab === "login" ? "active" : ""}" data-auth-tab="login">로그인</button>
                    <button class="auth-tab ${authTab === "register" ? "active" : ""}" data-auth-tab="register">회원가입</button>
                  </div>
                `}
                ${adminMode ? renderAdminLoginForm() : (authTab === "login" ? renderLoginForm() : renderRegisterForm())}
              </div>
            </div>
          </section>
        `;
        document.querySelectorAll("[data-auth-tab]").forEach(btn => {
          btn.addEventListener("click", () => {
            authTab = btn.dataset.authTab;
            renderAuth();
          });
        });
        if (adminMode) bindAdminLogin();
        else if (authTab === "login") bindLogin();
        else bindRegister();
      }
  
      function renderLoginForm() {
        return `
          <h2>로그인</h2>
          <p class="lead">승인된 세대 정보와 비밀번호를 입력하세요.</p>
          <form id="loginForm">
            <div class="field-row">
              <div class="field">
                <label>동</label>
                <input class="control" id="loginBuilding" inputmode="numeric" maxlength="3" placeholder="예: 101" required />
              </div>
              <div class="field">
                <label>호수</label>
                <input class="control" id="loginUnit" inputmode="numeric" maxlength="4" placeholder="예: 101" required />
              </div>
            </div>
            <div class="field">
              <label>전화번호 뒤 4자리</label>
              <input class="control" id="loginPhoneLast4" inputmode="numeric" autocomplete="tel-national" minlength="4" maxlength="4" placeholder="예: 1234" required />
            </div>
            <div class="field">
              <label>비밀번호</label>
              <input class="control" type="password" id="loginPassword" autocomplete="current-password" placeholder="비밀번호" required />
            </div>
            <button class="btn btn-primary btn-block" type="submit">로그인</button>
          </form>
          <div class="demo-box">비밀번호 분실 또는 입주민 변경은 관리사무소 확인 후 새 가입 요청으로 처리됩니다.</div>
          <button class="btn btn-secondary btn-block" type="button" id="goAdminLogin" style="margin-top:12px;">관리자 로그인</button>
        `;
      }

      function renderAdminLoginForm() {
        return `
          <h2>관리자 로그인</h2>
          <p class="lead">관리사무소에 등록된 관리자 계정으로 로그인하세요.</p>
          <form id="adminLoginForm">
            <div class="field">
              <label>관리자 이메일</label>
              <input class="control" type="email" id="adminEmail" autocomplete="username" placeholder="admin@example.com" required />
            </div>
            <div class="field">
              <label>비밀번호</label>
              <input class="control" type="password" id="adminPassword" autocomplete="current-password" placeholder="비밀번호" required />
            </div>
            <button class="btn btn-primary btn-block" type="submit">관리자 로그인</button>
          </form>
          <button class="btn btn-secondary btn-block" type="button" id="goResidentLogin" style="margin-top:12px;">입주민 로그인으로 돌아가기</button>
        `;
      }
  
      function renderRegisterForm() {
        return `
          <h2>가입 요청</h2>
          <p class="lead">전입카드 확인 후 관리자가 승인합니다.</p>
          <form id="registerForm">
            <div class="field-row">
              <div class="field">
                <label>동</label>
                <input class="control" id="regBuilding" inputmode="numeric" maxlength="3" placeholder="예: 101" required />
              </div>
              <div class="field">
                <label>호수</label>
                <input class="control" id="regUnit" inputmode="numeric" maxlength="4" placeholder="예: 101" required />
              </div>
            </div>
            <div class="field">
              <label>전화번호</label>
              <input class="control" id="regPhone" inputmode="tel" autocomplete="tel-national" minlength="10" maxlength="13" placeholder="예: 010-1234-5678" required />
            </div>
            <div class="field-row">
              <div class="field">
                <label>비밀번호</label>
                <input class="control" type="password" id="regPassword" minlength="8" maxlength="72" autocomplete="new-password" placeholder="8자 이상" required />
              </div>
              <div class="field">
                <label>비밀번호 확인</label>
                <input class="control" type="password" id="regPassword2" minlength="8" maxlength="72" autocomplete="new-password" placeholder="다시 입력" required />
              </div>
            </div>
            <button class="btn btn-primary btn-block" type="submit">가입 승인 요청</button>
          </form>
          <div class="demo-box">이미 입주민이 등록된 세대는 관리자 화면에 <b>입주민 변경</b> 요청으로 표시됩니다.</div>
        `;
      }
  
      function bindLogin() {
        document.getElementById("goAdminLogin").addEventListener("click", () => navigate("adminLogin"));
        document.getElementById("loginForm").addEventListener("submit", async e => {
          e.preventDefault();
          const submitButton = e.submitter;
          submitButton.disabled = true;
          const input = {
            building: document.getElementById("loginBuilding").value.replace(/\D/g, ""),
            unit: document.getElementById("loginUnit").value.replace(/\D/g, ""),
            phoneLast4: document.getElementById("loginPhoneLast4").value.replace(/\D/g, ""),
            password: document.getElementById("loginPassword").value,
          };
          try {
            const profile = await signIn(input);
            await refreshState();
            navigate("dashboard");
            toast(`${profile.name}님, 환영합니다.`);
          } catch (error) {
            handleError(error, "로그인 정보가 일치하지 않습니다.");
            submitButton.disabled = false;
          }
        });
      }

      function bindAdminLogin() {
        document.getElementById("goResidentLogin").addEventListener("click", () => navigate("login"));
        document.getElementById("adminLoginForm").addEventListener("submit", async e => {
          e.preventDefault();
          const submitButton = e.submitter;
          submitButton.disabled = true;
          try {
            const admin = await signInAdmin(
              document.getElementById("adminEmail").value,
              document.getElementById("adminPassword").value,
            );
            await refreshState();
            navigate("admin");
            toast(`${admin.name} 관리자님, 환영합니다.`);
          } catch (error) {
            handleError(error, "관리자 로그인 정보가 일치하지 않습니다.");
            submitButton.disabled = false;
          }
        });
      }
  
      function bindRegister() {
        document.getElementById("registerForm").addEventListener("submit", async e => {
          e.preventDefault();
          const submitButton = e.submitter;
          submitButton.disabled = true;
          const building = document.getElementById("regBuilding").value.trim();
          const unit = document.getElementById("regUnit").value.trim();
          const phone = document.getElementById("regPhone").value.replace(/\D/g, "");
          const password = document.getElementById("regPassword").value;
          const password2 = document.getElementById("regPassword2").value;
          if (password !== password2) {
            submitButton.disabled = false;
            return toast("비밀번호 확인이 일치하지 않습니다.");
          }
          try {
            await signUp({ building, unit, phone, password });
            authTab = "login";
            renderAuth();
            toast("가입 요청이 접수되었습니다. 관리자 승인을 기다려 주세요.");
          } catch (error) {
            handleError(error, "가입 요청을 처리하지 못했습니다.");
            submitButton.disabled = false;
          }
        });
      }
  
      function renderSidebar(user) {
        const navs = [
          ["dashboard", "⌂", "대시보드"],
          ["complaints", "✎", "민원"],
          ["notices", "▣", "아파트 소식"],
          ["fees", "₩", "관리비·수입"],
          ["mypage", "●", "나의 페이지"]
        ];
        if (user.role === "admin") navs.push(["admin", "⚙", "관리자"]);
        return `
          <aside class="sidebar">
            <div class="brand-lockup">
              <div class="brand-mark">APT</div>
              <div>
                <div class="brand-title">생활지원</div>
                <div class="brand-sub">보라매롯데낙천대</div>
              </div>
            </div>
            <nav class="nav-group">
              ${navs.map(([route, icon, label]) => `
                <button class="nav-item ${currentRoute === route ? "active" : ""}" data-route="${route}">
                  <span class="nav-icon">${icon}</span>${label}
                </button>
              `).join("")}
            </nav>
            <div class="sidebar-bottom">
              <div class="profile-mini">
                <div class="avatar">${escapeHtml(user.name.slice(0,1))}</div>
                <div>
                  <strong>${escapeHtml(user.name)}</strong>
                  <span>${user.role === "admin" ? "관리자" : `${escapeHtml(user.building)}동 ${escapeHtml(user.unit)}호`}</span>
                </div>
              </div>
              <button class="nav-item" id="logoutBtn"><span class="nav-icon">↪</span>로그아웃</button>
            </div>
          </aside>
        `;
      }
  
      function renderTopbar(user) {
        return `
          <header class="topbar">
            <h1>${routeTitle()}</h1>
            <div class="topbar-right">
              <button class="icon-btn" title="알림">🔔<span class="notification-dot"></span></button>
              <div class="avatar">${escapeHtml(user.name.slice(0,1))}</div>
            </div>
          </header>
        `;
      }
  
      function renderMobileTopbar(user) {
        return `
          <header class="mobile-topbar">
            <div class="brand-lockup">
              <div class="brand-mark">APT</div>
              <div><div class="brand-title">${routeTitle()}</div></div>
            </div>
            <button class="icon-btn" id="mobileProfileBtn">${escapeHtml(user.name.slice(0,1))}</button>
          </header>
        `;
      }
  
      function renderBottomNav() {
        const navs = [
          ["dashboard", "⌂", "홈"],
          ["complaints", "✎", "민원"],
          ["notices", "▣", "소식"],
          ["fees", "₩", "관리비"],
          ["mypage", "●", "MY"]
        ];
        return `
          <nav class="bottom-nav">
            ${navs.map(([route, icon, label]) => `
              <button class="${currentRoute === route || (currentRoute === "admin" && route === "mypage") ? "active" : ""}" data-route="${route}">
                <span class="nav-icon">${icon}</span><span>${label}</span>
              </button>
            `).join("")}
          </nav>
        `;
      }
  
      function routeTitle() {
        return ({
          dashboard: "대시보드", complaints: "민원", notices: "아파트 소식",
          fees: "관리비·수입", mypage: "나의 페이지", admin: "관리자"
        })[currentRoute] || "대시보드";
      }
  
      function renderRoute(user) {
        switch (currentRoute) {
          case "complaints": return renderComplaints(user);
          case "notices": return renderNotices(user);
          case "fees": return renderFees(user);
          case "mypage": return renderMyPage(user);
          case "admin": return user.role === "admin" ? renderAdmin(user) : renderDashboard(user);
          default: return renderDashboard(user);
        }
      }
  
      function bindGlobalEvents() {
        document.querySelectorAll("[data-route]").forEach(btn => btn.addEventListener("click", () => navigate(btn.dataset.route)));
        const logout = document.getElementById("logoutBtn");
        if (logout) logout.addEventListener("click", async () => {
          try {
            await signOut();
            state = structuredClone(emptyState);
            navigate("login");
          } catch (error) {
            handleError(error, "로그아웃하지 못했습니다.");
          }
        });
        const mobileProfileBtn = document.getElementById("mobileProfileBtn");
        if (mobileProfileBtn) mobileProfileBtn.addEventListener("click", () => navigate(currentUser().role === "admin" ? "admin" : "mypage"));
        bindRouteEvents();
      }
  
      function renderDashboard(user) {
        const all = user.role === "admin" ? state.complaints : state.complaints.filter(c => c.authorId === user.id);
        const active = all.filter(c => c.status !== "complete");
        const complete = all.filter(c => c.status === "complete");
        const pendingUsers = state.registrationRequests.length;
        const latestFee = state.fees[0];
        return `
          <div class="page-head">
            <div>
              <h2>${escapeHtml(user.name)}님, 안녕하세요.</h2>
              <p>${user.role === "admin" ? "오늘 처리해야 할 민원과 승인 요청을 확인하세요." : `${escapeHtml(user.building)}동 ${escapeHtml(user.unit)}호 생활정보를 확인하세요.`}</p>
            </div>
            <button class="btn btn-primary" id="newComplaintBtn">＋ 민원 작성</button>
          </div>
  
          ${user.role === "admin" ? `
            <div class="admin-banner">
              <div>
                <h3>관리자 업무 알림</h3>
                <p>가입 승인 ${pendingUsers}건, 접수대기 ${all.filter(c=>c.status==="pending").length}건이 있습니다.</p>
              </div>
              <button class="btn btn-outline" data-route="admin">관리자 화면</button>
            </div>
          ` : ""}
  
          <div class="grid grid-4" style="margin-bottom:18px;">
            <div class="card metric">
              <div class="label">진행 중 민원</div><div class="value">${active.length}</div>
              <div class="sub">접수부터 처리중까지</div><div class="metric-icon">✎</div>
            </div>
            <div class="card metric">
              <div class="label">처리 완료</div><div class="value">${complete.length}</div>
              <div class="sub">누적 처리 완료 건수</div><div class="metric-icon">✓</div>
            </div>
            <div class="card metric">
              <div class="label">새 공고</div><div class="value">${state.notices.filter(n=>n.pinned).length}</div>
              <div class="sub">중요 공고 기준</div><div class="metric-icon">▣</div>
            </div>
            <div class="card metric">
              <div class="label">${latestFee ? `${escapeHtml(latestFee.month)} 관리비` : "최근 관리비"}</div><div class="value" style="font-size:26px;">${latestFee ? `${fmtNumber(latestFee.total)}원` : "미등록"}</div>
              <div class="sub">${latestFee ? (latestFee.total > latestFee.previous ? "전월 대비 증가" : "전월 대비 감소") : "관리비 데이터가 없습니다."}</div><div class="metric-icon">₩</div>
            </div>
          </div>
  
          <div class="grid dashboard-main">
            <section class="card">
              <div class="section-title">
                <div><h3>${user.role === "admin" ? "최근 민원" : "나의 민원 처리현황"}</h3><p>상태와 최근 처리내용을 확인하세요.</p></div>
                <button class="btn btn-secondary btn-sm" data-route="complaints">전체보기</button>
              </div>
              <div class="card-body">
                <div class="complaint-list">
                  ${all.length ? all.slice().sort((a,b)=>b.id-a.id).slice(0,4).map(renderComplaintItem).join("") : renderEmpty("등록된 민원이 없습니다.")}
                </div>
              </div>
            </section>
  
            <div class="grid">
              <section class="card">
                <div class="section-title"><div><h3>빠른 메뉴</h3><p>자주 사용하는 기능입니다.</p></div></div>
                <div class="card-body">
                  <div class="quick-actions">
                    <button class="quick-action" id="quickComplaint"><div class="qa-icon">✎</div><strong>민원 작성</strong><span>사진과 위치 첨부</span></button>
                    <button class="quick-action" data-route="notices"><div class="qa-icon">▣</div><strong>공고 확인</strong><span>관리소·입대의 소식</span></button>
                    <button class="quick-action" data-route="fees"><div class="qa-icon">₩</div><strong>관리비</strong><span>전월 비교·상세내역</span></button>
                    <button class="quick-action" data-route="mypage"><div class="qa-icon">●</div><strong>나의 페이지</strong><span>과거 민원·회원정보</span></button>
                  </div>
                </div>
              </section>
  
              <section class="card">
                <div class="section-title"><div><h3>최근 공고</h3><p>중요 공지부터 표시합니다.</p></div></div>
                <div class="card-body">
                  <div class="notice-list">
                    ${state.notices.length ? state.notices.slice(0,3).map(renderNoticeItem).join("") : renderEmpty("등록된 공고가 없습니다.")}
                  </div>
                </div>
              </section>
            </div>
          </div>
        `;
      }
  
      function renderComplaintItem(c) {
        const s = STATUS[c.status];
        const latest = c.comments[c.comments.length - 1];
        return `
          <article class="complaint-item" data-complaint-id="${c.id}">
            <div class="complaint-top">
              <div>
                <div class="complaint-title">${escapeHtml(c.title)}</div>
                <div class="complaint-meta">
                  <span>${escapeHtml(c.category)}</span><span>${escapeHtml(c.location)}</span><span>${fmtDate(c.createdAt)}</span>
                </div>
              </div>
              ${statusBadge(c.status)}
            </div>
            <p class="complaint-preview">${latest ? escapeHtml(latest.text) : escapeHtml(c.content)}</p>
            <div class="progress-track"><div class="progress-fill" style="width:${s.progress}%"></div></div>
          </article>
        `;
      }
  
      function renderComplaints(user) {
        let rows = user.role === "admin" ? state.complaints : state.complaints.filter(c => c.authorId === user.id);
        rows = rows.filter(c => complaintFilter === "current" ? c.status !== "complete" : c.status === "complete");
        if (complaintStatusFilter !== "all") rows = rows.filter(c => c.status === complaintStatusFilter);
        if (complaintSearch) {
          const q = complaintSearch.toLowerCase();
          rows = rows.filter(c => [c.title,c.location,c.content,c.category].join(" ").toLowerCase().includes(q));
        }
        rows = rows.slice().sort((a,b)=>b.id-a.id);
  
        return `
          <div class="page-head">
            <div><h2>${user.role === "admin" ? "민원 관리" : "민원 처리현황"}</h2><p>민원 접수부터 처리 완료까지 이력을 확인할 수 있습니다.</p></div>
            <button class="btn btn-primary" id="newComplaintBtn">＋ 민원 작성</button>
          </div>
  
          <div class="toolbar">
            <div class="segmented">
              <button class="seg-btn ${complaintFilter==="current"?"active":""}" data-complaint-tab="current">현재 민원</button>
              <button class="seg-btn ${complaintFilter==="past"?"active":""}" data-complaint-tab="past">과거 민원</button>
            </div>
            <div class="search-box"><span class="search-icon">⌕</span><input class="control" id="complaintSearch" value="${escapeHtml(complaintSearch)}" placeholder="민원 제목, 위치 검색" /></div>
            <select class="control" id="complaintStatusFilter">
              <option value="all">전체 상태</option>
              <option value="pending" ${complaintStatusFilter==="pending"?"selected":""}>접수대기</option>
              <option value="received" ${complaintStatusFilter==="received"?"selected":""}>접수완료</option>
              <option value="progress" ${complaintStatusFilter==="progress"?"selected":""}>처리중</option>
              <option value="complete" ${complaintStatusFilter==="complete"?"selected":""}>처리완료</option>
            </select>
          </div>
  
          <section class="card desktop-table">
            <div class="table-wrap">
              <table>
                <thead><tr><th>번호</th><th>분류</th><th>민원 제목</th>${user.role==="admin"?"<th>신청자</th>":""}<th>위치</th><th>상태</th><th>등록일</th></tr></thead>
                <tbody>
                  ${rows.length ? rows.map(c => {
                    const author = userById(c.authorId);
                    return `<tr data-complaint-id="${c.id}">
                      <td>#${c.id}</td><td><span class="category-pill">${escapeHtml(c.category)}</span></td>
                      <td><strong>${escapeHtml(c.title)}</strong></td>
                      ${user.role==="admin"?`<td>${escapeHtml(author.building)}동 ${escapeHtml(author.unit)}호<br><span class="muted">${escapeHtml(author.name)}</span></td>`:""}
                      <td>${escapeHtml(c.location)}</td><td>${statusBadge(c.status)}</td><td>${fmtDate(c.createdAt)}</td>
                    </tr>`;
                  }).join("") : `<tr><td colspan="${user.role==="admin"?7:6}">${renderEmpty("조건에 맞는 민원이 없습니다.")}</td></tr>`}
                </tbody>
              </table>
            </div>
          </section>
  
          <div class="mobile-card-list">
            ${rows.length ? rows.map(c => {
              const author = userById(c.authorId);
              return `<article class="mobile-record" data-complaint-id="${c.id}">
                <div class="row"><strong>${escapeHtml(c.title)}</strong>${statusBadge(c.status)}</div>
                <div class="row"><span class="muted">${escapeHtml(c.category)} · ${escapeHtml(c.location)}</span></div>
                ${user.role==="admin"?`<div class="row"><span>${escapeHtml(author.building)}동 ${escapeHtml(author.unit)}호 ${escapeHtml(author.name)}</span><span class="muted">${fmtDate(c.createdAt)}</span></div>`:`<div class="row"><span class="muted">#${c.id}</span><span class="muted">${fmtDate(c.createdAt)}</span></div>`}
              </article>`;
            }).join("") : renderEmpty("조건에 맞는 민원이 없습니다.")}
          </div>
        `;
      }
  
      function renderNotices() {
        const categories = ["전체","관리사무소","입주자대표회의","선거관리위원회","정부기관","기타"];
        const notices = noticeCategory === "전체" ? state.notices : state.notices.filter(n=>n.category===noticeCategory);
        return `
          <div class="page-head">
            <div><h2>아파트 소식</h2><p>관리사무소, 입주자대표회의, 선거관리위원회 및 정부기관 공문을 확인하세요.</p></div>
            ${currentUser().role==="admin"?`<button class="btn btn-primary" id="newNoticeBtn">＋ 공고 등록</button>`:""}
          </div>
          <div class="toolbar">
            <div class="segmented" style="overflow-x:auto;">
              ${categories.map(c=>`<button class="seg-btn ${noticeCategory===c?"active":""}" data-notice-category="${c}">${c}</button>`).join("")}
            </div>
          </div>
          <section class="card">
            <div class="card-body">
              <div class="notice-list">
                ${notices.length ? notices.map(renderNoticeItem).join("") : renderEmpty("등록된 공고가 없습니다.")}
              </div>
            </div>
          </section>
        `;
      }
  
      function renderNoticeItem(n) {
        const date = new Date(n.date+"T00:00:00");
        return `
          <article class="notice-item" data-notice-id="${n.id}">
            <div class="notice-date"><strong>${date.getDate()}</strong>${date.getMonth()+1}월</div>
            <div>
              <div class="notice-title">${n.pinned ? '<span class="status-pill status-pending" style="margin-right:6px;">중요</span>' : ""}${escapeHtml(n.title)}</div>
              <div class="notice-meta">${escapeHtml(n.category)} · ${escapeHtml(n.date)}</div>
            </div>
            <span>›</span>
          </article>
        `;
      }
  
      function renderFees() {
        const data = feeTab === "fee" ? state.fees : state.income;
        const title = feeTab === "fee" ? "월별 관리비 부과내역" : "월별 수입내역";
        const latest = data[0];
        if (!latest) return `
          <div class="page-head"><div><h2>관리비 · 수입</h2><p>월별 관리비 부과내역과 아파트 수입내역을 확인할 수 있습니다.</p></div></div>
          <div class="toolbar"><div class="segmented"><button class="seg-btn ${feeTab==="fee"?"active":""}" data-fee-tab="fee">관리비 부과</button><button class="seg-btn ${feeTab==="income"?"active":""}" data-fee-tab="income">수입 내역</button></div></div>
          <section class="card"><div class="card-body">${renderEmpty(`${title} 데이터가 아직 등록되지 않았습니다.`)}</div></section>`;
        const diff = latest.total - latest.previous;
        return `
          <div class="page-head">
            <div><h2>관리비·수입 내역</h2><p>월별 총액, 전월 증감 및 세부항목을 확인할 수 있습니다.</p></div>
          </div>
          <div class="toolbar">
            <div class="segmented">
              <button class="seg-btn ${feeTab==="fee"?"active":""}" data-fee-tab="fee">관리비 부과</button>
              <button class="seg-btn ${feeTab==="income"?"active":""}" data-fee-tab="income">수입 내역</button>
            </div>
          </div>
  
          <div class="fee-summary">
            <div class="card metric">
              <div class="label">${feeTab==="fee"?"최근 관리비":"최근 월 수입"}</div>
              <div class="value" style="font-size:27px;">${fmtNumber(latest.total)}원</div>
              <div class="metric-icon">₩</div>
            </div>
            <div class="card metric">
              <div class="label">전월 금액</div>
              <div class="value" style="font-size:27px;">${fmtNumber(latest.previous)}원</div>
              <div class="metric-icon">↔</div>
            </div>
            <div class="card metric">
              <div class="label">전월 대비 증감</div>
              <div class="value ${diff>0?"danger-text":"success-text"}" style="font-size:27px;">${diff>0?"+":""}${fmtNumber(diff)}원</div>
              <div class="metric-icon">${diff>0?"↑":"↓"}</div>
            </div>
          </div>
  
          <section class="card">
            <div class="section-title"><div><h3>${title}</h3><p>항목을 누르면 상세내역이 열립니다.</p></div></div>
            <div class="card-body">
              <div class="accordion">
                ${data.map((m,i)=>renderFeeAccordion(m,i)).join("")}
              </div>
            </div>
          </section>
        `;
      }
  
      function renderFeeAccordion(m, i) {
        const diff = m.total - m.previous;
        return `
          <div class="accordion-item ${i===0?"open":""}">
            <button class="accordion-head" data-accordion>
              <div>
                <div class="accordion-title">${escapeHtml(m.month.replace("-","년 "))}월</div>
                <div class="muted" style="font-size:12px;">${m.items.length}개 세부항목</div>
              </div>
              <div class="amount">${fmtNumber(m.total)}원</div>
              <div class="amount delta-col ${diff>0?"up":"down"}">${diff>0?"+":""}${fmtNumber(diff)}원</div>
              <div class="accordion-arrow">⌄</div>
            </button>
            <div class="accordion-body">
              <div class="fee-detail">
                <div class="fee-row" style="font-weight:750;background:#eef2f7;">
                  <div>항목</div><div class="amount">당월</div><div class="amount prev-col">전월</div>
                </div>
                ${m.items.map(([name, cur, prev])=>`
                  <div class="fee-row">
                    <div>${escapeHtml(name)}</div><div class="amount">${fmtNumber(cur)}원</div><div class="amount prev-col">${fmtNumber(prev)}원</div>
                  </div>
                `).join("")}
              </div>
            </div>
          </div>
        `;
      }
  
      function renderMyPage(user) {
        const mine = state.complaints.filter(c => c.authorId === user.id);
        return `
          <div class="page-head"><div><h2>나의 페이지</h2><p>회원정보와 전체 민원 이력을 확인하세요.</p></div></div>
          <section class="card profile-card" style="margin-bottom:18px;">
            <div class="avatar">${escapeHtml(user.name.slice(0,1))}</div>
            <div style="flex:1;">
              <h3>${escapeHtml(user.name)}</h3>
              <p>${escapeHtml(user.building)}동 ${escapeHtml(user.unit)}호 · ${formatPhone(user.phone)}</p>
            </div>
            <button class="btn btn-secondary btn-sm" id="editProfileBtn">정보 수정</button>
          </section>
  
          <div class="grid grid-3" style="margin-bottom:18px;">
            <div class="card metric"><div class="label">전체 민원</div><div class="value">${mine.length}</div><div class="metric-icon">✎</div></div>
            <div class="card metric"><div class="label">진행 중</div><div class="value">${mine.filter(c=>c.status!=="complete").length}</div><div class="metric-icon">…</div></div>
            <div class="card metric"><div class="label">처리 완료</div><div class="value">${mine.filter(c=>c.status==="complete").length}</div><div class="metric-icon">✓</div></div>
          </div>
  
          <section class="card">
            <div class="section-title"><div><h3>민원처리현황</h3><p>현재 및 과거 민원 전체 내역</p></div><button class="btn btn-primary btn-sm" id="newComplaintBtn">＋ 민원 작성</button></div>
            <div class="card-body">
              <div class="complaint-list">
                ${mine.length ? mine.slice().sort((a,b)=>b.id-a.id).map(renderComplaintItem).join("") : renderEmpty("등록한 민원이 없습니다.")}
              </div>
            </div>
          </section>
        `;
      }
  
      function renderAdmin() {
        const pending = state.registrationRequests;
        const complaints = state.complaints.slice().sort((a,b)=>b.id-a.id);
        const occupiedCount = state.households.filter(h => h.currentResidentId).length;
        const visibleHouseholds = householdBuildingFilter === "all"
          ? state.households
          : state.households.filter(h => h.building === householdBuildingFilter);
        return `
          <div class="page-head"><div><h2>관리자</h2><p>회원 승인과 민원 업무를 관리합니다.</p></div></div>
          <div class="grid grid-4" style="margin-bottom:18px;">
            <div class="card metric"><div class="label">전체 세대</div><div class="value">${state.households.length}</div></div>
            <div class="card metric"><div class="label">입주 등록</div><div class="value">${occupiedCount}</div></div>
            <div class="card metric"><div class="label">미등록 세대</div><div class="value">${state.households.length - occupiedCount}</div></div>
            <div class="card metric"><div class="label">입주민 변경 요청</div><div class="value">${pending.filter(item => item.requestType === "replacement").length}</div></div>
          </div>
          <div class="grid grid-2">
            <section class="card">
              <div class="section-title"><div><h3>가입 승인 요청</h3><p>동·호수 확인 후 승인하세요.</p></div><span class="status-pill status-pending">${pending.length}건</span></div>
              <div class="card-body">
                ${pending.length ? pending.map(request => {
                  const previous = request.previousResidentId ? state.users.find(u => u.id === request.previousResidentId) : null;
                  const replacement = request.requestType === "replacement";
                  return `
                    <div class="pending-user ${replacement ? "replacement-request" : ""}">
                      <div>
                        <strong>${escapeHtml(request.building)}동 ${escapeHtml(request.unit)}호 ${replacement ? '<span class="status-pill status-high">입주민 변경</span>' : ''}</strong>
                        <span>${formatPhone(request.phone)} · ${escapeHtml(request.createdAt)}</span>
                        ${previous ? `<span>현재 입주민: ${escapeHtml(previous.name)} · ${formatPhone(previous.phone)}</span>` : ''}
                      </div>
                      <div class="pending-actions">
                        <button class="btn btn-secondary btn-sm" data-reject-registration="${request.id}">거절</button>
                        <button class="btn btn-primary btn-sm" data-approve-registration="${request.id}">승인</button>
                      </div>
                    </div>
                  `;
                }).join("") : renderEmpty("승인 대기 중인 가입 요청이 없습니다.")}
              </div>
            </section>
  
            <section class="card">
              <div class="section-title"><div><h3>민원 처리 요약</h3><p>현재 상태별 민원 건수</p></div></div>
              <div class="card-body">
                <div class="grid grid-2">
                  ${Object.entries(STATUS).map(([key,s])=>`
                    <div class="metric" style="border:1px solid var(--line);border-radius:15px;">
                      <div class="label">${s.label}</div><div class="value">${complaints.filter(c=>c.status===key).length}</div>
                    </div>
                  `).join("")}
                </div>
              </div>
            </section>
          </div>

          <section class="card" style="margin-top:18px;">
            <div class="section-title">
              <div><h3>동·호수별 세대 현황</h3><p>엑셀 원본 기준 734세대의 현재 입주 상태</p></div>
              <select class="control compact-select" id="householdBuildingFilter">
                <option value="all" ${householdBuildingFilter === "all" ? "selected" : ""}>전체 동</option>
                ${["101","102","103","104","105","106","107"].map(building => `<option value="${building}" ${householdBuildingFilter === building ? "selected" : ""}>${building}동</option>`).join("")}
              </select>
            </div>
            <div class="table-wrap">
              <table>
                <thead><tr><th>동</th><th>호수</th><th>공급면적</th><th>입주 상태</th><th>현재 입주민</th></tr></thead>
                <tbody>
                  ${visibleHouseholds.map(household => {
                    const resident = household.currentResidentId ? state.users.find(user => user.id === household.currentResidentId) : null;
                    const waiting = pending.some(request => request.householdId === household.id);
                    return `<tr>
                      <td>${escapeHtml(household.building)}동</td>
                      <td><strong>${escapeHtml(household.unit)}호</strong></td>
                      <td>${household.area.toFixed(2)}㎡</td>
                      <td>${resident ? '<span class="status-pill status-complete">입주 등록</span>' : waiting ? '<span class="status-pill status-pending">승인 대기</span>' : '<span class="status-pill">미등록</span>'}</td>
                      <td>${resident ? `${escapeHtml(resident.name)} · ${formatPhone(resident.phone)}` : '-'}</td>
                    </tr>`;
                  }).join("")}
                </tbody>
              </table>
            </div>
          </section>

          <section class="card" style="margin-top:18px;">
            <div class="section-title"><div><h3>최근 민원 관리</h3><p>민원을 선택해 상태와 처리내용을 변경하세요.</p></div><button class="btn btn-primary btn-sm" id="newComplaintBtn">＋ 관리자 민원 등록</button></div>
            <div class="card-body">
              <div class="complaint-list">${complaints.map(renderComplaintItem).join("")}</div>
            </div>
          </section>
        `;
      }
  
      function renderEmpty(message) {
        return `<div class="empty-state"><div class="empty-icon">○</div>${escapeHtml(message)}</div>`;
      }
      function formatPhone(phone) {
        if (phone?.length === 4) return `뒤 4자리 ${phone}`;
        if (!phone || phone.length !== 11) return phone;
        return `${phone.slice(0,3)}-${phone.slice(3,7)}-${phone.slice(7)}`;
      }
  
      function bindRouteEvents() {
        document.querySelectorAll("[data-complaint-id]").forEach(el => {
          el.addEventListener("click", () => openComplaintDetail(Number(el.dataset.complaintId)));
        });
        document.querySelectorAll("[data-notice-id]").forEach(el => {
          el.addEventListener("click", () => openNotice(Number(el.dataset.noticeId)));
        });
        document.querySelectorAll("[data-complaint-tab]").forEach(btn => {
          btn.addEventListener("click", () => { complaintFilter = btn.dataset.complaintTab; render(); });
        });
        const search = document.getElementById("complaintSearch");
        if (search) search.addEventListener("input", e => { complaintSearch = e.target.value; render(); });
        const statusFilter = document.getElementById("complaintStatusFilter");
        if (statusFilter) statusFilter.addEventListener("change", e => { complaintStatusFilter = e.target.value; render(); });
        document.querySelectorAll("[data-notice-category]").forEach(btn => {
          btn.addEventListener("click", () => { noticeCategory = btn.dataset.noticeCategory; render(); });
        });
        document.querySelectorAll("[data-fee-tab]").forEach(btn => {
          btn.addEventListener("click", () => { feeTab = btn.dataset.feeTab; render(); });
        });
        document.querySelectorAll("[data-accordion]").forEach(btn => {
          btn.addEventListener("click", () => btn.closest(".accordion-item").classList.toggle("open"));
        });
        const newComplaintBtn = document.getElementById("newComplaintBtn");
        if (newComplaintBtn) newComplaintBtn.addEventListener("click", openComplaintForm);
        const quickComplaint = document.getElementById("quickComplaint");
        if (quickComplaint) quickComplaint.addEventListener("click", openComplaintForm);
        const newNoticeBtn = document.getElementById("newNoticeBtn");
        if (newNoticeBtn) newNoticeBtn.addEventListener("click", openNoticeForm);
        const editProfileBtn = document.getElementById("editProfileBtn");
        if (editProfileBtn) editProfileBtn.addEventListener("click", openProfileForm);
        const householdFilter = document.getElementById("householdBuildingFilter");
        if (householdFilter) householdFilter.addEventListener("change", e => {
          householdBuildingFilter = e.target.value;
          render();
        });
        document.querySelectorAll("[data-approve-registration]").forEach(btn => {
          btn.addEventListener("click", async e => {
            e.stopPropagation();
            const request = state.registrationRequests.find(item => String(item.id) === btn.dataset.approveRegistration);
            if (!request) return;
            const replacement = request.requestType === "replacement";
            if (replacement && !window.confirm(`${request.building}동 ${request.unit}호의 기존 입주민을 종료하고 새 입주민으로 교체할까요?`)) return;
            try {
              await approveUser(request.id);
              await refreshState();
              toast(`${request.building}동 ${request.unit}호 ${replacement ? "입주민을 교체했습니다." : "가입을 승인했습니다."}`);
            } catch (error) {
              handleError(error, "가입 승인을 처리하지 못했습니다.");
            }
          });
        });
        document.querySelectorAll("[data-reject-registration]").forEach(btn => {
          btn.addEventListener("click", async e => {
            e.stopPropagation();
            const request = state.registrationRequests.find(item => String(item.id) === btn.dataset.rejectRegistration);
            if (!request || !window.confirm(`${request.building}동 ${request.unit}호의 가입 요청을 거절할까요?`)) return;
            try {
              await rejectRegistration(request.id);
              await refreshState();
              toast("가입 요청을 거절했습니다.");
            } catch (error) {
              handleError(error, "가입 거절을 처리하지 못했습니다.");
            }
          });
        });
      }
  
      function modal(content, large=false) {
        modalRoot.innerHTML = `<div class="modal-backdrop" id="modalBackdrop"><div class="modal ${large?"modal-lg":""}">${content}</div></div>`;
        const backdrop = document.getElementById("modalBackdrop");
        backdrop.addEventListener("click", e => { if (e.target === backdrop) closeModal(); });
        modalRoot.querySelectorAll("[data-close-modal]").forEach(btn=>btn.addEventListener("click", closeModal));
      }
      function closeModal() { modalRoot.innerHTML = ""; }
  
      function openComplaintForm() {
        const user = currentUser();
        modal(`
          <div class="modal-head"><h3>새 민원 작성</h3><button class="close-btn" data-close-modal>✕</button></div>
          <form id="complaintForm">
            <div class="modal-body">
              <div class="field-row">
                <div class="field"><label>신청자</label><input class="control" value="${escapeHtml(user.role==="admin"?"관리자 등록":`${user.building}동 ${user.unit}호 ${user.name}`)}" disabled /></div>
                <div class="field"><label>민원 분류</label>
                  <select class="control" id="compCategory" required>
                    <option>시설</option><option>전기</option><option>청소</option><option>주차</option><option>경비</option><option>조경</option><option>소음</option><option>기타</option>
                  </select>
                </div>
              </div>
              <div class="field"><label>민원 제목</label><input class="control" id="compTitle" placeholder="민원 내용을 한 줄로 입력하세요." required /></div>
              <div class="field"><label>위치</label><input class="control" id="compLocation" placeholder="예: 102동 17층 복도, 지하 2층 B-23 부근" required /></div>
              <div class="field"><label>상세 내용</label><textarea class="control" id="compContent" placeholder="발생 시점과 현재 상태를 자세히 작성해 주세요." required></textarea></div>
              <div class="field">
                <label>사진 첨부</label>
                <label class="upload-box" for="compImage">
                  <div style="font-size:28px;">▧</div>
                  <strong>사진 선택</strong>
                  <div class="muted" style="font-size:12px;">JPG, PNG 이미지 미리보기 지원</div>
                  <input type="file" id="compImage" accept="image/*" hidden />
                </label>
                <div class="upload-preview" id="uploadPreview"><img id="uploadPreviewImg" alt="첨부 이미지 미리보기" /></div>
              </div>
              ${user.role==="admin"?`
                <div class="field"><label>대상 세대</label><select class="control" id="compAuthor">${state.users.filter(u=>u.role==="resident"&&u.approved).map(u=>`<option value="${u.id}">${u.building}동 ${u.unit}호 ${escapeHtml(u.name)}</option>`).join("")}</select></div>
              `:""}
            </div>
            <div class="modal-foot"><button type="button" class="btn btn-secondary" data-close-modal>취소</button><button type="submit" class="btn btn-primary">민원 등록</button></div>
          </form>
        `);
        let imageFile = null;
        document.getElementById("compImage").addEventListener("change", e => {
          const file = e.target.files[0];
          if (!file) return;
          imageFile = file;
          const reader = new FileReader();
          reader.onload = () => {
            document.getElementById("uploadPreviewImg").src = reader.result;
            document.getElementById("uploadPreview").style.display = "block";
          };
          reader.readAsDataURL(file);
        });
        document.getElementById("complaintForm").addEventListener("submit", async e => {
          e.preventDefault();
          const submitButton = e.submitter;
          submitButton.disabled = true;
          try {
            await createComplaint({
              authorId: user.role==="admin" ? document.getElementById("compAuthor").value : user.id,
              title: document.getElementById("compTitle").value.trim(),
              category: document.getElementById("compCategory").value,
              location: document.getElementById("compLocation").value.trim(),
              content: document.getElementById("compContent").value.trim(),
              status: user.role==="admin" ? "received" : "pending",
              file: imageFile || undefined,
            });
            await refreshState();
            closeModal();
            complaintFilter = "current";
            navigate("complaints");
            toast("민원이 등록되었습니다.");
          } catch (error) {
            handleError(error, "민원을 등록하지 못했습니다.");
            submitButton.disabled = false;
          }
        });
      }
  
      function openComplaintDetail(id) {
        const c = state.complaints.find(x=>x.id===id);
        if (!c) return;
        const user = currentUser();
        const author = userById(c.authorId);
        const canManage = user.role === "admin";
        const statusOptions = Object.entries(STATUS).map(([key,s])=>`<option value="${key}" ${c.status===key?"selected":""}>${s.label}</option>`).join("");
        modal(`
          <div class="modal-head">
            <div><h3>${escapeHtml(c.title)}</h3><div class="muted" style="font-size:12px;">민원번호 #${c.id}</div></div>
            <button class="close-btn" data-close-modal>✕</button>
          </div>
          <div class="modal-body">
            <div class="detail-layout">
              <div>
                <section class="detail-section">
                  <h4>민원 내용</h4>
                  <div class="detail-content">
                    <div class="detail-grid" style="margin-bottom:14px;">
                      <div><div class="detail-label">신청자</div><div class="detail-value">${escapeHtml(author.building)}동 ${escapeHtml(author.unit)}호 ${escapeHtml(author.name)}</div></div>
                      <div><div class="detail-label">등록일</div><div class="detail-value">${escapeHtml(c.createdAt)}</div></div>
                      <div><div class="detail-label">분류</div><div class="detail-value">${escapeHtml(c.category)}</div></div>
                      <div><div class="detail-label">위치</div><div class="detail-value">${escapeHtml(c.location)}</div></div>
                    </div>
                    <div class="detail-label">상세 내용</div>
                    <div style="white-space:pre-wrap;">${escapeHtml(c.content)}</div>
                    <div style="margin-top:14px;">
                      ${c.image ? `<div class="photo-box"><img src="${c.image}" alt="민원 첨부 사진" /></div>` : `<div class="photo-box">첨부 사진 없음</div>`}
                    </div>
                  </div>
                </section>
  
                <section class="detail-section">
                  <h4>처리내용 및 댓글</h4>
                  <div class="detail-content">
                    <div class="comments">
                      ${c.comments.length ? c.comments.map(comment => {
                        const cu = userById(comment.userId);
                        return `<div class="comment ${cu.role==="admin"?"admin":""}">
                          <div class="avatar" style="width:34px;height:34px;font-size:13px;">${escapeHtml(cu.name.slice(0,1))}</div>
                          <div class="comment-bubble">
                            <div class="comment-head"><strong>${escapeHtml(cu.name)} ${cu.role==="admin"?'<span class="status-pill status-received" style="padding:2px 6px;">관리자</span>':""}</strong><span>${escapeHtml(comment.createdAt)}</span></div>
                            <div class="comment-body">${escapeHtml(comment.text)}</div>
                          </div>
                        </div>`;
                      }).join("") : `<div class="muted" style="text-align:center;padding:18px;">아직 등록된 처리내용이나 댓글이 없습니다.</div>`}
                    </div>
                    <form class="comment-form" id="commentForm">
                      <input class="control" id="commentText" placeholder="${canManage?"처리내용을 입력하세요.":"추가 문의 또는 의견을 입력하세요."}" required />
                      <button class="btn btn-primary" type="submit">등록</button>
                    </form>
                  </div>
                </section>
              </div>
  
              <aside>
                <section class="detail-section">
                  <h4>처리 상태</h4>
                  <div class="detail-content">
                    <div style="margin-bottom:12px;">${statusBadge(c.status)}</div>
                    <div class="progress-track"><div class="progress-fill" style="width:${STATUS[c.status].progress}%"></div></div>
                    ${canManage?`
                      <div class="field" style="margin-top:15px;"><label>상태 변경</label><select class="control" id="statusSelect">${statusOptions}</select></div>
                      <button class="btn btn-primary btn-block" id="statusUpdateBtn">상태 저장</button>
                    `:""}
                  </div>
                </section>
                <section class="detail-section">
                  <h4>처리 이력</h4>
                  <div class="detail-content">
                    <div class="timeline">
                      ${c.history.slice().reverse().map(h=>`
                        <div class="timeline-item">
                          <div class="timeline-date">${escapeHtml(h.date)}</div>
                          <div class="timeline-title">${STATUS[h.status]?.label || escapeHtml(h.status)}</div>
                          <div class="timeline-desc">${escapeHtml(h.note)}</div>
                        </div>
                      `).join("")}
                    </div>
                  </div>
                </section>
              </aside>
            </div>
          </div>
        `, true);
  
        document.getElementById("commentForm").addEventListener("submit", async e => {
          e.preventDefault();
          const text = document.getElementById("commentText").value.trim();
          if (!text) return;
          try {
            await addComplaintComment(id, user.id, text);
            await refreshState();
            closeModal();
            openComplaintDetail(id);
            toast("댓글이 등록되었습니다.");
          } catch (error) {
            handleError(error, "댓글을 등록하지 못했습니다.");
          }
        });
  
        if (canManage) {
          document.getElementById("statusUpdateBtn").addEventListener("click", async () => {
            const next = document.getElementById("statusSelect").value;
            if (next === c.status) return toast("현재 상태와 동일합니다.");
            try {
              await updateComplaintStatus(id, next);
              await addComplaintComment(id, user.id, `민원 상태가 '${STATUS[next].label}'로 변경되었습니다.`);
              await refreshState();
              closeModal();
              openComplaintDetail(id);
              toast("민원 상태가 변경되었습니다.");
            } catch (error) {
              handleError(error, "민원 상태를 변경하지 못했습니다.");
            }
          });
        }
      }
  
      function openNotice(id) {
        const n = state.notices.find(x=>x.id===id);
        if (!n) return;
        modal(`
          <div class="modal-head"><div><h3>${escapeHtml(n.title)}</h3><div class="muted" style="font-size:12px;">${escapeHtml(n.category)} · ${escapeHtml(n.date)}</div></div><button class="close-btn" data-close-modal>✕</button></div>
          <div class="modal-body">
            ${n.pinned?'<span class="status-pill status-pending" style="margin-bottom:12px;">중요 공고</span>':""}
            <div style="white-space:pre-wrap;line-height:1.8;">${escapeHtml(n.body)}</div>
            <div class="photo-box" style="margin-top:20px;min-height:230px;">첨부 공고문 또는 PDF 미리보기 영역</div>
          </div>
          <div class="modal-foot"><button class="btn btn-secondary" data-close-modal>닫기</button></div>
        `);
      }
  
      function openNoticeForm() {
        modal(`
          <div class="modal-head"><h3>새 공고 등록</h3><button class="close-btn" data-close-modal>✕</button></div>
          <form id="noticeForm">
            <div class="modal-body">
              <div class="field"><label>공고 분류</label><select class="control" id="noticeCategoryInput"><option>관리사무소</option><option>입주자대표회의</option><option>선거관리위원회</option><option>정부기관</option><option>기타</option></select></div>
              <div class="field"><label>제목</label><input class="control" id="noticeTitleInput" required /></div>
              <div class="field"><label>내용</label><textarea class="control" id="noticeBodyInput" required></textarea></div>
              <label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" id="noticePinnedInput" /> 중요 공고로 표시</label>
            </div>
            <div class="modal-foot"><button class="btn btn-secondary" type="button" data-close-modal>취소</button><button class="btn btn-primary" type="submit">공고 등록</button></div>
          </form>
        `);
        document.getElementById("noticeForm").addEventListener("submit", async e => {
          e.preventDefault();
          try {
            await createNotice({
              category: document.getElementById("noticeCategoryInput").value,
              title: document.getElementById("noticeTitleInput").value.trim(),
              body: document.getElementById("noticeBodyInput").value.trim(),
              pinned: document.getElementById("noticePinnedInput").checked,
            });
            await refreshState();
            closeModal();
            toast("공고가 등록되었습니다.");
          } catch (error) {
            handleError(error, "공고를 등록하지 못했습니다.");
          }
        });
      }
  
      function openProfileForm() {
        const user = currentUser();
        modal(`
          <div class="modal-head"><h3>회원정보 수정</h3><button class="close-btn" data-close-modal>✕</button></div>
          <form id="profileForm">
            <div class="modal-body">
              <div class="field-row">
                <div class="field"><label>동</label><input class="control" value="${escapeHtml(user.building)}" disabled /></div>
                <div class="field"><label>호수</label><input class="control" value="${escapeHtml(user.unit)}" disabled /></div>
              </div>
              <div class="field"><label>전화번호 뒤 4자리</label><input class="control" value="${escapeHtml(user.phone)}" disabled /></div>
              <div class="field"><label>새 비밀번호</label><input class="control" type="password" id="profilePassword" placeholder="변경하지 않으려면 비워두세요." /></div>
            </div>
            <div class="modal-foot"><button class="btn btn-secondary" type="button" data-close-modal>취소</button><button class="btn btn-primary" type="submit">저장</button></div>
          </form>
        `);
        document.getElementById("profileForm").addEventListener("submit", async e => {
          e.preventDefault();
          try {
            await updateProfile({
              password: document.getElementById("profilePassword").value || undefined,
            });
            await refreshState();
            closeModal();
            toast("회원정보가 수정되었습니다.");
          } catch (error) {
            handleError(error, "회원정보를 수정하지 못했습니다.");
          }
        });
      }
  
      render();
      bootstrap().then(() => {
        const mountedUser = currentUser();
        const isAuthRoute = initialRoute === "login" || initialRoute === "adminLogin";
        if (!mountedUser && !isAuthRoute) {
          onNavigate("login", { replace: true });
        } else if (mountedUser && isAuthRoute) {
          onNavigate(mountedUser.role === "admin" ? "admin" : "dashboard", { replace: true });
        } else if (mountedUser?.role !== "admin" && initialRoute === "admin") {
          onNavigate("dashboard", { replace: true });
        }
      });

  return () => {
    disposed = true
    appRoot.replaceChildren()
    modalRootElement.replaceChildren()
  }
}
