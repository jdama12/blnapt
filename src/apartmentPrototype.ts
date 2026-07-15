/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-unused-vars */
// The prototype currently uses imperative DOM rendering. Keeping it in a mounted
// module preserves all interactions while screens can be migrated incrementally.
// @ts-nocheck

export function mountApartmentPrototype(
  appRoot: HTMLElement,
  modalRootElement: HTMLElement,
) {
      const STATUS = {
        pending: { label: "접수대기", className: "status-pending", progress: 20 },
        received: { label: "접수완료", className: "status-received", progress: 45 },
        progress: { label: "처리중", className: "status-progress", progress: 72 },
        complete: { label: "처리완료", className: "status-complete", progress: 100 }
      };
  
      const defaultState = {
        currentUserId: null,
        users: [
          { id: 1, role: "resident", name: "김입주", phone: "01012345678", building: "102", unit: "1707", password: "1234", approved: true },
          { id: 2, role: "admin", name: "관리소장", phone: "01000000000", building: "관리", unit: "사무소", password: "admin", approved: true },
          { id: 3, role: "resident", name: "박신청", phone: "01055556666", building: "105", unit: "804", password: "1234", approved: false }
        ],
        complaints: [
          {
            id: 1001, authorId: 1, title: "102동 옥상 누수 확인 요청",
            category: "시설", location: "102동 17층 복도 및 옥상 출입구",
            content: "비가 많이 온 뒤 복도 천장과 세대 벽면에 물자국이 생겼습니다. 옥상 방수 상태를 확인해 주세요.",
            status: "progress", priority: "high", createdAt: "2026-07-12 09:35",
            updatedAt: "2026-07-14 10:20", image: "",
            comments: [
              { id: 1, userId: 2, text: "관리과장이 현장 확인을 완료했습니다. 방수업체에 긴급 견적을 요청했습니다.", createdAt: "2026-07-12 14:10" },
              { id: 2, userId: 1, text: "오늘도 벽면이 조금 젖어 있습니다. 진행 상황 확인 부탁드립니다.", createdAt: "2026-07-13 08:42" },
              { id: 3, userId: 2, text: "임시 방수 조치를 진행했고, 정식 보수 일정은 업체 확정 후 안내드리겠습니다.", createdAt: "2026-07-14 10:20" }
            ],
            history: [
              { status: "pending", date: "2026-07-12 09:35", note: "입주민 민원 등록" },
              { status: "received", date: "2026-07-12 10:04", note: "관리사무소 접수" },
              { status: "progress", date: "2026-07-12 14:10", note: "현장 확인 및 업체 견적 요청" }
            ]
          },
          {
            id: 1002, authorId: 1, title: "주차장 조명 점등 불량",
            category: "전기", location: "지하 2층 102동 라인 B-23 기둥 부근",
            content: "주차면 주변 조명이 깜빡이다가 꺼집니다. 야간에 어두워 안전사고가 우려됩니다.",
            status: "complete", priority: "normal", createdAt: "2026-06-28 21:14",
            updatedAt: "2026-06-30 16:05", image: "",
            comments: [
              { id: 1, userId: 2, text: "전기기사 확인 후 LED 안정기와 램프를 교체했습니다.", createdAt: "2026-06-30 16:05" }
            ],
            history: [
              { status: "pending", date: "2026-06-28 21:14", note: "입주민 민원 등록" },
              { status: "received", date: "2026-06-29 09:10", note: "관리사무소 접수" },
              { status: "progress", date: "2026-06-30 14:00", note: "전기기사 현장 점검" },
              { status: "complete", date: "2026-06-30 16:05", note: "LED 안정기 및 램프 교체 완료" }
            ]
          },
          {
            id: 1003, authorId: 1, title: "분리수거장 악취 및 청소 요청",
            category: "청소", location: "103동 뒤편 분리수거장",
            content: "음식물 주변 바닥에 오염이 남아 있어 악취가 심합니다.",
            status: "received", priority: "normal", createdAt: "2026-07-14 07:50",
            updatedAt: "2026-07-14 08:20", image: "",
            comments: [
              { id: 1, userId: 2, text: "미화반에 전달했으며 오전 중 세척 예정입니다.", createdAt: "2026-07-14 08:20" }
            ],
            history: [
              { status: "pending", date: "2026-07-14 07:50", note: "입주민 민원 등록" },
              { status: "received", date: "2026-07-14 08:20", note: "관리사무소 접수" }
            ]
          }
        ],
        notices: [
          { id: 1, category: "관리사무소", title: "여름철 폭염 대비 야외작업 안전수칙 안내", date: "2026-07-14", pinned: true, body: "폭염특보 발효 시 야외작업 시간을 조정하고 충분한 휴식과 수분 섭취를 시행합니다." },
          { id: 2, category: "입주자대표회의", title: "2026년 7월 긴급 임시회의 결과 공고", date: "2026-07-11", pinned: true, body: "관리소장 공석 대책 및 관리사무소 업무질서 확립 안건이 가결되었습니다." },
          { id: 3, category: "선거관리위원회", title: "제1선거구 동별대표자 보궐선거 공고", date: "2026-07-09", pinned: false, body: "후보등록 일정과 투표 일정을 확인해 주시기 바랍니다." },
          { id: 4, category: "정부기관", title: "동작구 공동주택 여름철 안전관리 협조 요청", date: "2026-07-08", pinned: false, body: "옥상, 지하주차장, 전기시설 등 취약시설 자체 점검을 요청합니다." },
          { id: 5, category: "기타", title: "방치 자전거 정리 예정 안내", date: "2026-07-04", pinned: false, body: "표찰 부착 후 일정 기간 경과한 방치 자전거를 정리할 예정입니다." }
        ],
        fees: [
          {
            month: "2026-06", total: 181420, previous: 175860,
            items: [
              ["일반관리비", 38200, 37100], ["청소비", 16200, 15900], ["경비용역비", 22500, 22100],
              ["소독비", 950, 950], ["승강기유지비", 7700, 7700], ["수선유지비", 8600, 8100],
              ["위탁관리비", 4600, 4600], ["장기수선충당금", 22000, 22000], ["세대전기료", 24400, 21600],
              ["승강기전기료", 2800, 2700], ["공동전기료", 3950, 3820], ["TV수신료", 2500, 2500],
              ["상수도료", 10500, 9800], ["하수도료", 4300, 4000], ["정화조오물수수료", 550, 550],
              ["생활폐기수수료", 3900, 3700], ["보험료", 1200, 1200], ["선거관리위원 운영비", 0, 1400],
              ["대표회의 운영비", 700, 700], ["주차비", 2100, 1850], ["공동관리비 차감", -5630, -5410]
            ]
          },
          {
            month: "2026-05", total: 175860, previous: 170230,
            items: [
              ["일반관리비", 37100, 36800], ["청소비", 15900, 15600], ["경비용역비", 22100, 21800],
              ["소독비", 950, 950], ["승강기유지비", 7700, 7700], ["수선유지비", 8100, 7600],
              ["위탁관리비", 4600, 4600], ["장기수선충당금", 22000, 22000], ["세대전기료", 21600, 18700],
              ["승강기전기료", 2700, 2600], ["공동전기료", 3820, 3710], ["TV수신료", 2500, 2500],
              ["상수도료", 9800, 9300], ["하수도료", 4000, 3800], ["정화조오물수수료", 550, 550],
              ["생활폐기수수료", 3700, 3600], ["보험료", 1200, 1200], ["선거관리위원 운영비", 1400, 0],
              ["대표회의 운영비", 700, 700], ["주차비", 1850, 1720], ["공동관리비 차감", -5410, -5200]
            ]
          }
        ],
        income: [
          {
            month: "2026-06", total: 12850000, previous: 12160000,
            items: [
              ["주차수입", 4380000, 4150000], ["재활용품 매각수입", 1850000, 1720000],
              ["시설사용료", 920000, 870000], ["이자수입", 480000, 440000],
              ["잡수입", 5220000, 4980000]
            ]
          },
          {
            month: "2026-05", total: 12160000, previous: 11890000,
            items: [
              ["주차수입", 4150000, 4050000], ["재활용품 매각수입", 1720000, 1680000],
              ["시설사용료", 870000, 840000], ["이자수입", 440000, 420000],
              ["잡수입", 4980000, 4900000]
            ]
          }
        ]
      };
  
      const store = {
        get() {
          const raw = localStorage.getItem("aptPrototypeStateV3");
          if (!raw) {
            localStorage.setItem("aptPrototypeStateV3", JSON.stringify(defaultState));
            return structuredClone(defaultState);
          }
          try { return JSON.parse(raw); }
          catch {
            localStorage.setItem("aptPrototypeStateV3", JSON.stringify(defaultState));
            return structuredClone(defaultState);
          }
        },
        set(state) { localStorage.setItem("aptPrototypeStateV3", JSON.stringify(state)); },
        reset() { localStorage.setItem("aptPrototypeStateV3", JSON.stringify(defaultState)); }
      };
  
      let state = store.get();
      let currentRoute = "dashboard";
      let authTab = "login";
      let complaintFilter = "current";
      let complaintSearch = "";
      let complaintStatusFilter = "all";
      let noticeCategory = "전체";
      let feeTab = "fee";
  
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
      function nowString() {
        const d = new Date();
        const p = v => String(v).padStart(2, "0");
        return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
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
      function setState(nextState) {
        state = nextState;
        store.set(state);
        render();
      }
      function navigate(route) {
        currentRoute = route;
        window.scrollTo({ top: 0, behavior: "smooth" });
        render();
      }
  
      function statusBadge(status) {
        const s = STATUS[status] || STATUS.pending;
        return `<span class="status-pill ${s.className}">${s.label}</span>`;
      }
  
      function render() {
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
                    <div class="brand-title">보라매롯데낙천대 아파트 생활지원</div>
                    <div class="brand-sub">보라매롯데낙천대 테스트 화면</div>
                  </div>
                </div>
                <div class="auth-tabs">
                  <button class="auth-tab ${authTab === "login" ? "active" : ""}" data-auth-tab="login">로그인</button>
                  <button class="auth-tab ${authTab === "register" ? "active" : ""}" data-auth-tab="register">회원가입</button>
                </div>
                ${authTab === "login" ? renderLoginForm() : renderRegisterForm()}
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
        if (authTab === "login") bindLogin();
        else bindRegister();
      }
  
      function renderLoginForm() {
        return `
          <h2>로그인</h2>
          <p class="lead">전화번호 또는 동·호수와 비밀번호를 입력하세요.</p>
          <form id="loginForm">
            <div class="field">
              <label>전화번호 또는 동·호수</label>
              <input class="control" id="loginId" placeholder="예: 01012345678 또는 102-1707" required />
            </div>
            <div class="field">
              <label>비밀번호</label>
              <input class="control" type="password" id="loginPassword" placeholder="비밀번호" required />
            </div>
            <button class="btn btn-primary btn-block" type="submit">로그인</button>
          </form>
          <div class="demo-box">
            <b>입주민 테스트</b> 102-1707 / 1234<br/>
            <b>관리자 테스트</b> 01000000000 / admin<br/>
            <span class="danger-text">승인대기 테스트</span> 105-804 / 1234
            <div style="margin-top:10px;">
              <button class="btn btn-secondary btn-sm" id="resetDataBtn" type="button">테스트 데이터 초기화</button>
            </div>
          </div>
        `;
      }
  
      function renderRegisterForm() {
        return `
          <h2>가입 요청</h2>
          <p class="lead">가입 신청 후 관리자의 승인이 필요합니다.</p>
          <form id="registerForm">
            <div class="field-row">
              <div class="field">
                <label>동</label>
                <input class="control" id="regBuilding" inputmode="numeric" placeholder="예: 102" required />
              </div>
              <div class="field">
                <label>호수</label>
                <input class="control" id="regUnit" inputmode="numeric" placeholder="예: 1707" required />
              </div>
            </div>
            <div class="field">
              <label>이름</label>
              <input class="control" id="regName" placeholder="이름" required />
            </div>
            <div class="field">
              <label>전화번호</label>
              <input class="control" id="regPhone" inputmode="tel" placeholder="01012345678" required />
            </div>
            <div class="field-row">
              <div class="field">
                <label>비밀번호</label>
                <input class="control" type="password" id="regPassword" minlength="4" placeholder="4자 이상" required />
              </div>
              <div class="field">
                <label>비밀번호 확인</label>
                <input class="control" type="password" id="regPassword2" minlength="4" placeholder="다시 입력" required />
              </div>
            </div>
            <button class="btn btn-primary btn-block" type="submit">가입 승인 요청</button>
          </form>
        `;
      }
  
      function bindLogin() {
        document.getElementById("loginForm").addEventListener("submit", e => {
          e.preventDefault();
          const loginId = document.getElementById("loginId").value.trim().replace(/\s/g, "");
          const password = document.getElementById("loginPassword").value;
          const normalizedPhone = loginId.replace(/-/g, "");
          const user = state.users.find(u => {
            const unitKey = `${u.building}-${u.unit}`;
            return (u.phone === normalizedPhone || unitKey === loginId) && u.password === password;
          });
          if (!user) return toast("로그인 정보가 일치하지 않습니다.");
          if (!user.approved) return toast("관리자 승인 대기 중인 계정입니다.");
          state.currentUserId = user.id;
          store.set(state);
          currentRoute = "dashboard";
          render();
          toast(`${user.name}님, 환영합니다.`);
        });
        document.getElementById("resetDataBtn").addEventListener("click", () => {
          store.reset();
          state = store.get();
          toast("테스트 데이터가 초기화되었습니다.");
          renderAuth();
        });
      }
  
      function bindRegister() {
        document.getElementById("registerForm").addEventListener("submit", e => {
          e.preventDefault();
          const building = document.getElementById("regBuilding").value.trim();
          const unit = document.getElementById("regUnit").value.trim();
          const name = document.getElementById("regName").value.trim();
          const phone = document.getElementById("regPhone").value.replace(/\D/g, "");
          const password = document.getElementById("regPassword").value;
          const password2 = document.getElementById("regPassword2").value;
          if (password !== password2) return toast("비밀번호 확인이 일치하지 않습니다.");
          if (state.users.some(u => u.phone === phone || (u.building === building && u.unit === unit))) {
            return toast("이미 등록된 전화번호 또는 동·호수입니다.");
          }
          state.users.push({
            id: Date.now(), role: "resident", name, phone, building, unit, password, approved: false
          });
          store.set(state);
          authTab = "login";
          renderAuth();
          toast("가입 요청이 접수되었습니다. 관리자 승인 후 로그인할 수 있습니다.");
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
        if (logout) logout.addEventListener("click", () => {
          state.currentUserId = null;
          store.set(state);
          render();
        });
        const mobileProfileBtn = document.getElementById("mobileProfileBtn");
        if (mobileProfileBtn) mobileProfileBtn.addEventListener("click", () => navigate(currentUser().role === "admin" ? "admin" : "mypage"));
        bindRouteEvents();
      }
  
      function renderDashboard(user) {
        const all = user.role === "admin" ? state.complaints : state.complaints.filter(c => c.authorId === user.id);
        const active = all.filter(c => c.status !== "complete");
        const complete = all.filter(c => c.status === "complete");
        const pendingUsers = state.users.filter(u => !u.approved).length;
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
              <div class="label">6월 관리비</div><div class="value" style="font-size:26px;">${fmtNumber(state.fees[0].total)}원</div>
              <div class="sub">${state.fees[0].total > state.fees[0].previous ? "전월 대비 증가" : "전월 대비 감소"}</div><div class="metric-icon">₩</div>
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
                    ${state.notices.slice(0,3).map(renderNoticeItem).join("")}
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
        const pending = state.users.filter(u => !u.approved);
        const complaints = state.complaints.slice().sort((a,b)=>b.id-a.id);
        return `
          <div class="page-head"><div><h2>관리자</h2><p>회원 승인과 민원 업무를 관리합니다.</p></div></div>
          <div class="grid grid-2">
            <section class="card">
              <div class="section-title"><div><h3>가입 승인 요청</h3><p>동·호수 확인 후 승인하세요.</p></div><span class="status-pill status-pending">${pending.length}건</span></div>
              <div class="card-body">
                ${pending.length ? pending.map(u=>`
                  <div class="pending-user">
                    <div><strong>${escapeHtml(u.building)}동 ${escapeHtml(u.unit)}호 · ${escapeHtml(u.name)}</strong><span>${formatPhone(u.phone)} · 가입 승인 대기</span></div>
                    <div><button class="btn btn-primary btn-sm" data-approve-user="${u.id}">승인</button></div>
                  </div>
                `).join("") : renderEmpty("승인 대기 중인 회원이 없습니다.")}
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
        document.querySelectorAll("[data-approve-user]").forEach(btn => {
          btn.addEventListener("click", e => {
            e.stopPropagation();
            const user = state.users.find(u => u.id === Number(btn.dataset.approveUser));
            if (!user) return;
            user.approved = true;
            store.set(state);
            render();
            toast(`${user.building}동 ${user.unit}호 ${user.name}님을 승인했습니다.`);
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
                <div class="field"><label>대상 세대(테스트)</label><select class="control" id="compAuthor">${state.users.filter(u=>u.role==="resident"&&u.approved).map(u=>`<option value="${u.id}">${u.building}동 ${u.unit}호 ${escapeHtml(u.name)}</option>`).join("")}</select></div>
              `:""}
            </div>
            <div class="modal-foot"><button type="button" class="btn btn-secondary" data-close-modal>취소</button><button type="submit" class="btn btn-primary">민원 등록</button></div>
          </form>
        `);
        let imageData = "";
        document.getElementById("compImage").addEventListener("change", e => {
          const file = e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            imageData = reader.result;
            document.getElementById("uploadPreviewImg").src = imageData;
            document.getElementById("uploadPreview").style.display = "block";
          };
          reader.readAsDataURL(file);
        });
        document.getElementById("complaintForm").addEventListener("submit", e => {
          e.preventDefault();
          const id = Math.max(1000, ...state.complaints.map(c=>c.id)) + 1;
          const createdAt = nowString();
          const authorId = user.role==="admin" ? Number(document.getElementById("compAuthor").value) : user.id;
          state.complaints.push({
            id, authorId,
            title: document.getElementById("compTitle").value.trim(),
            category: document.getElementById("compCategory").value,
            location: document.getElementById("compLocation").value.trim(),
            content: document.getElementById("compContent").value.trim(),
            status: user.role==="admin" ? "received" : "pending",
            priority: "normal", createdAt, updatedAt: createdAt, image: imageData,
            comments: user.role==="admin" ? [{ id: 1, userId: user.id, text: "관리사무소에서 민원을 등록했습니다.", createdAt }] : [],
            history: [{ status: user.role==="admin" ? "received" : "pending", date: createdAt, note: user.role==="admin" ? "관리사무소 민원 등록" : "입주민 민원 등록" }]
          });
          store.set(state);
          closeModal();
          currentRoute = "complaints";
          complaintFilter = "current";
          render();
          toast("민원이 등록되었습니다.");
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
  
        document.getElementById("commentForm").addEventListener("submit", e => {
          e.preventDefault();
          const text = document.getElementById("commentText").value.trim();
          if (!text) return;
          c.comments.push({ id: Date.now(), userId: user.id, text, createdAt: nowString() });
          c.updatedAt = nowString();
          store.set(state);
          closeModal();
          openComplaintDetail(id);
          toast("댓글이 등록되었습니다.");
        });
  
        if (canManage) {
          document.getElementById("statusUpdateBtn").addEventListener("click", () => {
            const next = document.getElementById("statusSelect").value;
            if (next === c.status) return toast("현재 상태와 동일합니다.");
            c.status = next;
            c.updatedAt = nowString();
            c.history.push({ status: next, date: c.updatedAt, note: `관리자가 상태를 '${STATUS[next].label}'로 변경` });
            c.comments.push({ id: Date.now(), userId: user.id, text: `민원 상태가 '${STATUS[next].label}'로 변경되었습니다.`, createdAt: c.updatedAt });
            store.set(state);
            closeModal();
            render();
            openComplaintDetail(id);
            toast("민원 상태가 변경되었습니다.");
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
        document.getElementById("noticeForm").addEventListener("submit", e => {
          e.preventDefault();
          const d = new Date();
          const p = n => String(n).padStart(2,"0");
          state.notices.unshift({
            id: Date.now(),
            category: document.getElementById("noticeCategoryInput").value,
            title: document.getElementById("noticeTitleInput").value.trim(),
            body: document.getElementById("noticeBodyInput").value.trim(),
            pinned: document.getElementById("noticePinnedInput").checked,
            date: `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`
          });
          store.set(state); closeModal(); render(); toast("공고가 등록되었습니다.");
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
              <div class="field"><label>이름</label><input class="control" id="profileName" value="${escapeHtml(user.name)}" required /></div>
              <div class="field"><label>전화번호</label><input class="control" id="profilePhone" value="${escapeHtml(user.phone)}" required /></div>
              <div class="field"><label>새 비밀번호</label><input class="control" type="password" id="profilePassword" placeholder="변경하지 않으려면 비워두세요." /></div>
            </div>
            <div class="modal-foot"><button class="btn btn-secondary" type="button" data-close-modal>취소</button><button class="btn btn-primary" type="submit">저장</button></div>
          </form>
        `);
        document.getElementById("profileForm").addEventListener("submit", e => {
          e.preventDefault();
          user.name = document.getElementById("profileName").value.trim();
          user.phone = document.getElementById("profilePhone").value.replace(/\D/g,"");
          const pw = document.getElementById("profilePassword").value;
          if (pw) user.password = pw;
          store.set(state); closeModal(); render(); toast("회원정보가 수정되었습니다.");
        });
      }
  
      render();

  return () => {
    appRoot.replaceChildren()
    modalRootElement.replaceChildren()
  }
}
