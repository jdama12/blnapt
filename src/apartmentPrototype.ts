/* eslint-disable @typescript-eslint/ban-ts-comment */
// The prototype currently uses imperative DOM rendering. Keeping it in a mounted
// module preserves all interactions while screens can be migrated incrementally.
// @ts-nocheck

import type { AppRoute } from './routes'
import { addComplaintComment, addResidentCardField, approveUser, createComplaint, createNotice, deactivateResident, deleteResidentCardField, fetchAppState, getSessionUser, rejectRegistration, requestAdminPasswordReset, rotateHouseholdQr, saveResidentCard, signIn, signInAdmin, signOut, signUp, updateAdminEmail, updateAdminPassword, updateComplaintStatus, updateNotice, updateProfile, updateResidentCardField } from './lib/backend'
import { isSupabaseConfigured } from './lib/supabase'

export function mountApartmentPrototype(
  appRoot: HTMLElement,
  modalRootElement: HTMLElement,
  initialRoute: AppRoute,
  householdId: string | undefined,
  onNavigate: (route: AppRoute, options?: { replace?: boolean; householdId?: string }) => void,
) {
      const STATUS = {
        pending: { label: "접수대기", className: "status-pending", progress: 20 },
        received: { label: "접수완료", className: "status-received", progress: 45 },
        progress: { label: "처리중", className: "status-progress", progress: 72 },
        complete: { label: "처리완료", className: "status-complete", progress: 100 }
      };
  
      const emptyState = { currentUserId: null, users: [], households: [], registrationRequests: [], residentCards: [], complaints: [], notices: [], fees: [], income: [] };
      let state = structuredClone(emptyState);
      let loading = true;
      let loadError = "";
      let disposed = false;
      let currentRoute = initialRoute;
      let authTab = window.location.pathname === "/register" ? "register" : "login";
      let complaintFilter = "current";
      let complaintSearch = "";
      let complaintStatusFilter = "all";
      let noticeCategory = "전체";
      let feeTab = "fee";
      let householdBuildingFilter = "all";
      let residentUnitSearch = "";
      let residentStatusFilter = "all";
  
      const app = appRoot;
      const modalRoot = modalRootElement;
  
      function currentUser() {
        return state.users.find(u => u.id === state.currentUserId) || null;
      }
      function userById(id) {
        return state.users.find(u => u.id === id) || { name: "알 수 없음", building: "-", unit: "-", role: "resident" };
      }
      function complaintAuthor(complaint) {
        if (complaint.authorId) return userById(complaint.authorId);
        const targetHousehold = state.households.find(item => String(item.id) === String(complaint.householdId));
        return { name: "미가입 세대", building: targetHousehold?.building || "-", unit: targetHousehold?.unit || "-", role: "guest" };
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
      function navigate(route, options) {
        currentRoute = route;
        window.scrollTo({ top: 0, behavior: "smooth" });
        render();
        onNavigate(route, options);
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
        if (currentRoute === "adminResetPassword") {
          renderAdminPasswordReset();
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
            ${renderBottomNav(user)}
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
                  <div class="brand-sub">민원 · 공고 · 생활정보를 한곳에서</div>
                </div>
              </div>
              <div class="hero-copy">
                <h1>입주민과 관리사무소를<br/>더 빠르게 연결합니다.</h1>
                <p>민원 접수부터 처리 과정과 아파트 공고까지 PC와 모바일에서 편리하게 확인하세요.</p>
                <div class="hero-points">
                  <div class="hero-point"><div class="hero-icon">✓</div><div><b>실시간 민원 처리현황</b><br><span class="muted">댓글과 상태변경 이력을 한눈에 확인</span></div></div>
                  <div class="hero-point"><div class="hero-icon">▣</div><div><b>아파트 공고 통합</b><br><span class="muted">관리소·입대의·선관위·공문 통합관리</span></div></div>
                  <div class="hero-point"><div class="hero-icon">₩</div><div><b>관리비 시스템 연동 준비중</b><br><span class="muted">안정적인 제공을 위해 연동을 준비하고 있습니다.</span></div></div>
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
          <button class="btn btn-secondary btn-block" type="button" id="requestAdminPasswordReset" style="margin-top:12px;">비밀번호 재설정</button>
          <button class="btn btn-secondary btn-block" type="button" id="goResidentLogin" style="margin-top:12px;">입주민 로그인으로 돌아가기</button>
        `;
      }

      function renderAdminPasswordReset() {
        app.innerHTML = `
          <section class="auth-wrap">
            <div class="auth-visual">
              <div class="brand-lockup">
                <div class="brand-mark">APT</div>
                <div>
                  <div class="brand-title">보라매롯데낙천대 관리사무소</div>
                  <div class="brand-sub">관리자 계정 보안</div>
                </div>
              </div>
              <div class="hero-copy">
                <h1>관리자 비밀번호를<br/>안전하게 변경합니다.</h1>
                <p>관리자 이메일로 받은 재설정 링크를 통해서만 새 비밀번호를 등록할 수 있습니다.</p>
              </div>
            </div>
            <div class="auth-panel">
              <div class="auth-card">
                <h2>새 비밀번호 설정</h2>
                <p class="lead">8자 이상의 새 비밀번호를 입력하세요.</p>
                <form id="adminResetPasswordForm">
                  <div class="field">
                    <label>새 비밀번호</label>
                    <input class="control" type="password" id="newAdminPassword" minlength="8" maxlength="72" autocomplete="new-password" required />
                  </div>
                  <div class="field">
                    <label>새 비밀번호 확인</label>
                    <input class="control" type="password" id="newAdminPasswordConfirm" minlength="8" maxlength="72" autocomplete="new-password" required />
                  </div>
                  <button class="btn btn-primary btn-block" type="submit">비밀번호 변경</button>
                </form>
                <button class="btn btn-secondary btn-block" type="button" id="cancelAdminPasswordReset" style="margin-top:12px;">관리자 로그인으로 돌아가기</button>
              </div>
            </div>
          </section>
        `;
        bindAdminPasswordReset();
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
        document.getElementById("requestAdminPasswordReset").addEventListener("click", async () => {
          const emailInput = document.getElementById("adminEmail");
          const email = emailInput.value.trim();
          if (!email || !emailInput.checkValidity()) {
            emailInput.reportValidity();
            return;
          }
          const button = document.getElementById("requestAdminPasswordReset");
          button.disabled = true;
          try {
            await requestAdminPasswordReset(email, `${window.location.origin}/admin/reset-password`);
            toast("관리자 이메일로 비밀번호 재설정 링크를 보냈습니다.");
          } catch (error) {
            handleError(error, "비밀번호 재설정 메일을 보내지 못했습니다.");
          } finally {
            button.disabled = false;
          }
        });
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

      function bindAdminPasswordReset() {
        document.getElementById("cancelAdminPasswordReset").addEventListener("click", async () => {
          await signOut().catch(() => {});
          navigate("adminLogin");
        });
        document.getElementById("adminResetPasswordForm").addEventListener("submit", async e => {
          e.preventDefault();
          const submitButton = e.submitter;
          const password = document.getElementById("newAdminPassword").value;
          const passwordConfirm = document.getElementById("newAdminPasswordConfirm").value;
          if (password !== passwordConfirm) return toast("새 비밀번호가 일치하지 않습니다.");
          submitButton.disabled = true;
          try {
            await updateAdminPassword(password);
            navigate("adminLogin");
            toast("비밀번호가 변경되었습니다. 새 비밀번호로 로그인하세요.");
          } catch (error) {
            handleError(error, "관리자 비밀번호를 변경하지 못했습니다.");
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
          ["fees", "₩", user.role === "admin" ? "관리비·수입" : "관리비 (준비중)"],
          ["mypage", "●", "나의 페이지"]
        ];
        if (user.role === "admin") {
          navs.push(["admin", "⚙", "관리자"]);
          navs.push(["adminResidents", "▤", "입주민 현황"]);
        }
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
                <button class="nav-item ${currentRoute === route || (route === "adminResidents" && currentRoute === "adminResidentDetail") ? "active" : ""}" data-route="${route}">
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
  
      function renderBottomNav(user) {
        const navs = [
          ["dashboard", "⌂", "홈"],
          ["complaints", "✎", "민원"],
          ["notices", "▣", "소식"],
          ["fees", "₩", user.role === "admin" ? "관리비" : "준비중"],
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
          fees: "관리비·수입", mypage: "나의 페이지", admin: "관리자",
          adminResidents: "입주민 현황", adminResidentDetail: "입주민 상세"
        })[currentRoute] || "대시보드";
      }
  
      function renderRoute(user) {
        switch (currentRoute) {
          case "complaints": return renderComplaints(user);
          case "notices": return renderNotices(user);
          case "fees": return renderFees(user);
          case "mypage": return renderMyPage(user);
          case "admin": return user.role === "admin" ? renderAdmin(user) : renderDashboard(user);
          case "adminResidents": return user.role === "admin" ? renderAdminResidents() : renderDashboard(user);
          case "adminResidentDetail": return user.role === "admin" ? renderAdminResidentDetail() : renderDashboard(user);
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
            ${user.role === "admin" ? `
              <div class="card metric">
                <div class="label">${latestFee ? `${escapeHtml(latestFee.month)} 관리비` : "최근 관리비"}</div><div class="value" style="font-size:26px;">${latestFee ? `${fmtNumber(latestFee.total)}원` : "미등록"}</div>
                <div class="sub">${latestFee ? (latestFee.total > latestFee.previous ? "전월 대비 증가" : "전월 대비 감소") : "관리비 데이터가 없습니다."}</div><div class="metric-icon">₩</div>
              </div>
            ` : `
              <div class="card metric">
                <div class="label">관리비 조회</div><div class="value" style="font-size:23px;">연동 준비중</div>
                <div class="sub">서비스 오픈 후 안내드리겠습니다.</div><div class="metric-icon">₩</div>
              </div>
            `}
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
  
            ${user.role === "admin" ? `
              <div class="grid">
                <section class="card">
                  <div class="section-title"><div><h3>빠른 메뉴</h3><p>자주 사용하는 기능입니다.</p></div></div>
                  <div class="card-body"><div class="quick-actions">
                    <button class="quick-action" id="quickComplaint"><div class="qa-icon">✎</div><strong>민원 작성</strong><span>사진과 위치 첨부</span></button>
                    <button class="quick-action" data-route="notices"><div class="qa-icon">▣</div><strong>공고 확인</strong><span>관리소·입대의 소식</span></button>
                    <button class="quick-action" data-route="fees"><div class="qa-icon">₩</div><strong>관리비</strong><span>전월 비교·상세내역</span></button>
                    <button class="quick-action" data-route="mypage"><div class="qa-icon">●</div><strong>나의 페이지</strong><span>과거 민원·회원정보</span></button>
                  </div></div>
                </section>
                <section class="card">
                  <div class="section-title"><div><h3>최근 공고</h3><p>중요 공지부터 표시합니다.</p></div></div>
                  <div class="card-body"><div class="notice-list">${state.notices.length ? state.notices.slice(0,3).map(renderNoticeItem).join("") : renderEmpty("등록된 공고가 없습니다.")}</div></div>
                </section>
              </div>
            ` : `
              <section class="card dashboard-notice-card">
                <div class="section-title"><div><h3>최근 공고</h3><p>관리소·입대의·선관위의 최근 소식입니다.</p></div><button class="btn btn-secondary btn-sm" data-route="notices">전체보기</button></div>
                <div class="card-body"><div class="dashboard-notice-list">${state.notices.length ? state.notices.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,7).map(renderDashboardNoticeItem).join("") : renderEmpty("등록된 공고가 없습니다.")}</div></div>
              </section>
            `}
          </div>
        `;
      }

      function renderDashboardNoticeItem(notice) {
        const categoryLabel = ({
          "관리사무소": "관리소",
          "입주자대표회의": "입대의",
          "선거관리위원회": "선관위",
          "정부기관": "정부기관",
          "기타": "기타",
        })[notice.category] || notice.category;
        return `
          <article class="dashboard-notice-item" data-notice-id="${notice.id}">
            <div class="dashboard-notice-title"><span>[${escapeHtml(categoryLabel)}]</span> ${escapeHtml(notice.title)}</div>
            <div class="dashboard-notice-date">게시일 ${escapeHtml(notice.date)}</div>
          </article>
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
                    const author = complaintAuthor(c);
                    return `<tr data-complaint-id="${c.id}">
                      <td>#${c.id}</td><td><span class="category-pill">${escapeHtml(c.category)}</span>${c.source === "qr" ? '<span class="status-pill status-received" style="margin-left:6px;">QR</span>' : ''}</td>
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
              const author = complaintAuthor(c);
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
  
      function renderFees(user) {
        if (user.role !== "admin") return `
          <div class="page-head"><div><h2>관리비</h2><p>관리비 조회 시스템을 준비하고 있습니다.</p></div></div>
          <section class="card">
            <div class="card-body integration-ready-state">
              <div class="integration-ready-icon">₩</div>
              <span class="status-pill status-pending">서비스 준비중</span>
              <h3>관리비 시스템 연동을 준비하고 있습니다.</h3>
              <p>정확하고 안정적인 관리비 정보를 제공하기 위해 외부 시스템 연동 작업을 진행하고 있습니다.<br/>서비스가 준비되면 공고를 통해 안내드리겠습니다.</p>
            </div>
          </section>
        `;
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
              <div><h3>입주민 현황</h3><p>734세대의 가입 상태와 입주민 카드를 별도 페이지에서 관리합니다.</p></div>
              <button class="btn btn-primary btn-sm" data-route="adminResidents">입주민 현황 열기</button>
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

      function renderAdminResidents() {
        const pending = state.registrationRequests;
        const buildingHouseholds = householdBuildingFilter === "all"
          ? state.households
          : state.households.filter(household => household.building === householdBuildingFilter);
        const unitQuery = residentUnitSearch.replace(/\D/g, "");
        const unitFilteredHouseholds = unitQuery
          ? buildingHouseholds.filter(household => household.unit.includes(unitQuery))
          : buildingHouseholds;
        const visibleHouseholds = residentStatusFilter === "active"
          ? unitFilteredHouseholds.filter(household => household.currentResidentId)
          : unitFilteredHouseholds;
        const occupiedCount = state.households.filter(household => household.currentResidentId).length;
        return `
          <div class="page-head">
            <div><h2>입주민 현황</h2><p>동·호수별 가입 상태와 입주민 카드를 관리합니다.</p></div>
            <span class="status-pill status-complete">입주 등록 ${occupiedCount} / ${state.households.length}</span>
          </div>
          <div class="resident-list-toolbar">
            <div class="resident-building-tabs" role="tablist" aria-label="동 선택">
              ${["all", "101", "102", "103", "104", "105", "106", "107"].map(building => `
                <button class="resident-building-tab ${householdBuildingFilter === building ? "active" : ""}" data-resident-building="${building}">
                  ${building === "all" ? "전체동" : `${building}동`}
                </button>
              `).join("")}
            </div>
            <select class="control resident-status-filter" id="residentStatusFilter" aria-label="가입상태 필터">
              <option value="all" ${residentStatusFilter === "all" ? "selected" : ""}>가입상태 전체</option>
              <option value="active" ${residentStatusFilter === "active" ? "selected" : ""}>가입완료</option>
            </select>
            <form class="resident-unit-search" id="residentUnitSearchForm" role="search">
              <input class="control" id="residentUnitSearch" inputmode="numeric" maxlength="4" value="${escapeHtml(residentUnitSearch)}" placeholder="호수 검색" aria-label="호수 검색" />
              ${residentUnitSearch ? '<button class="btn btn-secondary btn-sm" type="button" id="clearResidentUnitSearch">초기화</button>' : ''}
              <button class="btn btn-primary btn-sm" type="submit">검색</button>
            </form>
          </div>
          <section class="card">
            <div class="section-title"><div><h3>${householdBuildingFilter === "all" ? "전체 입주민 목록" : `${householdBuildingFilter}동 입주민 목록`}</h3><p>${residentStatusFilter === "active" || unitQuery ? `${residentStatusFilter === "active" ? "가입완료" : ""}${residentStatusFilter === "active" && unitQuery ? " · " : ""}${unitQuery ? `${escapeHtml(unitQuery)}호` : ""} 검색 결과` : "세대를 선택하면 가입상태와 상세 정보로 이동합니다."}</p></div><strong>${visibleHouseholds.length}세대</strong></div>
            <div class="table-wrap">
              <table>
                <thead><tr><th>동</th><th>호수</th><th>전화번호 뒷자리</th><th>전입일</th><th>가입상태</th><th>QR</th></tr></thead>
                <tbody>
                  ${visibleHouseholds.length ? visibleHouseholds.map(household => {
                    const resident = household.currentResidentId ? state.users.find(user => user.id === household.currentResidentId) : null;
                    const waiting = pending.find(request => request.householdId === household.id);
                    const card = resident ? state.residentCards.find(item => item.residentId === resident.id) : null;
                    const status = resident
                      ? '<span class="status-pill status-complete">가입완료</span>'
                      : waiting
                        ? '<span class="status-pill status-pending">승인대기</span>'
                        : '<span class="status-pill">미가입</span>';
                    return `<tr class="resident-row" data-household-id="${household.id}" tabindex="0">
                      <td>${escapeHtml(household.building)}동</td>
                      <td><strong>${escapeHtml(household.unit)}호</strong></td>
                      <td>${resident ? escapeHtml(resident.phoneLast4 || resident.phone?.slice(-4) || "-") : waiting ? escapeHtml(waiting.phoneLast4) : "-"}</td>
                      <td>${card?.moveInDate ? escapeHtml(card.moveInDate) : "미입력"}</td>
                      <td>${status}</td>
                      <td><button class="btn btn-secondary btn-sm" type="button" data-qr-household="${household.id}">QR 보기</button></td>
                    </tr>`;
                  }).join("") : '<tr><td colspan="6"><div class="empty-state">검색 결과가 없습니다.</div></td></tr>'}
                </tbody>
              </table>
            </div>
          </section>
        `;
      }

      function renderAdminResidentDetail() {
        const household = state.households.find(item => String(item.id) === String(householdId));
        if (!household) {
          return `
            <div class="page-head"><div><h2>입주민 상세</h2><p>세대 정보를 찾을 수 없습니다.</p></div></div>
            <section class="card"><div class="card-body">${renderEmpty("잘못된 세대 경로입니다.")}<button class="btn btn-secondary" data-route="adminResidents">목록으로 돌아가기</button></div></section>
          `;
        }
        const resident = household.currentResidentId ? state.users.find(user => user.id === household.currentResidentId) : null;
        const pendingRequest = state.registrationRequests.find(request => request.householdId === household.id);
        const card = resident ? state.residentCards.find(item => item.residentId === resident.id) : null;
        const phone = resident?.phone || pendingRequest?.phone || "";
        const statusKey = resident ? "active" : pendingRequest ? "pending" : "unregistered";
        const statusLabel = resident ? "가입완료" : pendingRequest ? "승인대기" : "미가입";
        const statusClass = resident ? "status-complete" : pendingRequest ? "status-pending" : "";
        const residencyHistory = household.history ?? [];
        return `
          <div class="resident-breadcrumb"><button class="link-button" data-route="adminResidents">입주민 현황</button><span>/</span><span>${escapeHtml(household.building)}동 ${escapeHtml(household.unit)}호</span><span>/</span><strong>상세</strong></div>
          <div class="page-head"><div><h2>입주민 카드</h2><p>${escapeHtml(household.building)}동 ${escapeHtml(household.unit)}호의 관리 정보를 확인하고 수정합니다.</p></div><div class="page-head-actions"><button class="btn btn-outline" type="button" data-qr-household="${household.id}">세대 QR</button><button class="btn btn-secondary" data-route="adminResidents">목록으로</button></div></div>
          <div class="detail-layout">
            <section class="card">
              <div class="section-title"><div><h3>기본 정보</h3><p>세대 마스터와 회원 가입 정보입니다.</p></div><span class="status-pill ${statusClass}">${statusLabel}</span></div>
              <div class="card-body">
                <div class="detail-grid">
                  <div><div class="detail-label">동</div><div class="detail-value">${escapeHtml(household.building)}동</div></div>
                  <div><div class="detail-label">호수</div><div class="detail-value">${escapeHtml(household.unit)}호</div></div>
                  <div><div class="detail-label">전화번호</div><div class="detail-value">${phone ? escapeHtml(formatPhone(phone)) : "미등록"}</div></div>
                  <div><div class="detail-label">공급면적</div><div class="detail-value">${household.area.toFixed(2)}㎡</div></div>
                </div>
              </div>
            </section>
            <aside class="card resident-card-summary">
              <div class="card-body">
                <div class="resident-summary-heading"><strong>세대 QR</strong><span>현재 발급된 QR 코드</span></div>
                <button class="resident-detail-qr" type="button" data-qr-household="${household.id}" aria-label="${escapeHtml(household.building)}동 ${escapeHtml(household.unit)}호 QR 크게 보기">
                  <div class="spinner" id="residentDetailQrSpinner"></div>
                  <img id="residentDetailQrImage" alt="${escapeHtml(household.building)}동 ${escapeHtml(household.unit)}호 QR 코드" hidden />
                </button>
                <strong>${escapeHtml(household.building)}동 ${escapeHtml(household.unit)}호</strong>
                <span class="muted">${resident ? escapeHtml(resident.name) : pendingRequest ? "가입 승인 대기" : "등록된 입주민 없음"}</span>
                <div class="resident-summary-actions">
                  <a class="btn btn-secondary btn-sm" id="residentDetailQrDownload" download="${escapeHtml(household.building)}동-${escapeHtml(household.unit)}호-QR.png">QR 다운로드</a>
                  <button class="btn btn-outline btn-sm" type="button" id="residentHistoryBtn">변경 이력 ${residencyHistory.length}</button>
                </div>
                <span class="muted">최근 변경 ${residencyHistory[0]?.date ? escapeHtml(residencyHistory[0].date) : card?.updatedAt ? escapeHtml(card.updatedAt) : "없음"}</span>
              </div>
            </aside>
          </div>
          <section class="card" style="margin-top:18px;">
            <div class="section-title"><div><h3>가입상태 변경</h3><p>인증 계정과 가입 요청에 맞는 상태만 선택할 수 있습니다.</p></div></div>
            <form id="residentMembershipForm" data-current-status="${statusKey}" ${resident ? `data-active-resident="${resident.id}"` : ""} ${pendingRequest ? `data-pending-request="${pendingRequest.id}"` : ""}>
              <div class="card-body">
                <div class="field"><label>가입상태</label><select class="control" id="residentMembershipStatus" ${statusKey === "unregistered" ? "disabled" : ""}>
                  ${resident ? '<option value="active" selected>가입완료</option><option value="unregistered">미가입(이용 종료)</option>' : pendingRequest ? '<option value="pending" selected>승인대기</option><option value="active">가입완료(승인)</option><option value="unregistered">미가입(거절)</option>' : '<option value="unregistered" selected>미가입</option>'}
                </select></div>
                ${resident && pendingRequest ? `<div class="demo-box"><strong>입주민 변경 요청이 있습니다.</strong><div class="pending-actions" style="margin-top:10px;"><button class="btn btn-secondary btn-sm" type="button" data-reject-registration="${pendingRequest.id}">변경 거절</button><button class="btn btn-primary btn-sm" type="button" data-approve-registration="${pendingRequest.id}">새 입주민으로 교체</button></div></div>` : ''}
                ${statusKey === "unregistered" ? '<div class="demo-box">가입 요청과 인증 계정이 없는 세대입니다. 입주민이 먼저 회원가입을 요청해야 가입완료로 변경할 수 있습니다.</div>' : ''}
              </div>
              ${statusKey !== "unregistered" ? '<div class="modal-foot"><button class="btn btn-primary" type="submit">가입상태 저장</button></div>' : ''}
            </form>
          </section>
          ${resident ? `
            <section class="card" style="margin-top:18px;">
              <div class="section-title"><div><h3>관리 정보</h3><p>관리사무소에서 필요한 정보만 기록하세요.</p></div></div>
              <form id="residentCardForm"><div class="card-body">
                <div class="field"><label>전입일</label><input class="control" type="date" id="residentMoveInDate" value="${escapeHtml(card?.moveInDate || "")}" /></div>
                <div class="field"><label>관리자 메모</label><textarea class="control" id="residentMemo" maxlength="2000" placeholder="관리상 필요한 메모를 입력하세요.">${escapeHtml(card?.memo || "")}</textarea></div>
                <div class="resident-custom-fields">${(card?.fields ?? []).map(field => `<div class="resident-custom-field" data-card-field="${field.id}"><input class="control" data-field-label value="${escapeHtml(field.label)}" maxlength="50" aria-label="정보 이름" required /><input class="control" data-field-value value="${escapeHtml(field.value)}" maxlength="500" aria-label="정보 내용" /><button class="btn btn-secondary btn-sm" type="button" data-delete-card-field="${field.id}">삭제</button></div>`).join("")}</div>
              </div><div class="modal-foot"><button class="btn btn-primary" type="submit">입주민 카드 저장</button></div></form>
            </section>
            <section class="card" style="margin-top:18px;">
              <div class="section-title"><div><h3>정보 추가</h3><p>예: 차량번호, 비상연락처, 특이사항</p></div></div>
              <form id="residentCardFieldForm"><div class="card-body resident-custom-field"><input class="control" id="newCardFieldLabel" maxlength="50" placeholder="정보 이름" required /><input class="control" id="newCardFieldValue" maxlength="500" placeholder="내용" /><button class="btn btn-primary btn-sm" type="submit">추가</button></div></form>
            </section>
          ` : ''}
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

      function residentHistoryName(residentId) {
        if (!residentId) return "없음";
        const user = state.users.find(item => item.id === residentId);
        return user ? `${user.name} (${user.phoneLast4 || "연락처 없음"})` : "이전 입주민";
      }

      function openResidentHistory(targetHousehold) {
        const history = targetHousehold.history ?? [];
        const eventLabel = { move_in: "입주민 등록", resident_change: "입주민 변경", move_out: "이용 종료", move_in_date: "전입일 변경" };
        modal(`
          <div class="modal-head"><div><h3>${escapeHtml(targetHousehold.building)}동 ${escapeHtml(targetHousehold.unit)}호 변경 이력</h3><div class="muted" style="font-size:12px;">입주민과 전입일 변경 시 세대 QR이 자동 재발급됩니다.</div></div><button class="close-btn" data-close-modal>✕</button></div>
          <div class="modal-body">
            <div class="resident-history-list">
              ${history.length ? history.map(item => `
                <article class="resident-history-item">
                  <div><span class="status-pill">${escapeHtml(eventLabel[item.eventType] || "정보 변경")}</span><time>${escapeHtml(item.date)}</time></div>
                  ${item.eventType === "move_in_date"
                    ? `<strong>전입일 ${escapeHtml(item.previousMoveInDate || "미입력")} → ${escapeHtml(item.moveInDate || "미입력")}</strong>`
                    : `<strong>${escapeHtml(residentHistoryName(item.previousResidentId))} → ${escapeHtml(residentHistoryName(item.residentId))}</strong><small>전입일 ${escapeHtml(item.previousMoveInDate || "미입력")} → ${escapeHtml(item.moveInDate || "미입력")}</small>`}
                </article>
              `).join("") : renderEmpty("기록된 입주 변경 이력이 없습니다.")}
            </div>
          </div>
          <div class="modal-foot"><button class="btn btn-secondary" data-close-modal>닫기</button></div>
        `);
      }

      async function renderResidentDetailQr(targetHousehold) {
        const image = document.getElementById("residentDetailQrImage");
        if (!image || !targetHousehold?.qrCode) return;
        try {
          const qrUrl = `${window.location.origin}/q/${targetHousehold.qrCode}`;
          const { default: QRCode } = await import("qrcode");
          const dataUrl = await QRCode.toDataURL(qrUrl, { width: 360, margin: 2, errorCorrectionLevel: "M" });
          image.src = dataUrl;
          image.hidden = false;
          document.getElementById("residentDetailQrSpinner")?.remove();
          document.getElementById("residentDetailQrDownload").href = dataUrl;
        } catch (error) {
          handleError(error, "QR 이미지를 생성하지 못했습니다.");
        }
      }

      async function openHouseholdQr(targetHouseholdId) {
        const target = state.households.find(item => String(item.id) === String(targetHouseholdId));
        if (!target?.qrCode) return toast("세대 QR 정보를 찾을 수 없습니다.");
        const qrUrl = `${window.location.origin}/q/${target.qrCode}`;
        modal(`
          <div class="modal-head"><div><h3>${escapeHtml(target.building)}동 ${escapeHtml(target.unit)}호 세대 QR</h3><div class="muted" style="font-size:12px;">현재 접속 주소에 맞춰 생성된 QR입니다.</div></div><button class="close-btn" data-close-modal>✕</button></div>
          <div class="modal-body qr-admin-modal">
            <div class="spinner" id="qrAdminSpinner"></div>
            <img id="qrAdminImage" alt="${escapeHtml(target.building)}동 ${escapeHtml(target.unit)}호 QR 코드" hidden />
            <div class="qr-admin-address">${escapeHtml(qrUrl)}</div>
            <div class="demo-box">세대 QR로 민원접수와 공고 열람이 가능합니다. QR이 외부에 노출되었거나 입주 정보가 변경되면 재발급된 최신 QR을 사용하세요.</div>
          </div>
          <div class="modal-foot"><button class="btn btn-secondary" data-close-modal>닫기</button><button class="btn btn-danger" id="rotateHouseholdQrBtn">QR 재발급</button><a class="btn btn-primary" id="downloadHouseholdQr" download="${escapeHtml(target.building)}동-${escapeHtml(target.unit)}호-QR.png">QR 다운로드</a></div>
        `);
        try {
          const { default: QRCode } = await import("qrcode");
          const dataUrl = await QRCode.toDataURL(qrUrl, { width: 420, margin: 2, errorCorrectionLevel: "M" });
          const image = document.getElementById("qrAdminImage");
          image.src = dataUrl;
          image.hidden = false;
          document.getElementById("qrAdminSpinner").remove();
          document.getElementById("downloadHouseholdQr").href = dataUrl;
        } catch (error) {
          handleError(error, "QR 이미지를 생성하지 못했습니다.");
        }
        document.getElementById("rotateHouseholdQrBtn").addEventListener("click", async () => {
          if (!window.confirm("기존 QR은 즉시 사용할 수 없게 됩니다. 새 QR을 발급할까요?")) return;
          try {
            await rotateHouseholdQr(Number(target.id));
            await refreshState();
            openHouseholdQr(target.id);
            toast("새 세대 QR을 발급했습니다.");
          } catch (error) {
            handleError(error, "QR을 재발급하지 못했습니다.");
          }
        });
      }
  
      function bindRouteEvents() {
        document.querySelectorAll("[data-resident-building]").forEach(button => {
          button.addEventListener("click", () => {
            householdBuildingFilter = button.dataset.residentBuilding;
            render();
          });
        });
        const residentUnitSearchForm = document.getElementById("residentUnitSearchForm");
        if (residentUnitSearchForm) residentUnitSearchForm.addEventListener("submit", event => {
          event.preventDefault();
          residentUnitSearch = document.getElementById("residentUnitSearch").value.replace(/\D/g, "");
          render();
        });
        const residentUnitSearchInput = document.getElementById("residentUnitSearch");
        if (residentUnitSearchInput) residentUnitSearchInput.addEventListener("input", event => {
          event.target.value = event.target.value.replace(/\D/g, "");
        });
        const clearResidentUnitSearch = document.getElementById("clearResidentUnitSearch");
        if (clearResidentUnitSearch) clearResidentUnitSearch.addEventListener("click", () => {
          residentUnitSearch = "";
          render();
        });
        const residentStatusFilterSelect = document.getElementById("residentStatusFilter");
        if (residentStatusFilterSelect) residentStatusFilterSelect.addEventListener("change", event => {
          residentStatusFilter = event.target.value;
          render();
        });
        document.querySelectorAll("[data-qr-household]").forEach(button => {
          button.addEventListener("click", event => {
            event.stopPropagation();
            openHouseholdQr(button.dataset.qrHousehold);
          });
        });
        document.querySelectorAll("[data-household-id]").forEach(row => {
          const openResident = () => navigate("adminResidentDetail", { householdId: row.dataset.householdId });
          row.addEventListener("click", event => {
            if (event.target.closest("[data-qr-household]")) return;
            openResident();
          });
          row.addEventListener("keydown", event => {
            if (event.target.closest("[data-qr-household]")) return;
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openResident();
            }
          });
        });
        const residentMembershipForm = document.getElementById("residentMembershipForm");
        if (residentMembershipForm) residentMembershipForm.addEventListener("submit", async event => {
          event.preventDefault();
          const currentStatus = residentMembershipForm.dataset.currentStatus;
          const nextStatus = document.getElementById("residentMembershipStatus").value;
          if (currentStatus === nextStatus) return toast("현재 가입상태와 동일합니다.");
          if (!window.confirm("이 세대의 가입상태를 변경할까요?")) return;
          const submitButton = event.submitter;
          submitButton.disabled = true;
          try {
            if (currentStatus === "pending" && nextStatus === "active") {
              await approveUser(Number(residentMembershipForm.dataset.pendingRequest));
            } else if (currentStatus === "pending" && nextStatus === "unregistered") {
              await rejectRegistration(Number(residentMembershipForm.dataset.pendingRequest));
            } else if (currentStatus === "active" && nextStatus === "unregistered") {
              await deactivateResident(residentMembershipForm.dataset.activeResident);
            } else {
              throw new Error("처리할 수 없는 가입상태 변경입니다.");
            }
            await refreshState();
            toast("가입상태를 변경했습니다.");
          } catch (error) {
            handleError(error, "가입상태를 변경하지 못했습니다.");
            submitButton.disabled = false;
          }
        });
        const detailHousehold = state.households.find(item => String(item.id) === String(householdId));
        const detailResidentId = detailHousehold?.currentResidentId;
        const detailResidentCard = detailResidentId ? state.residentCards.find(item => item.residentId === detailResidentId) : null;
        if (detailHousehold) {
          void renderResidentDetailQr(detailHousehold);
          document.getElementById("residentHistoryBtn")?.addEventListener("click", () => openResidentHistory(detailHousehold));
        }
        const residentCardForm = document.getElementById("residentCardForm");
        if (residentCardForm) residentCardForm.addEventListener("submit", async event => {
          event.preventDefault();
          const submitButton = event.submitter;
          submitButton.disabled = true;
          try {
            const nextMoveInDate = document.getElementById("residentMoveInDate").value || null;
            await saveResidentCard(detailResidentId, {
              moveInDate: nextMoveInDate,
              memo: document.getElementById("residentMemo").value.trim(),
            });
            const fields = [...document.querySelectorAll("[data-card-field]")];
            await Promise.all(fields.map(field => updateResidentCardField(
              Number(field.dataset.cardField),
              field.querySelector("[data-field-label]").value.trim(),
              field.querySelector("[data-field-value]").value.trim(),
            )));
            await refreshState();
            toast((detailResidentCard?.moveInDate || null) !== nextMoveInDate ? "전입일을 변경하고 세대 QR을 새로 발급했습니다." : "입주민 카드를 저장했습니다.");
          } catch (error) {
            handleError(error, "입주민 카드를 저장하지 못했습니다.");
            submitButton.disabled = false;
          }
        });
        const residentCardFieldForm = document.getElementById("residentCardFieldForm");
        if (residentCardFieldForm) residentCardFieldForm.addEventListener("submit", async event => {
          event.preventDefault();
          const submitButton = event.submitter;
          submitButton.disabled = true;
          try {
            await saveResidentCard(detailResidentId, {
              moveInDate: document.getElementById("residentMoveInDate").value || null,
              memo: document.getElementById("residentMemo").value.trim(),
            });
            await addResidentCardField(
              detailResidentId,
              document.getElementById("newCardFieldLabel").value.trim(),
              document.getElementById("newCardFieldValue").value.trim(),
            );
            await refreshState();
            toast("관리 정보를 추가했습니다.");
          } catch (error) {
            handleError(error, "관리 정보를 추가하지 못했습니다.");
            submitButton.disabled = false;
          }
        });
        document.querySelectorAll("[data-delete-card-field]").forEach(button => {
          button.addEventListener("click", async () => {
            if (!window.confirm("이 관리 정보를 삭제할까요?")) return;
            try {
              await deleteResidentCardField(Number(button.dataset.deleteCardField));
              await refreshState();
              toast("관리 정보를 삭제했습니다.");
            } catch (error) {
              handleError(error, "관리 정보를 삭제하지 못했습니다.");
            }
          });
        });
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
        if (newNoticeBtn) newNoticeBtn.addEventListener("click", () => openNoticeForm());
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
        let pointerStartedOnBackdrop = false;
        backdrop.addEventListener("pointerdown", e => {
          pointerStartedOnBackdrop = e.target === backdrop;
        });
        backdrop.addEventListener("pointercancel", () => {
          pointerStartedOnBackdrop = false;
        });
        backdrop.addEventListener("click", e => {
          if (pointerStartedOnBackdrop && e.target === backdrop) closeModal();
          pointerStartedOnBackdrop = false;
        });
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
        const author = complaintAuthor(c);
        const canManage = user.role === "admin";
        const statusOptions = Object.entries(STATUS).map(([key,s])=>`<option value="${key}" ${c.status===key?"selected":""}>${s.label}</option>`).join("");
        modal(`
          <div class="modal-head">
            <div><h3>${escapeHtml(c.title)}</h3><div class="muted" style="font-size:12px;">민원번호 #${c.id}${c.source === "qr" ? " · QR 간편접수" : ""}</div></div>
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
  
      function noticeHistoryValue(field, value) {
        if (field === "pinned") return value ? "중요 공고" : "일반 공고";
        if (field === "has_image") return value ? "첨부 이미지 있음" : "첨부 이미지 없음";
        if (value === null || value === undefined || value === "") return "없음";
        return String(value);
      }

      function renderNoticeHistoryChanges(history) {
        const labels = { category: "공고 분류", title: "제목", body: "내용", pinned: "중요 여부", has_image: "첨부 이미지" };
        if (history.action === "created") {
          return Object.entries(history.changes || {}).map(([field, value]) => `
            <div class="notice-history-change">
              <strong>${escapeHtml(labels[field] || field)}</strong>
              <div class="notice-history-value">${escapeHtml(noticeHistoryValue(field, value))}</div>
            </div>
          `).join("");
        }
        return Object.entries(history.changes || {}).map(([field, change]) => `
          <div class="notice-history-change">
            <strong>${escapeHtml(labels[field] || field)}</strong>
            <div class="notice-history-value"><span>이전</span>${escapeHtml(noticeHistoryValue(field, change.before))}</div>
            <div class="notice-history-value is-after"><span>변경</span>${escapeHtml(noticeHistoryValue(field, change.after))}</div>
          </div>
        `).join("");
      }

      function openNoticeHistory(notice) {
        modal(`
          <div class="modal-head"><div><h3>공고 변경 이력</h3><div class="muted" style="font-size:12px;">${escapeHtml(notice.title)}</div></div><button class="close-btn" data-close-modal>✕</button></div>
          <div class="modal-body">
            ${notice.history?.length ? `<div class="timeline">${notice.history.map(history => `
              <div class="timeline-item">
                <div class="timeline-date">${escapeHtml(history.date)} · 관리자</div>
                <div class="timeline-title">${history.action === "created" ? "최초 등록" : "공고 수정"}</div>
                <div class="notice-history-changes">${renderNoticeHistoryChanges(history)}</div>
              </div>
            `).join("")}</div>` : '<div class="muted">기록된 변경 이력이 없습니다.</div>'}
          </div>
          <div class="modal-foot">
            <button class="btn btn-secondary" data-close-modal>닫기</button>
            <button class="btn btn-primary" id="backToNoticeBtn">공고로 돌아가기</button>
          </div>
        `, true);
        document.getElementById("backToNoticeBtn").addEventListener("click", () => openNotice(notice.id));
      }

      function openNotice(id) {
        const n = state.notices.find(x=>x.id===id);
        if (!n) return;
        const canManageNotice = currentUser().role === "admin";
        modal(`
          <div class="modal-head"><div><h3>${escapeHtml(n.title)}</h3><div class="muted" style="font-size:12px;">${escapeHtml(n.category)} · ${escapeHtml(n.date)}</div></div><button class="close-btn" data-close-modal>✕</button></div>
          <div class="modal-body">
            ${n.pinned?'<span class="status-pill status-pending" style="margin-bottom:12px;">중요 공고</span>':""}
            <div style="white-space:pre-wrap;line-height:1.8;">${escapeHtml(n.body)}</div>
            ${n.image ? `<div class="notice-detail-image-wrap"><img class="notice-detail-image" src="${escapeHtml(n.image)}" alt="${escapeHtml(n.title)} 첨부 이미지" /></div>` : ""}
          </div>
          <div class="modal-foot">
            <button class="btn btn-secondary" data-close-modal>닫기</button>
            ${canManageNotice ? '<button class="btn btn-secondary" id="noticeHistoryBtn">변경 이력</button>' : ''}
            ${canManageNotice ? '<button class="btn btn-primary" id="editNoticeBtn">공고 수정</button>' : ''}
          </div>
        `, true);
        const noticeHistoryBtn = document.getElementById("noticeHistoryBtn");
        if (noticeHistoryBtn) noticeHistoryBtn.addEventListener("click", () => openNoticeHistory(n));
        const editNoticeBtn = document.getElementById("editNoticeBtn");
        if (editNoticeBtn) editNoticeBtn.addEventListener("click", () => openNoticeForm(n));
      }
  
      function openNoticeForm(notice = null) {
        const editing = Boolean(notice);
        modal(`
          <div class="modal-head"><h3>${editing ? '공고 수정' : '새 공고 등록'}</h3><button class="close-btn" data-close-modal>✕</button></div>
          <form id="noticeForm">
            <div class="modal-body">
              <div class="field"><label>공고 분류</label><select class="control" id="noticeCategoryInput"><option>관리사무소</option><option>입주자대표회의</option><option>선거관리위원회</option><option>정부기관</option><option>기타</option></select></div>
              <div class="field"><label>제목</label><input class="control" id="noticeTitleInput" value="${editing ? escapeHtml(notice.title) : ''}" required /></div>
              <div class="field"><label>내용</label><textarea class="control" id="noticeBodyInput" required>${editing ? escapeHtml(notice.body) : ''}</textarea></div>
              <div class="field">
                <label>공고 이미지 <span class="muted">(선택, 최대 10MB)</span></label>
                <label class="upload-box" for="noticeImageInput">
                  <div style="font-size:28px;">▧</div><strong>${editing && notice.image ? '이미지 교체' : '이미지 선택'}</strong>
                  <div class="muted" style="font-size:12px;">JPG, PNG 등 이미지 파일</div>
                  <input type="file" id="noticeImageInput" accept="image/*" hidden />
                </label>
                <div class="upload-preview notice-upload-preview" id="noticeUploadPreview"${editing && notice.image ? ' style="display:block;"' : ''}><img id="noticeUploadPreviewImg" src="${editing && notice.image ? escapeHtml(notice.image) : ''}" alt="공고 이미지 미리보기" /></div>
                ${editing && notice.imagePath ? '<label style="display:flex;align-items:center;gap:8px;margin-top:10px;"><input type="checkbox" id="noticeImageRemoveInput" /> 기존 이미지 삭제</label>' : ''}
              </div>
              <label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" id="noticePinnedInput"${editing && notice.pinned ? ' checked' : ''} /> 중요 공고로 표시</label>
            </div>
            <div class="modal-foot"><button class="btn btn-secondary" type="button" data-close-modal>취소</button><button class="btn btn-primary" type="submit">${editing ? '수정 저장' : '공고 등록'}</button></div>
          </form>
        `);
        if (editing) document.getElementById("noticeCategoryInput").value = notice.category;
        let noticeImageFile = null;
        document.getElementById("noticeImageInput").addEventListener("change", event => {
          const file = event.target.files[0];
          if (!file) return;
          if (!file.type.startsWith("image/")) {
            event.target.value = "";
            return toast("이미지 파일만 첨부할 수 있습니다.");
          }
          if (file.size > 10 * 1024 * 1024) {
            event.target.value = "";
            return toast("공고 이미지는 10MB 이하만 첨부할 수 있습니다.");
          }
          noticeImageFile = file;
          const removeInput = document.getElementById("noticeImageRemoveInput");
          if (removeInput) removeInput.checked = false;
          const reader = new FileReader();
          reader.onload = () => {
            document.getElementById("noticeUploadPreviewImg").src = reader.result;
            document.getElementById("noticeUploadPreview").style.display = "block";
          };
          reader.readAsDataURL(file);
        });
        const noticeImageRemoveInput = document.getElementById("noticeImageRemoveInput");
        if (noticeImageRemoveInput) noticeImageRemoveInput.addEventListener("change", event => {
          if (event.target.checked) {
            noticeImageFile = null;
            document.getElementById("noticeImageInput").value = "";
            document.getElementById("noticeUploadPreview").style.display = "none";
          } else if (notice.image) {
            document.getElementById("noticeUploadPreviewImg").src = notice.image;
            document.getElementById("noticeUploadPreview").style.display = "block";
          }
        });
        document.getElementById("noticeForm").addEventListener("submit", async e => {
          e.preventDefault();
          const submitButton = e.submitter;
          submitButton.disabled = true;
          try {
            const noticeInput = {
              category: document.getElementById("noticeCategoryInput").value,
              title: document.getElementById("noticeTitleInput").value.trim(),
              body: document.getElementById("noticeBodyInput").value.trim(),
              pinned: document.getElementById("noticePinnedInput").checked,
              file: noticeImageFile || undefined,
            };
            if (editing) {
              await updateNotice({
                id: notice.id,
                ...noticeInput,
                existingImagePath: notice.imagePath || undefined,
                removeImage: document.getElementById("noticeImageRemoveInput")?.checked || false,
              });
            } else {
              await createNotice(noticeInput);
            }
            await refreshState();
            closeModal();
            toast(editing ? "공고가 수정되었습니다." : "공고가 등록되었습니다.");
          } catch (error) {
            handleError(error, editing ? "공고를 수정하지 못했습니다." : "공고를 등록하지 못했습니다.");
            submitButton.disabled = false;
          }
        });
      }
  
      function openProfileForm() {
        const user = currentUser();
        const isAdminUser = user.role === "admin";
        modal(`
          <div class="modal-head"><h3>${isAdminUser ? '관리자 정보 수정' : '회원정보 수정'}</h3><button class="close-btn" data-close-modal>✕</button></div>
          <form id="profileForm">
            <div class="modal-body">
              ${isAdminUser ? `
                <div class="field"><label>관리자 이메일</label><input class="control" type="email" id="profileAdminEmail" autocomplete="email" value="${escapeHtml(user.email)}" required /></div>
                <div class="demo-box">이메일 변경 시 확인 메일이 발송됩니다. 확인이 완료된 이메일이 다음 로그인부터 적용됩니다.</div>
              ` : `
                <div class="field-row">
                  <div class="field"><label>동</label><input class="control" value="${escapeHtml(user.building)}" disabled /></div>
                  <div class="field"><label>호수</label><input class="control" value="${escapeHtml(user.unit)}" disabled /></div>
                </div>
                <div class="field"><label>전화번호 뒤 4자리</label><input class="control" value="${escapeHtml(user.phone)}" disabled /></div>
              `}
              <div class="field"><label>새 비밀번호</label><input class="control" type="password" id="profilePassword" placeholder="변경하지 않으려면 비워두세요." /></div>
            </div>
            <div class="modal-foot"><button class="btn btn-secondary" type="button" data-close-modal>취소</button><button class="btn btn-primary" type="submit">저장</button></div>
          </form>
        `);
        document.getElementById("profileForm").addEventListener("submit", async e => {
          e.preventDefault();
          try {
            const emailChangeRequested = isAdminUser
              ? await updateAdminEmail(document.getElementById("profileAdminEmail").value)
              : false;
            await updateProfile({
              password: document.getElementById("profilePassword").value || undefined,
            });
            await refreshState();
            closeModal();
            toast(emailChangeRequested ? "새 관리자 이메일로 확인 메일을 보냈습니다." : "회원정보가 수정되었습니다.");
          } catch (error) {
            handleError(error, "회원정보를 수정하지 못했습니다.");
          }
        });
      }
  
      render();
      bootstrap().then(() => {
        const mountedUser = currentUser();
        const isAuthRoute = initialRoute === "login" || initialRoute === "adminLogin";
        const isPasswordResetRoute = initialRoute === "adminResetPassword";
        const isAdminOnlyRoute = initialRoute === "admin" || initialRoute === "adminResidents" || initialRoute === "adminResidentDetail";
        if (!mountedUser && !isAuthRoute && !isPasswordResetRoute) {
          onNavigate("login", { replace: true });
        } else if (mountedUser && isAuthRoute) {
          onNavigate(mountedUser.role === "admin" ? "admin" : "dashboard", { replace: true });
        } else if (mountedUser?.role !== "admin" && isAdminOnlyRoute) {
          onNavigate("dashboard", { replace: true });
        }
      });

  return () => {
    disposed = true
    appRoot.replaceChildren()
    modalRootElement.replaceChildren()
  }
}
