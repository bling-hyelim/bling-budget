# 셋업 가이드

지금까지는 mock 데이터로 화면을 봤고, 이제 실제 데이터를 저장해서 어느 기기에서나 동기화되게 할 차례.

## 1. Supabase 프로젝트 만들기

1. [supabase.com](https://supabase.com) 가입 / 로그인
2. **New Project** 클릭
3. 프로젝트 이름은 `bling-budget` 같이 자유롭게
4. **Database Password** 는 잘 보관 (안 써도 됨)
5. **Region** 은 `Northeast Asia (Seoul)` 추천
6. **Pricing Plan** 은 **Free** 면 충분
7. 생성 후 1~2분 기다리기

## 2. URL과 키 가져오기

1. 좌측 메뉴 ⚙ **Project Settings** → **API** 클릭
2. 두 값 복사:
   - `Project URL` (https://xxxxx.supabase.co)
   - `anon public` 키 (Project API keys 섹션)

## 3. 환경변수 설정

프로젝트 폴더 안에서:

```bash
cp .env.local.example .env.local
```

`.env.local` 파일을 열어서:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...(긴 문자열)
```

⚠ 저장 후 `npm run dev` 를 한 번 끄고 다시 실행해야 환경변수가 반영됩니다.

## 4. 데이터베이스 스키마 만들기

Supabase 대시보드 → 좌측 **SQL Editor** → **+ New query** 클릭.

### 4-1. 스키마 생성

`supabase/migrations/001_init.sql` 파일 내용 전체 복사 → SQL Editor 에 붙여넣기 → **RUN** 버튼.

`Success. No rows returned.` 메시지가 나오면 OK.

### 4-2. 신규 가입 시 기본 카테고리 자동 시드

다시 **+ New query** → `supabase/migrations/002_seed_function.sql` 내용 복사 → 붙여넣기 → **RUN**.

이제 새 사용자가 가입할 때마다 15개 대분류 + 50개 소분류 + 4개 기본 결제수단(현금·입출금 통장·신용카드·체크카드)이 자동으로 만들어집니다. 가입 후 본인 카드·통장 이름으로 자유롭게 편집하면 돼요.

> 💡 **이동(transfer)으로 기록해야 하는 것들**:
> - **저축 / 투자** — 적금·주식·청약·연금 등에 돈 넣기 (입출금 → 적금 계좌)
> - **신용카드값 갚기** — 카드로 결제할 때 이미 식비·교통 등으로 지출이 기록됐으므로, 납부는 이동
> - **대출 원금 상환** — 대출도 마찬가지 (이자는 "금융비용 → 이자비용"으로 별도 기록)
>
> 핵심 원칙: **자산이 외부로 빠져나갈 때만 지출**. 내 안에서 자리만 옮기는 건 이동.
> 적금/투자 계좌를 [설정 → 결제수단 · 계좌] 에서 미리 만들어두면, 이동 입력 시 입금 계좌로 선택 가능해요.

## 5. 이메일 로그인 활성화

1. 좌측 **Authentication** → **Providers**
2. **Email** 클릭 → **Enable Email provider** 가 ON 인지 확인
3. **Confirm email** 체크박스는 ON 권장 (스팸 방지)

### 매직링크 리다이렉트 URL 등록

1. **Authentication** → **URL Configuration**
2. **Site URL** 에 `http://localhost:3000` 입력
3. **Redirect URLs** 에 다음 추가:
   - `http://localhost:3000/auth/callback`
   - (Vercel 배포 후) `https://your-vercel-domain.vercel.app/auth/callback`

## 6. 첫 로그인

```bash
npm run dev
```

브라우저에서 [http://localhost:3000/login](http://localhost:3000/login) 접속 → 이메일 입력 → **로그인 링크 보내기**.

이메일함에서 링크 클릭 → 홈으로 자동 이동.

## 7. 다음 단계 — 페이지를 실제 데이터로 연결

지금까지는 mock 데이터만 보이지만, 이미:

- DB 테이블 / RLS 정책 ✓
- 인증 미들웨어 (`middleware.ts`) ✓
- 매직링크 로그인 ✓
- 신규 사용자 자동 시드 ✓

가 준비됐어요. 다음 단계에서 각 페이지의 mock 데이터를 Supabase 쿼리로 갈아끼웁니다 (홈 → 내역 → 예산 → 입력 순).

## 트러블슈팅

**"Site URL needs to be set" 에러**
→ Step 5 의 URL Configuration 다시 확인

**로그인 메일이 안 옴**
→ 스팸함 확인. Supabase Free Plan 은 시간당 4통 제한

**Supabase 미설정 상태로 그냥 쓰고 싶음**
→ `.env.local` 비워두면 mock 모드로 동작 (로컬 1대만 사용 가능)
