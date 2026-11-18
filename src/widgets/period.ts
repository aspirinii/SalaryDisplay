import type { EarningsSnapshot } from '../engine'
import type { PeriodKey } from '../layout/widgets'

/** 기간별 지금까지 금액과 기간 전체 금액 */
export function periodValue(snap: EarningsSnapshot, p: PeriodKey): { value: number; total: number } {
  switch (p) {
    case 'today':
      return { value: snap.today, total: snap.todayTotal }
    case 'week':
      return { value: snap.week, total: snap.weekTotal }
    case 'month':
      return { value: snap.month, total: snap.monthTotal }
    case 'year':
      return { value: snap.year, total: snap.yearTotal }
  }
}
