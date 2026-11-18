/** 0 = 일요일 … 6 = 토요일 (Date#getDay와 동일) */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

/** "HH:MM" 24시간제 */
export interface TimeRange {
  start: string
  end: string
}

export interface BreakRange extends TimeRange {
  /** 휴게 중에도 돈이 쌓이는지. 없으면 Settings.breaksPaidByDefault 사용 */
  paid?: boolean
}

export interface DaySchedule {
  enabled: boolean
  /** end <= start 이면 다음날로 넘어가는 야간 근무 */
  work: TimeRange
  breaks: BreakRange[]
}

export type PayType = 'annual' | 'monthly' | 'hourly'

export type RateBasis =
  /** 월급 ÷ 해당 월 실제 유급 근무 초 → 월말 퇴근 시 정확히 월급 */
  | 'actualSchedule'
  /** 월급 ÷ (고정 월 시간 × 3600) → 초당 단가 일정 */
  | 'fixedHours'

export type MonthBasis = 'calendar' | 'payday'

export interface Settings {
  payType: PayType
  /** payType 단위의 금액 (연봉/월급/시급) */
  amount: number
  rateBasis: RateBasis
  fixedMonthlyHours: number
  schedule: Record<Weekday, DaySchedule>
  breaksPaidByDefault: boolean
  /** 0 = 일요일 시작, 1 = 월요일 시작 */
  weekStartsOn: 0 | 1
  monthBasis: MonthBasis
  /** monthBasis = 'payday'일 때 기간 시작일 (1~31, 없는 날은 그 달 말일) */
  payday: number
  /** 'YYYY-MM-DD' (로컬 날짜) — 이 날 시작하는 근무는 없음 */
  holidays: string[]
}

/** [시작 ms, 끝 ms) */
export interface Interval {
  start: number
  end: number
}

export type WorkStatus = 'working' | 'break' | 'off'

export interface EarningsSnapshot {
  today: number
  week: number
  month: number
  /** 지금 이 순간의 초당 단가 (현재 월 기간 기준) */
  ratePerSecond: number
  status: WorkStatus
  /** 오늘 받을 총액 (오늘 근무가 모두 끝났을 때) */
  todayTotal: number
  /** 이번 주 전체 근무를 마쳤을 때 금액 */
  weekTotal: number
  /** 이번 달 기간 전체 근무를 마쳤을 때 금액 */
  monthTotal: number
  /** 올해 누적 (snapshot의 year 옵션을 켰을 때만, 아니면 0) */
  year: number
  /** 올해 전체 근무 시 금액 (year 옵션) */
  yearTotal: number
  /** 0~1 */
  todayProgress: number
  /** 오늘 마지막 유급 구간 종료까지 남은 초 (근무 끝났으면 0) */
  secondsUntilOff: number
  monthPeriod: Interval
}
