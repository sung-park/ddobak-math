# 또박또박 수학 — 개발 계획서 (research.md)

> **목표**: 느린 학습자(초등 1~3학년)를 위한 무료 수학 게임 PWA
> **핵심 가치**: 좌절 없는 반복, 구조적 이해, 즉각 피드백, 실물 보상 연계
> **기술 스택**: 바닐라 HTML/CSS/JS, PWA (Service Worker + Web App Manifest), IndexedDB
> **작성 기준일**: 2026.03

---

## 1. 프로젝트 구조

```
ddobak-math/
├── index.html                  # SPA 엔트리 + 라우터
├── manifest.json               # PWA 매니페스트
├── sw.js                       # Service Worker (오프라인 캐싱)
├── favicon.ico
│
├── css/
│   ├── global.css              # 리셋, 변수, 타이포그래피
│   ├── components.css          # 공용 컴포넌트 (버튼, 카드, 모달, 토스트)
│   ├── home.css                # 홈 화면
│   ├── game-common.css         # 게임 공용 레이아웃
│   └── parent.css              # 부모 대시보드
│
├── js/
│   ├── app.js                  # SPA 라우터, 초기화
│   ├── router.js               # Hash 기반 라우팅
│   │
│   ├── engine/                 # 공통 엔진 (모든 게임이 의존)
│   │   ├── game-engine.js      # 문제 출제 → 정답 판정 → 피드백 루프
│   │   ├── reward-engine.js    # 적립 규칙, 어뷰징 감지, 일일 상한
│   │   ├── mastery-tracker.js  # 개념별 숙달도 계산·갱신
│   │   ├── sound-manager.js    # 효과음 재생 (Web Audio API)
│   │   ├── animation.js        # 공용 애니메이션 유틸 (CSS transition 트리거)
│   │   └── storage.js          # IndexedDB CRUD 래퍼
│   │
│   ├── games/                  # 게임 모듈 (각각 공통 인터페이스 구현)
│   │   ├── number-line.js      # 게임1: 수 놀이터
│   │   ├── block-calc.js       # 게임2: 블록 쌓기 계산기
│   │   ├── matrix.js           # 게임3: 구구단 매트릭스
│   │   ├── clock.js            # 게임4: 시계 맞추기
│   │   ├── coins.js            # 게임5: 동전 모으기
│   │   ├── counting-farm.js    # 게임6: 묶어 세기 농장
│   │   ├── scale.js            # 게임7: 크기 비교 저울
│   │   ├── pizza.js            # 게임8: 피자 나누기
│   │   ├── shape-sort.js       # 게임9: 도형 분류 상자
│   │   └── division-tree.js    # 게임10: 나눗셈 나무
│   │
│   ├── screens/                # 화면 컴포넌트
│   │   ├── home.js             # 홈 화면
│   │   ├── curriculum.js       # 학습하기 (학년/학기/단원 선택)
│   │   ├── daily-pick.js       # 오늘의 추천
│   │   ├── shop.js             # 과자 가게
│   │   ├── my-record.js        # 나의 기록
│   │   └── settings.js         # 설정 (부모 PIN 진입)
│   │
│   └── parent/                 # 부모 대시보드
│       ├── dashboard.js        # 메인 대시보드
│       ├── report.js           # 학습 리포트
│       ├── exchange.js         # 교환 승인 관리
│       └── shop-edit.js        # 과자 목록 편집
│
├── data/
│   ├── concepts.json           # 교과 개념 트리 (학년-학기-단원-개념ID)
│   └── questions/              # 개념별 문제 풀
│       ├── number-1-1.json     # 1학년 1학기 수 개념
│       ├── add-sub-1-1.json    # 1학년 1학기 덧뺄셈
│       └── ...
│
├── assets/
│   ├── sounds/                 # 효과음 (mp3/ogg, 각 1초 이내)
│   │   ├── correct.mp3
│   │   ├── wrong.mp3
│   │   ├── bonus.mp3
│   │   ├── combo.mp3
│   │   └── coin.mp3
│   ├── icons/                  # PWA 아이콘 (192×192, 512×512)
│   └── images/                 # 게임 내 이미지 (SVG 우선)
│       ├── coins/              # 동전 이미지
│       ├── snacks/             # 과자 이미지
│       └── characters/         # 캐릭터 일러스트
│
└── docs/
    └── (이 파일 등 기획·설계 문서)
```

---

## 2. 핵심 아키텍처 설계

### 2-1. SPA 라우팅 (Hash Router)

프레임워크 없이 해시 기반 라우팅으로 화면 전환을 구현합니다.

```
#/                → 홈
#/learn           → 학습하기 (학년 선택)
#/learn/1-1       → 1학년 1학기 단원 목록
#/game/block-calc/lv2  → 블록 쌓기 계산기 레벨2 플레이
#/daily           → 오늘의 추천
#/shop            → 과자 가게
#/record          → 나의 기록
#/settings        → 설정
#/parent          → 부모 대시보드 (PIN 인증 후)
```

**구현 방식**:
- `window.addEventListener('hashchange', ...)` 로 라우트 변경 감지
- 각 화면 모듈이 `render(container)` / `destroy()` 인터페이스 구현
- 화면 전환 시 CSS `fade` 트랜지션 (150ms) 적용

### 2-2. 게임 엔진 공통 인터페이스

모든 게임 모듈은 아래 인터페이스를 반드시 구현합니다.

```js
class GameBase {
  constructor(container, level, conceptId) {}

  // 게임 초기화 (UI 렌더링, 이벤트 바인딩)
  init() {}

  // 문제 1개 생성 → { question, choices, answer, metadata }
  generateQuestion() {}

  // 정답 판정 → { isCorrect, attemptCount }
  checkAnswer(userAnswer) {}

  // 피드백 표시 (정답/오답 애니메이션 + 사운드)
  showFeedback(isCorrect, correctAnswer) {}

  // 구조적 이해 힌트 표시 (3회 오답 시)
  showHint(question, correctAnswer) {}

  // 게임 종료 → 결과 요약 화면
  finish() {}

  // 리소스 해제
  destroy() {}
}
```

**게임 흐름 (game-engine.js가 관리)**:
```
init()
  └→ generateQuestion()
       └→ 사용자 입력 대기
            └→ checkAnswer()
                 ├→ 정답 → showFeedback(true) → reward-engine 적립 → 다음 문제
                 ├→ 1~2회 오답 → showFeedback(false) → 재시도
                 └→ 3회 오답 → showHint() → 정답 표시 → 다음 문제
  (문제 수 완료 시)
  └→ finish() → 결과 요약 → 홈으로 복귀
```

### 2-3. 데이터 저장 (IndexedDB)

**오프라인 퍼스트** 설계 — 인터넷 없이 모든 기능이 동작해야 합니다.

```
IndexedDB: "ddobak-math"

Object Stores:
┌─────────────────┬─────────────────────────────────────────┐
│ users            │ user_id, name, grade, semester,         │
│                  │ avatar, pin_hash, created_at            │
├─────────────────┼─────────────────────────────────────────┤
│ play_logs        │ log_id, user_id, game_type, concept_id, │
│                  │ level, question_data, answer,           │
│                  │ is_correct, attempt_count, hint_used,   │
│                  │ time_spent_ms, earned_coins, played_at  │
├─────────────────┼─────────────────────────────────────────┤
│ mastery          │ user_id+concept_id (복합키),             │
│                  │ total_attempts, correct_count,          │
│                  │ current_streak, mastery_level (0~100),  │
│                  │ last_played_at                          │
├─────────────────┼─────────────────────────────────────────┤
│ coins            │ user_id, balance, total_earned,         │
│                  │ total_spent, daily_earned, daily_date   │
├─────────────────┼─────────────────────────────────────────┤
│ transactions     │ tx_id, user_id, type, amount,           │
│                  │ source, description, created_at         │
├─────────────────┼─────────────────────────────────────────┤
│ exchange_requests│ request_id, user_id, item_name,         │
│                  │ item_price, status, requested_at,       │
│                  │ resolved_at                             │
├─────────────────┼─────────────────────────────────────────┤
│ shop_items       │ item_id, user_id, name, price,          │
│                  │ emoji, is_active                        │
├─────────────────┼─────────────────────────────────────────┤
│ settings         │ key, value                              │
│                  │ (daily_coin_limit, play_time_limit 등)  │
└─────────────────┴─────────────────────────────────────────┘
```

**storage.js 핵심 API**:
```js
storage.get(storeName, key)
storage.put(storeName, record)
storage.getAll(storeName, indexName?, range?)
storage.delete(storeName, key)
storage.count(storeName, indexName?, range?)
```

### 2-4. 보상 엔진 (reward-engine.js)

```
적립 판정 흐름:

1) 정답 시 → 기본 1원
2) 어뷰징 체크:
   - 같은 유형 10회 연속 정답? → 적립 0.5원으로 감소
   - 같은 유형 20회 연속 정답? → 적립 0원 + "새 도전" 넛지
3) 일일 상한 체크:
   - daily_earned >= daily_coin_limit(기본 50원)? → 적립 0원 + "내일 또 하자" 메시지
4) 콤보 보너스:
   - 5연속 → +2원
   - 10연속 → +5원
5) 신규 단원 보너스: +3원
6) 도전 문제(난이도 혼합 20%) 정답: 2원
```

### 2-5. 숙달도 추적 (mastery-tracker.js)

```
숙달도(mastery_level) 계산:

  mastery_level = (최근 20문제 정답률 × 0.6) + (누적 정답률 × 0.2) + (연속 정답 보너스 × 0.2)

  - 최근 20문제 정답률: 최신 데이터에 가중치를 두어 현재 실력 반영
  - 누적 정답률: 장기적 안정성 반영
  - 연속 정답 보너스: streak 5 이상이면 가산점

등급:
  0~30:  입문 (🌱)
  31~60: 성장 (🌿)
  61~85: 숙련 (🌳)
  86~100: 마스터 (⭐)

취약 영역 감지:
  - mastery_level < 60 && total_attempts >= 10 → 취약 영역으로 분류
  - "오늘의 추천"에 해당 개념의 문제를 우선 배치
```

---

## 3. UI/UX 설계 원칙

### 3-1. 느린 학습자 특화 UX

| 원칙 | 구현 방법 |
|------|-----------|
| **인지 부하 최소화** | 한 화면 선택지 최대 4개. 텍스트 최소화, 아이콘+숫자 중심. 1회 플레이 5분 이내 |
| **좌절 없는 안전망** | 3회 오답 시 정답 표시 + 격려 메시지. 점수 경쟁 요소 없음. 틀려도 벌칙 없음 |
| **구조적 이해** | 모든 게임에 "왜 그 답인지" 시각적으로 보여주는 장치 포함 |
| **즉각 피드백** | 정답: 0.3초 이내 시각+청각 반응. 오답: 부드럽게 "다시 해 봐" |
| **자기주도 반복** | 모든 조작이 터치 한 번. 텍스트 읽기 없이 진행 가능. 부모 도움 없이 플레이 가능 |

### 3-2. 격려 메시지 풀 (랜덤 출력)

```
정답 시:
  "잘했어!", "대단해!", "맞았어! 👏", "멋져!", "정답이야!",
  "와, 똑똑한데?", "완벽해!", "최고야!"

오답 시:
  "괜찮아, 다시 해 보자!", "아깝다! 한 번 더!", "천천히 생각해 봐!",
  "거의 다 왔어!", "실수는 괜찮아!"

3회 오답 시:
  "어려웠지? 정답을 보여줄게!", "다음에 또 나오면 맞출 수 있어!",
  "이건 좀 어려운 거야. 괜찮아!"

콤보 시:
  "5연속 정답! 대단해! 🎉", "10연속! 수학 천재구나! 🌟"
```

### 3-3. 컬러 시스템

```css
:root {
  /* 메인 팔레트 — 따뜻하고 부드러운 톤 */
  --color-primary: #4ECDC4;      /* 민트 — 메인 액센트 */
  --color-primary-dark: #3BA99E;
  --color-secondary: #FF6B6B;    /* 코랄 — 강조, 보상 */
  --color-warning: #FFE66D;      /* 노랑 — 경고, 힌트 */
  --color-success: #95E1D3;      /* 연두 — 정답 피드백 */
  --color-error: #F38181;        /* 연분홍 — 오답 피드백 (공포감 없는 색) */

  /* 자릿값 색상 코딩 (블록 쌓기 계산기 등) */
  --color-ones: #FFD93D;         /* 일의 자리: 노랑 */
  --color-tens: #6BCB77;         /* 십의 자리: 초록 */
  --color-hundreds: #4D96FF;     /* 백의 자리: 파랑 */
  --color-thousands: #FF6B6B;    /* 천의 자리: 빨강 */

  /* 배경 */
  --bg-main: #FFF8F0;            /* 크림색 배경 — 눈 편안 */
  --bg-card: #FFFFFF;
  --bg-game: #F0F7FF;            /* 게임 영역 배경 */

  /* 텍스트 */
  --text-primary: #2D3436;
  --text-secondary: #636E72;
  --text-light: #B2BEC3;

  /* 타이포그래피 */
  --font-main: 'Pretendard', -apple-system, sans-serif;
  --font-number: 'Pretendard', monospace;  /* 숫자 정렬용 */

  /* 크기 — 큰 터치 타겟 (최소 48px) */
  --touch-min: 48px;
  --touch-comfortable: 56px;
  --border-radius: 16px;
}
```

### 3-4. 반응형 레이아웃

```
타겟 디바이스 우선순위:
  1순위: 태블릿 세로 (768×1024) — 가정에서 가장 흔한 학습 디바이스
  2순위: 스마트폰 세로 (375×667 ~ 428×926)
  3순위: 태블릿 가로 (1024×768)

Breakpoints:
  --mobile:  max-width 480px
  --tablet:  min-width 481px and max-width 1024px
  --desktop: min-width 1025px (부모 대시보드 전용)

게임 영역:
  - 정사각형에 가까운 비율 유지 (aspect-ratio: 3/4)
  - viewport 기준 상대 크기 사용 (vw, vh, vmin)
  - 터치 타겟 최소 48×48px (WCAG 2.1 기준)
```

### 3-5. 접근성

| 항목 | 기준 |
|------|------|
| 터치 타겟 | 최소 48×48px, 간격 8px 이상 |
| 폰트 크기 | 본문 18px 이상, 숫자 24px 이상, 문제 텍스트 22px 이상 |
| 색 대비 | WCAG AA 기준 (4.5:1) 이상 |
| 색맹 대응 | 색상만으로 정보 전달하지 않음 (아이콘/텍스트 병행) |
| 애니메이션 | `prefers-reduced-motion` 미디어 쿼리 대응 |

---

## 4. 게임별 구현 상세

### 4-1. 블록 쌓기 계산기 (MVP 1순위)

**핵심 가치**: 받아올림/받아내림을 **눈으로 보고 손으로 조작**하며 이해

**문제 생성 로직**:
```
Lv1: a + b (a, b ∈ [1,9], a+b ≤ 9)     — 올림 없음
Lv2: a + b (a, b ∈ [1,9], a+b > 9)      — 올림 있음
Lv3: ab ± cd (두 자리 ± 두 자리)          — 올림/내림 혼합
Lv4: abc ± def (세 자리 ± 세 자리)        — 연속 올림/내림 포함

문제 생성 시 주의:
  - 뺄셈 결과가 음수가 되지 않도록 보장
  - 같은 문제가 연속 출제되지 않도록 최근 5문제 캐싱
  - Lv3~4에서 받아올림/내림이 있는 경우와 없는 경우를 8:2로 혼합
```

**UI 구성**:
```
┌─────────────────────────────────┐
│  [← 뒤로]    26 + 17 = ?   💰32 │  ← 상단바
├─────────────────────────────────┤
│                                  │
│   십의 자리(파랑)  일의 자리(노랑)  │
│   ┌────────┐    ┌────────┐      │
│   │ ██ ██  │    │ ██████ │ ← 26 │
│   │        │    │        │      │
│   │ █      │    │ ███████│ ← 17 │
│   └────────┘    └────────┘      │
│                                  │
│   일의 자리 13개!                 │
│   10개가 모이면... 합체! ⬆       │
│                                  │
│   ┌────────┐    ┌────────┐      │
│   │ ███ █  │    │ ███    │ ← 43 │  ← 결과 영역
│   └────────┘    └────────┘      │
│                                  │
├─────────────────────────────────┤
│    [33]    [43]    [53]          │  ← 선택지 (3개)
└─────────────────────────────────┘
```

**애니메이션 시퀀스** (받아올림):
1. 두 수의 블록이 각 자릿값 칸에 표시됨 (0.5초)
2. 일의 자리 블록이 합쳐짐 → 개수 카운트 표시 (0.5초)
3. 10개 이상이면 → 10개가 반짝이며 묶임 (0.3초)
4. 묶인 블록이 십의 자리로 올라가는 애니메이션 (0.5초, ease-out)
5. 나머지 블록이 일의 자리에 남음 (0.2초)
6. 선택지 표시 → 사용자 입력 대기

**오답 시 피드백**:
- 1회: "다시 세어 볼까?" + 블록 개수가 숫자로 표시
- 2회: "10개가 모이면 올라간다는 걸 기억해!" + 올림 과정 재생
- 3회: 정답 블록이 하이라이트 + "일의 자리 6+7=13, 10개가 올라가서 십의 자리 2+1+1=4, 답은 43!" 텍스트

### 4-2. 구구단 매트릭스 (MVP 2순위)

**핵심 가치**: 곱셈표의 **패턴과 대칭**을 시각적으로 발견

**문제 생성 로직**:
```
Lv1: 2,5단 영역 (2×2 ~ 5×5 중 빈칸 6개)
Lv2: 2~5단 전체 (빈칸 8개)
Lv3: 6~9단 (빈칸 8개)
Lv4: 전체 9×9 (빈칸 12개)

빈칸 선택 시 고려:
  - 숙달도가 낮은 구구단을 우선 출제
  - 교환법칙 쌍 (3×7, 7×3) 중 하나를 빈칸으로 → 맞추면 대칭 위치도 자동 채워짐
```

**UI 핵심 요소**:
- 곱셈표 그리드: CSS Grid로 구현, 각 셀 터치 시 선택지 팝업
- 같은 값을 가진 셀은 동일 배경색 → 패턴 인식 유도
- 행/열 완성 시 해당 줄이 반짝이며 뛰어 세기 패턴 강조
- 교환법칙: 대칭 위치 셀이 동시 하이라이트 (반투명 연결선)

### 4-3. 수 놀이터 (MVP 3순위)

**핵심 가치**: 수직선 위에서 **수의 위치와 순서**를 직관적으로 체감

**문제 생성 로직**:
```
Lv1: 0~9 수직선, 1칸 간격, 선택지 3개
Lv2: 0~50, 5칸 간격, 선택지 4개
Lv3: 0~100, 10칸 간격, 선택지 4개
Lv4: 100~1000, 100칸 간격, 선택지 4개

수직선에 이미 배치된 기준점(앵커) 2~3개를 표시하여 위치 추론의 단서 제공
```

**인터랙션**:
- 수직선 좌우 스와이프로 스크롤
- 빈 위치에 `?` 마커 표시
- 선택지 터치 → 캐릭터가 해당 위치로 점프하는 애니메이션
- 정답 시 별 이펙트, 오답 시 정답 위치가 깜빡임

---

## 5. 문제 데이터 구조

### 5-1. 교과 개념 트리 (concepts.json)

```json
{
  "concepts": [
    {
      "id": "num-1-1-1",
      "grade": 1,
      "semester": 1,
      "unit": 1,
      "name": "9까지의 수",
      "keywords": ["수 세기", "읽기", "쓰기", "순서", "0", "크기 비교"],
      "prerequisites": [],
      "games": [
        { "type": "number-line", "levels": [1] }
      ]
    },
    {
      "id": "add-sub-1-1-3",
      "grade": 1,
      "semester": 1,
      "unit": 3,
      "name": "한 자리 수 덧셈과 뺄셈",
      "keywords": ["모으기", "가르기", "덧셈", "뺄셈", "+", "-", "="],
      "prerequisites": ["num-1-1-1"],
      "games": [
        { "type": "block-calc", "levels": [1] }
      ]
    }
  ]
}
```

### 5-2. 문제 풀 형식 (questions/*.json)

문제는 JSON으로 관리하되, 대부분의 문제는 **런타임에 자동 생성**합니다. JSON 파일은 특수 문제(함정 문제, 스토리 문제)에만 사용합니다.

```json
{
  "concept_id": "add-sub-1-1-3",
  "generator": "block-calc",
  "static_questions": [
    {
      "id": "q001",
      "type": "addition",
      "operand1": 3,
      "operand2": 5,
      "answer": 8,
      "hint": "3개와 5개를 모아 보세요",
      "common_mistake": 2,
      "mistake_explanation": "빼기가 아니라 더하기예요!"
    }
  ]
}
```

**런타임 문제 생성 원칙**:
- 각 게임 모듈의 `generateQuestion()`에서 난이도 파라미터 기반 랜덤 생성
- 오답 선택지는 **흔한 실수 패턴** 기반 생성 (예: 받아올림 누락값, ±1 오차)
- 최근 5문제와 중복되지 않도록 캐싱

---

## 6. Service Worker & PWA

### 6-1. 캐싱 전략

```
Cache-first (정적 자산):
  - HTML, CSS, JS 파일
  - 이미지, 아이콘
  - 효과음 파일
  - 문제 데이터 JSON

Network-first (향후 동기화 시):
  - API 요청 (Firebase/Supabase)
  - 부모 대시보드 데이터

캐시 버전 관리:
  - sw.js에 CACHE_VERSION 상수
  - activate 이벤트에서 구버전 캐시 삭제
```

### 6-2. manifest.json

```json
{
  "name": "또박또박 수학",
  "short_name": "또박수학",
  "description": "느린 학습자를 위한 초등 수학 게임",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#FFF8F0",
  "theme_color": "#4ECDC4",
  "icons": [
    { "src": "/assets/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/assets/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### 6-3. 설치 유도

- 첫 방문 3회차에 "홈 화면에 추가하면 더 편해요!" 배너 표시
- `beforeinstallprompt` 이벤트 캡처하여 커스텀 설치 UI 제공
- 설치 후에는 배너 숨김

---

## 7. 사운드 디자인

### 7-1. 효과음 목록

| 상황 | 파일명 | 길이 | 설명 |
|------|--------|------|------|
| 정답 | correct.mp3 | 0.5초 | 밝은 "딩!" (C장조 화음) |
| 오답 | wrong.mp3 | 0.3초 | 부드러운 "뿅" (위협적이지 않은 톤) |
| 콤보(5연속) | combo.mp3 | 1.0초 | 상승 아르페지오 |
| 코인 적립 | coin.mp3 | 0.4초 | 동전 떨어지는 "찰랑" |
| 레벨 완료 | complete.mp3 | 1.5초 | 팡파레 |
| 버튼 터치 | tap.mp3 | 0.1초 | 가벼운 클릭 |
| 블록 합체 | merge.mp3 | 0.6초 | "슝" + "탁" (받아올림) |
| 블록 분리 | split.mp3 | 0.6초 | "파삭" (받아내림) |

### 7-2. 구현 방식

- **Web Audio API** 사용 (HTMLAudioElement보다 지연 시간 짧음)
- AudioContext를 한 번만 생성, AudioBuffer로 사전 로딩
- 사용자 첫 터치 이벤트에서 AudioContext.resume() 호출 (브라우저 자동재생 정책 대응)
- 음소거 토글 버튼 (설정에 저장)

---

## 8. 부모 대시보드 상세

### 8-1. PIN 인증

- 4자리 숫자 PIN (설정 화면에서 등록)
- 3회 오답 시 30초 잠금
- PIN은 SHA-256 해시로 IndexedDB에 저장 (평문 저장 금지)

### 8-2. 대시보드 화면 구성

```
[부모 대시보드]

탭1: 오늘의 학습
  - 풀이 문제 수, 정답률, 학습 시간
  - 오늘 적립/누적 적립
  - 시간대별 학습 그래프 (막대)

탭2: 학습 분석
  - 개념별 숙달도 히트맵 (학년-학기-단원 트리)
  - 취약 영역 알림 (정답률 60% 미만)
  - 주간 추이 그래프 (꺾은선)

탭3: 교환 관리
  - 대기 중인 교환 요청 목록
  - 승인/거절 버튼
  - 교환 이력

탭4: 설정
  - 일일 적립 상한 조절 (30~100원)
  - 일일 플레이 시간 제한 (15~60분)
  - 과자 목록 편집 (이름, 가격, 이모지)
  - 데이터 초기화 (확인 2회)
```

### 8-3. 학습 분석 알고리즘

```
취약 영역 감지:
  SELECT concept_id, mastery_level, total_attempts
  FROM mastery
  WHERE mastery_level < 60 AND total_attempts >= 10
  ORDER BY mastery_level ASC

오늘의 추천 생성:
  1. 취약 영역 개념 중 2~3개 선택
  2. 각 개념에 해당하는 게임+레벨 매칭
  3. 현재 숙달도보다 한 단계 낮은 레벨부터 시작 (성공 경험 보장)
  4. 총 3~5문제 세트 구성
```

---

## 9. 성능 최적화

| 항목 | 목표 | 방법 |
|------|------|------|
| 초기 로딩 | < 2초 (3G 기준) | 핵심 CSS 인라인, JS 지연 로딩, 이미지 SVG 사용 |
| 게임 전환 | < 0.5초 | 게임 모듈 동적 import(), 프리로드 힌트 |
| 애니메이션 | 60fps | CSS transform/opacity만 사용, will-change 힌트 |
| 메모리 | < 50MB | 게임 종료 시 DOM 및 AudioBuffer 해제 |
| 번들 크기 | < 200KB (gzip) | 프레임워크 미사용, 트리쉐이킹 불필요 |
| 이미지 | 최소화 | SVG 우선, PNG는 TinyPNG 압축, WebP 미지원 기기 대비 |

**지연 로딩 전략**:
```js
// 게임 시작 시에만 해당 모듈 로딩
async function loadGame(gameType) {
  const module = await import(`./games/${gameType}.js`);
  return new module.default(container, level, conceptId);
}

// 홈 화면 렌더링 시 다음에 플레이할 가능성이 높은 게임 프리로드
function preloadNextGame(conceptId) {
  const nextGame = getRecommendedGame(conceptId);
  import(`./games/${nextGame}.js`); // 프리로드만, 인스턴스 생성 안 함
}
```

---

## 10. 테스트 전략

### 10-1. 단위 테스트 (선택적)

프레임워크 없이 간단한 테스트 러너를 자체 구현하거나, 향후 필요 시 Vitest 도입.

```
테스트 대상 (우선순위):
  1. reward-engine.js — 적립 계산, 어뷰징 감지, 일일 상한
  2. mastery-tracker.js — 숙달도 계산
  3. 각 게임의 generateQuestion() — 문제 생성 범위, 중복 방지
  4. 각 게임의 checkAnswer() — 정답 판정
```

### 10-2. 수동 테스트 체크리스트

```
[ ] 각 게임 Lv1~Lv4 플레이 가능
[ ] 3회 오답 → 힌트 → 정답 표시 동작
[ ] 적립 정상 누적
[ ] 일일 상한 도달 시 메시지 표시
[ ] 5/10연속 콤보 보너스 동작
[ ] 과자 가게 구매 요청 흐름
[ ] 부모 PIN 인증
[ ] 부모 대시보드 데이터 표시
[ ] 오프라인 상태에서 전체 동작
[ ] PWA 설치 후 동작
[ ] 태블릿/모바일 반응형 레이아웃
[ ] 효과음 재생 (음소거 토글 포함)
[ ] 뒤로가기 네비게이션
```

---

## 11. 개발 로드맵 상세

### Phase 1: 기반 구조 (1주)

| 일차 | 작업 | 산출물 |
|------|------|--------|
| D1 | 프로젝트 초기 세팅: 폴더 구조, index.html, global.css, manifest.json, sw.js | 빈 PWA 셸 |
| D2 | SPA 라우터 구현 (router.js, app.js) | 해시 기반 화면 전환 동작 |
| D3 | IndexedDB 래퍼 (storage.js) + 초기 스키마 생성 | CRUD API 완성 |
| D4 | 게임 엔진 (game-engine.js): 문제 루프, 시도 횟수 추적, 피드백 흐름 | 엔진 프로토타입 |
| D5 | 보상 엔진 (reward-engine.js) + 숙달도 추적 (mastery-tracker.js) | 적립/숙달도 로직 |
| D6 | 사운드 매니저 (sound-manager.js) + 효과음 파일 준비 | 오디오 시스템 |
| D7 | 공용 CSS (components.css) + 홈 화면 (home.js, home.css) | 첫 화면 완성 |

### Phase 2: MVP 게임 3종 (2~3주)

| 주차 | 작업 | 산출물 |
|------|------|--------|
| W2 | 블록 쌓기 계산기 — 문제 생성, UI, 블록 애니메이션, 받아올림/내림 시각화 | 게임 1 완성 |
| W3 | 구구단 매트릭스 — 곱셈표 그리드, 빈칸 출제, 교환법칙 시각화, 패턴 색상 | 게임 2 완성 |
| W3 | 수 놀이터 — 수직선 UI, 스크롤, 점프 애니메이션, 난이도 4단계 | 게임 3 완성 |

### Phase 3: 학습 흐름 완성 (1~2주)

| 작업 | 산출물 |
|------|--------|
| 학습하기 화면 (curriculum.js) — 학년/학기/단원 트리 네비게이션 | 교과 연동 완성 |
| 오늘의 추천 (daily-pick.js) — 취약 영역 기반 문제 세트 자동 구성 | 맞춤 학습 |
| 나의 기록 (my-record.js) — 학습 통계, 숙달도 시각화, 적립금 현황 | 동기 부여 화면 |
| concepts.json 전체 교과 트리 작성 | 1~3학년 6학기 매핑 |

### Phase 4: 보상 시스템 (1주)

| 작업 | 산출물 |
|------|--------|
| 과자 가게 UI (shop.js) — 상품 목록, 구매 요청 흐름 | 보상 교환 |
| 부모 대시보드 (parent/*.js) — PIN, 학습 리포트, 교환 승인, 설정 | 부모 관리 |
| 어뷰징 방지 로직 통합 + 넛지 메시지 | 건전한 학습 유도 |

### Phase 5: 폴리싱 & 배포 (1주)

| 작업 | 산출물 |
|------|--------|
| 전체 플레이 테스트 + 버그 수정 | 안정성 확보 |
| 애니메이션/이펙트 다듬기 | 상용 수준 UX |
| Lighthouse 점수 최적화 (PWA 100, Performance 90+) | 성능 보장 |
| GitHub Pages 또는 Netlify 배포 | 무료 호스팅 |
| OG 태그, 공유 메시지 설정 | 입소문 준비 |

**총 예상 기간: MVP 6~8주**

---

## 12. 배포 & 호스팅

| 옵션 | 비용 | 장점 | 단점 |
|------|------|------|------|
| **GitHub Pages** | 무료 | 설정 간단, HTTPS 자동 | 커스텀 도메인 설정 약간 번거로움 |
| **Netlify** | 무료 (100GB/월) | 자동 배포, 프리뷰 URL, 폼 처리 | 무료 티어 제한 |
| **Vercel** | 무료 | 빠른 CDN, 자동 배포 | 상업적 사용 시 유료 |
| **Cloudflare Pages** | 무료 | 무제한 대역폭, 빠른 CDN | 빌드 시간 제한 |

**추천**: 정적 사이트이므로 **GitHub Pages** (가장 단순) 또는 **Cloudflare Pages** (성능 최고)

---

## 13. 향후 확장 시 고려사항

### 13-1. 클라우드 동기화 (v2.0)

```
IndexedDB (로컬)  ←→  Firebase Firestore (클라우드)

동기화 전략:
  - 기기 온라인 감지 시 변경분만 push
  - 충돌 시 timestamp 기준 최신 우선
  - 오프라인 큐: 온라인 복귀 시 일괄 동기화

Firebase 무료 티어 (Spark Plan):
  - 저장소: 1GB
  - 읽기: 50,000회/일
  - 쓰기: 20,000회/일
  → 개인/소규모 사용에 충분
```

### 13-2. 다중 자녀 지원 (v3.0)

- 홈 화면에 프로필 선택 UI 추가
- users 테이블에 여러 프로필 저장
- 각 프로필별 독립된 학습 이력, 적립금

### 13-3. 적응형 난이도 (v3.0)

```
현재 방식: 사용자가 레벨 직접 선택
적응형 방식:
  - 정답률 90% 이상 5문제 연속 → 자동으로 다음 레벨 제안
  - 정답률 50% 미만 3문제 연속 → "더 쉬운 문제부터 해 볼까?" 제안
  - 오답 패턴 분석 → 특정 유형(예: 7×8) 집중 출제
```

---

## 14. 핵심 리스크 & 대응

| 리스크 | 영향 | 대응 |
|--------|------|------|
| 바닐라 JS로 복잡한 UI 관리 어려움 | 코드 유지보수 비용 증가 | 게임 모듈 패턴으로 격리, 공통 인터페이스로 일관성 유지 |
| 애니메이션 성능 (저사양 기기) | 학습 경험 저하 | CSS 애니메이션 우선, JS 애니메이션은 requestAnimationFrame만 사용, `prefers-reduced-motion` 대응 |
| IndexedDB 브라우저 호환성 | 데이터 손실 | 모든 타겟 브라우저(Chrome, Safari, Samsung Internet)에서 지원됨. localStorage 폴백 불필요 |
| 사운드 자동재생 정책 | 첫 효과음 누락 | 첫 사용자 제스처에서 AudioContext.resume() 호출 |
| 아이가 흥미를 잃음 | 서비스 방치 | 다양한 게임, 보상 시스템, 콤보 이펙트로 재미 요소 강화. 부모 참여 유도 |
| 교육적 효과 미검증 | 신뢰도 저하 | 2022 개정 교육과정 충실 반영. 향후 사용자 피드백 수집 후 개선 |

---

## 15. 첫 번째 작업: 프로젝트 초기 세팅

위 계획에 따라, 개발 시작 시 아래 순서로 진행합니다:

```
1. index.html — PWA 셸 (메타 태그, 뷰포트, 폰트 로딩)
2. css/global.css — CSS 변수, 리셋, 타이포그래피
3. css/components.css — 버튼, 카드, 모달 기본 스타일
4. manifest.json — PWA 매니페스트
5. sw.js — Service Worker (정적 자산 캐싱)
6. js/router.js — 해시 기반 SPA 라우터
7. js/app.js — 앱 초기화, 라우터 연결
8. js/engine/storage.js — IndexedDB 래퍼
9. js/engine/game-engine.js — 게임 공통 루프
10. js/engine/reward-engine.js — 보상 시스템
```
