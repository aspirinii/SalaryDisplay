# SalaryDisplay

근무시간 동안 오늘·이번 주·이번 달 번 돈이 초 단위로 쌓이는 모습을 보여주는 웹앱.

**바로 쓰기: https://aspirinii.github.io/SalaryDisplay/**
계획: [PLAN.md](PLAN.md)

```bash
npm install
npm run dev      # 개발 서버 (http://localhost:5173)
npm test         # 계산 엔진 테스트
npm run build    # dist/ 정적 빌드 (PWA 포함)
npm run preview  # 빌드 결과 로컬 확인 (http://localhost:4173)
npm run icons    # 앱 아이콘 다시 만들기 (public/icons)
```

## 사용법

- **⚙︎ 설정**: 급여, 요일별 근무·휴게, 주·월 기준, 쉬는 날, 표시 방식(스킨 6종, 테마, 색, 글꼴, 축하 효과)
- **⛶ 전체화면** 또는 `F` 키: 대시보드 모드. 2.5초 동안 마우스를 안 움직이면 버튼·커서가 숨겨지고, 켜져 있는 동안 화면이 꺼지지 않음. `Esc`로 나가기
- 설정은 브라우저(localStorage)에만 저장됨

## GitHub Pages 배포

1. GitHub에 저장소를 만들고 이 프로젝트를 push
2. 저장소 **Settings → Pages → Source**를 **GitHub Actions**로 설정
3. 이후 `main`에 push할 때마다 테스트 → 빌드 → 배포 (`.github/workflows/deploy.yml`)
