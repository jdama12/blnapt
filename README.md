# 우리 아파트 생활지원

React + Vite 프론트엔드와 Supabase 백엔드로 구성된 아파트 생활지원 서비스입니다.

## 백엔드 구성

- Supabase Auth: 이메일/비밀번호 로그인과 이메일 확인
- PostgreSQL: 회원, 민원, 댓글, 처리이력, 공고, 관리비/수입
- Row Level Security: 입주민과 관리자 권한 분리
- Supabase Storage: 민원 첨부 이미지
- Vercel: 프론트엔드 자동 배포

브라우저의 `localStorage`에는 Supabase 로그인 세션만 저장되며, 업무 데이터와 fake 데이터는 저장하지 않습니다.

## 1. Supabase 프로젝트 만들기

1. [Supabase Dashboard](https://supabase.com/dashboard)에서 새 프로젝트를 만듭니다.
2. SQL Editor를 엽니다.
3. [초기 마이그레이션](./supabase/migrations/202607160001_initial_schema.sql)의 전체 내용을 실행합니다.
4. Authentication → URL Configuration에서 다음을 설정합니다.
   - Site URL: 실제 Vercel 운영 주소
   - Redirect URLs: `http://localhost:5173/**`, `https://프로젝트주소.vercel.app/**`
5. Authentication → Email에서 이메일 로그인을 활성화합니다.

마이그레이션은 빈 테이블만 생성하며 샘플 데이터는 넣지 않습니다.

## 2. 환경변수 설정

Supabase Dashboard의 Project Settings → API에서 Project URL과 Publishable key를 확인합니다.

로컬에서는 `.env.example`을 복사해 `.env.local`을 만듭니다.

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

`service_role` 키는 절대로 프론트 코드, `.env.local`, Vercel 환경변수에 넣지 마세요.

Vercel 프로젝트의 Settings → Environment Variables에도 같은 두 변수를 등록합니다. Production, Preview, Development 환경에 모두 적용한 뒤 재배포합니다.

## 3. 최초 관리자 만들기

1. 배포된 사이트에서 관리자 이메일로 일반 회원가입을 합니다.
2. 받은 이메일의 확인 링크를 누릅니다.
3. Supabase SQL Editor에서 다음 SQL을 이메일에 맞게 한 번 실행합니다.

```sql
update public.profiles
set role = 'admin', approved = true
where email = 'admin@example.com';
```

이후 관리자로 로그인하면 관리자 메뉴에서 다른 입주민의 가입을 승인할 수 있습니다.

## 4. 로컬 실행

```powershell
npm.cmd install
npm.cmd run dev
```

검증 명령:

```powershell
npm.cmd run build
npm.cmd run lint
```

## 데이터 권한

- 승인된 입주민은 자신의 민원만 조회합니다.
- 입주민은 자신의 민원에 댓글을 추가할 수 있습니다.
- 관리자는 전체 민원 조회, 상태 변경, 공고 등록, 가입 승인을 할 수 있습니다.
- 프로필의 관리자 권한과 승인 상태는 일반 사용자가 변경할 수 없습니다.
- 민원 이미지는 비공개 버킷에 저장되고 로그인 사용자에게만 임시 URL로 제공됩니다.
