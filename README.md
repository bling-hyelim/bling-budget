# 블링 가계부

개인용 PWA 가계부. 모바일 우선, 한국식 만/억 표기, 코랄 톤.

## 빠른 시작

```bash
# 1) 패키지 설치
npm install

# 2) 환경변수 (Supabase 연결은 Phase 6부터, 지금은 mock 데이터로 동작)
cp .env.local.example .env.local
# (지금은 비어 있어도 동작합니다)

# 3) 개발 서버
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)

## 진행 상황

- [x] 명세서 / 스키마 문서 (`docs/SPEC.md`, `docs/SCHEMA.md`, `docs/SETUP.md`, `docs/DEPLOY.md`)
- [x] Next.js + TypeScript + Tailwind 세팅
- [x] 디자인 토큰 (코랄 팔레트)
- [x] 한국식 금액 포맷 유틸
- [x] 홈·입력·내역·예산·설정 5개 화면 (목 데이터)
- [x] Supabase 스키마 SQL + 매직링크 로그인 + 인증 미들웨어
- [x] PWA manifest / 아이콘 / Apple Web App 설정
- [ ] Mock 데이터 → Supabase 쿼리로 전환 (다음)
- [ ] Vercel 배포 (사용자 액션 필요 — `docs/DEPLOY.md`)

## 폴더 구조

```
app/                  # Next.js App Router 라우트
  layout.tsx
  globals.css
  page.tsx            # 홈
components/           # 재사용 컴포넌트
lib/                  # 포맷 유틸, mock data, supabase 클라이언트 (예정)
docs/                 # 명세·스키마 문서
public/               # 정적 자원, PWA manifest, 아이콘
```
