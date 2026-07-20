# 우리 아파트 생활지원

React + Vite 프론트엔드와 Supabase 백엔드로 구성된 아파트 생활지원 서비스입니다.

## 핵심 구조

- 세대 마스터: 엑셀 원본에서 검증한 101~107동의 실제 734세대
- Supabase Auth: 내부 계정과 비밀번호 인증
- Edge Functions: 동·호·전화번호 뒤 4자리를 내부 Auth 계정에 안전하게 연결
- 가입 요청: 미입주 세대의 신규 가입과 기존 세대의 입주민 변경을 구분
- PostgreSQL/RLS: 현재 승인된 입주민과 관리자만 업무 데이터 접근
- Supabase Storage: 비공개 민원 첨부 이미지
- Vercel: 프론트엔드 자동 배포

브라우저에는 Supabase 로그인 세션만 저장됩니다. 비밀번호는 별도 테이블이나 프론트엔드에 저장하지 않고 Supabase Auth만 사용합니다.

## 세대 마스터

원본 파일의 `세대목록` 시트에서 734개의 고유 동·호수를 읽어 [세대 마이그레이션](./supabase/migrations/202607200001_households_and_residency.sql)에 포함했습니다.

| 동 | 세대수 | 호수 범위 |
|---:|---:|---:|
| 101 | 162 | 101~2108 |
| 102 | 140 | 101~1904 |
| 103 | 78 | 101~2104 |
| 104 | 66 | 101~1704 |
| 105 | 68 | 101~1804 |
| 106 | 114 | 101~2002 |
| 107 | 106 | 101~1804 |
| 합계 | 734 | |

호수 범위를 연속으로 생성하지 않습니다. 엑셀에 존재하는 734개 행만 유효한 세대로 등록합니다.

원본 엑셀이 변경되면 다음 명령으로 마이그레이션의 세대 값 목록을 다시 만들 수 있습니다.

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\generate-household-values.ps1 `
  -WorkbookPath "C:\path\to\동호수별_세대현황.xlsx"
```

## 로그인과 가입 처리

입주민 로그인 주소는 `/login`이며 입력값은 다음 네 가지입니다.

1. 동
2. 호수
3. 전화번호 뒤 4자리
4. 비밀번호

가입 요청에서는 동·호수, **전체 전화번호**, 비밀번호를 받습니다. 관리자는 전체 전화번호를 전입카드와 비교하며, 승인된 뒤 사용자는 전화번호 뒤 4자리로 로그인합니다.

- 현재 입주민이 없는 세대: `신규 가입` 요청
- 현재 입주민이 있는 세대: 관리자 화면에 `입주민 변경` 알림
- 교체 승인: 기존 회원을 `replaced`로 종료하고 신규 회원을 `active`로 전환
- 교체 전 민원 기록: 기존 작성자와 세대 FK를 유지해 이력이 보존됨
- 비밀번호 분실: 관리사무소 확인 후 새 가입 요청을 승인해 계정을 교체

전화번호 뒤 4자리는 단독 인증 수단이 아닙니다. 동·호·뒤 4자리로 내부 계정을 찾은 뒤 Supabase Auth가 비밀번호를 검증합니다.

관리자 로그인은 `/admin/login`에서 완전히 분리됩니다. 관리자는 동·호수와 관계없는 이메일·비밀번호를 사용하며, 관리자 정보와 활성 여부는 `admin_accounts`가 기준입니다. 기존 FK 호환용 `profiles` 행은 남아 있지만 734세대의 현재 입주민으로 집계되지 않습니다.

관리자 비밀번호를 잊은 경우 `/admin/login`에서 재설정 메일을 요청합니다. 이메일 링크는 `/admin/reset-password`로 돌아오며, 활성 관리자 계정으로 확인된 경우에만 새 비밀번호를 저장합니다. Supabase Authentication의 Redirect URLs에는 Production의 `https://blnapt.vercel.app/admin/reset-password`도 등록해야 합니다.

## Supabase 적용

기존 프로젝트에서는 SQL Editor의 `postgres` 역할로 다음 파일을 순서대로 적용합니다. 이미 실행한 파일은 다시 실행하지 않습니다.

1. `202607160001_initial_schema.sql`
2. `202607160002_authenticated_grants.sql`
3. `202607160003_allow_postgres_profile_admin.sql`
4. `202607200001_households_and_residency.sql`
5. `202607200002_separate_admin_accounts.sql`

이미 4번까지 실행한 프로젝트에서는 5번 파일만 새로 실행합니다. 실행 후 검증 SQL:

```sql
select building, count(*) as household_count
from public.households
group by building
order by building;

select count(*) as total_households
from public.households;
```

`total_households`는 반드시 `734`여야 합니다.

## Edge Functions 배포

Supabase CLI는 프로젝트 개발 의존성으로 설치되어 있습니다. 최초 한 번 로그인한 후 함수를 배포합니다.

```powershell
npx.cmd supabase login
npm.cmd run supabase:functions:deploy
```

Edge Functions에는 Supabase가 제공하는 `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` 기본 비밀이 사용됩니다. `service_role` 키를 `.env.local`, Vercel 또는 프론트 코드에 추가하면 안 됩니다.

## 최초 관리자

기존 활성 관리자의 이메일과 비밀번호는 마이그레이션 후에도 그대로 유지되며 `/admin/login`에서 사용합니다. 완전히 새 프로젝트라면 다음 순서로 첫 관리자를 만듭니다.

1. 사이트에서 동·호·전화번호 뒤 4자리와 비밀번호로 가입 요청
2. SQL Editor에서 해당 요청을 최초 관리자로 승인

```sql
select public.bootstrap_first_admin(101, 101, '1234');
```

인수는 최초 관리자 가입 요청에 사용한 동, 호수, 전화번호 뒤 4자리로 바꿉니다. 이 요청은 관리자 계정으로 전환되며 해당 세대를 점유하지 않습니다. 활성 관리자가 이미 있으면 함수는 실행을 거부합니다. 이 방식으로 만든 계정의 내부 로그인 이메일은 SQL Editor에서 다음과 같이 확인할 수 있습니다.

```sql
select email from public.admin_accounts where active = true;
```

## 환경변수

로컬 `.env.local`과 Vercel의 Production/Preview 환경에는 공개 가능한 두 값만 등록합니다.

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

## 로컬 실행과 검증

```powershell
npm.cmd install
npm.cmd run dev
npm.cmd run build
npm.cmd run lint
```

## 권한 원칙

- 승인된 현재 입주민만 공고, 관리비 및 자신의 민원에 접근합니다.
- 교체되거나 거절된 계정은 업무 데이터에 접근할 수 없습니다.
- 관리자는 가입 승인·거절, 입주민 교체, 전체 민원과 공고를 관리합니다.
- 프로필의 세대, 역할, 승인 상태는 일반 사용자가 변경할 수 없습니다.
- 민원 이미지는 비공개 버킷에 저장되고 허용된 사용자에게만 임시 URL로 제공됩니다.
