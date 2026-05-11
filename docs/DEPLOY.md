# Vercel 배포 가이드

## 1. GitHub 에 올리기

```bash
cd "/Users/marketdesigners/Documents/Claude/Projects/가계부 만들기"
git init
git add .
git commit -m "초기 커밋 — 가계부 PWA 골격"
```

[github.com](https://github.com) 에서 새 private 레포 (`bling-budget`) 만들고:

```bash
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/bling-budget.git
git push -u origin main
```

## 2. Vercel 가입 / 임포트

1. [vercel.com](https://vercel.com) 에 GitHub 계정으로 로그인
2. **Add New → Project**
3. 방금 만든 `bling-budget` 레포 임포트
4. **Framework Preset** 은 자동으로 `Next.js` 로 잡힘
5. **Environment Variables** 추가:
   - `NEXT_PUBLIC_SUPABASE_URL` = (Supabase 프로젝트 URL)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (Supabase anon key)
6. **Deploy** 클릭 → 1~2 분 대기

## 3. Supabase 에 Vercel 도메인 등록

배포가 끝나면 Vercel 이 `https://bling-budget-xxx.vercel.app` 같은 URL 을 줍니다.

Supabase 대시보드 → **Authentication** → **URL Configuration**:

- **Site URL**: `https://bling-budget-xxx.vercel.app`
- **Redirect URLs** 에 추가: `https://bling-budget-xxx.vercel.app/auth/callback`

(로컬 개발용 `http://localhost:3000` 도 함께 둬도 됨)

## 4. 모바일에 설치

### iOS (Safari)

1. 배포된 URL 을 Safari 로 열기
2. 공유 버튼 (□↑) → **홈 화면에 추가**
3. 홈 화면에 코랄 색 아이콘 생김 — 탭하면 앱처럼 전체화면으로 열림

### Android (Chrome)

1. 배포된 URL 을 Chrome 으로 열기
2. 메뉴 (⋮) → **앱 설치** 또는 **홈 화면에 추가**

## 5. 커스텀 도메인 (선택)

Vercel 프로젝트 → **Settings → Domains** 에서 본인 도메인 추가 가능. DNS A/CNAME 레코드만 설정해주면 끝.

도메인 바꾸면 다시 Supabase **URL Configuration** 에 추가하는 것 잊지 마세요.

## 트러블슈팅

**빌드 실패 — TypeScript 에러**
→ 로컬에서 `npm run typecheck` 통과시키고 푸시

**로그인 후 무한 리다이렉트**
→ Supabase **Site URL** 이 실제 Vercel 도메인과 정확히 일치하는지 확인. https / http, trailing slash 주의

**PWA 아이콘이 안 나옴**
→ `public/icons/` 의 PNG 파일이 git 에 커밋되어 있는지 확인 (이미지 파일 누락 빈번)

**홈화면 추가 후에도 풀스크린이 안 됨 (iOS)**
→ `manifest.json` 의 `"display": "standalone"` 과 `<meta name="apple-mobile-web-app-capable" content="yes">` 가 들어있는지 — `app/layout.tsx` 에 이미 설정됨
