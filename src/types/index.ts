// ============================================================
// Database Types — 對應 PostgreSQL Schema v1.0
// ============================================================

export type Gender = 'male' | 'female'
export type MemberRole = 'member' | 'vice_leader' | 'leader'
export type MemberStatus = 'active' | 'inactive' | 'pending'
export type ActivityStatus = 'draft' | 'open' | 'closed' | 'completed' | 'cancelled'
export type RegistrationStatus = 'confirmed' | 'waitlist' | 'cancelled' | 'promoted'
export type RegistrationSource = 'self' | 'line_import' | 'admin'
export type PaymentStatus = 'pending' | 'paid' | 'partial' | 'waived'
export type PaymentMethod = 'cash' | 'transfer' | 'other'
export type ExpenseCategory = 'venue_rental' | 'shuttlecock' | 'drinks' | 'prizes' | 'other'

export interface Member {
  id: string
  user_id: string | null
  name: string
  display_name: string | null
  gender: Gender
  role: MemberRole
  status: MemberStatus
  phone: string | null
  line_id: string | null
  notes: string | null
  deactivated_at: string | null
  deactivation_reason: string | null
  created_at: string
  updated_at: string
}

export interface Season {
  id: string
  year: number
  quarter: number
  start_date: string
  end_date: string
  created_at: string
}

export interface FeeRule {
  id: string
  name: string
  effective_from: string
  effective_to: string | null
  is_active: boolean
  created_by: string | null
  notes: string | null
  created_at: string
  leader_fee: number | null
  vice_leader_fee: number | null
}

export interface FeeRuleTier {
  id: string
  fee_rule_id: string
  gender: Gender | 'all'
  attendance_from: number
  attendance_to: number | null
  amount: number
  created_at: string
}

export interface Activity {
  id: string
  season_id: string
  fee_rule_id: string | null
  activity_date: string
  start_time: string
  end_time: string
  venue_name: string
  court_count: number
  max_per_court: number
  status: ActivityStatus
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ActivityWithStats extends Activity {
  max_capacity: number
  confirmed_count: number
  waitlist_count: number
  attended_count: number
  total_income: number
  total_expense: number
  profit: number
  season?: Season
}

export interface Registration {
  id: string
  activity_id: string
  member_id: string
  registered_by: string | null
  status: RegistrationStatus
  waitlist_position: number | null
  registered_at: string
  source: RegistrationSource
  raw_name: string | null
  promoted_at: string | null
  cancelled_at: string | null
  cancelled_reason: string | null
  notes: string | null
  created_at: string
  updated_at: string
  member?: Member
}

export interface AttendanceRecord {
  id: string
  registration_id: string | null
  activity_id: string
  member_id: string
  season_id: string
  fee_rule_id: string | null
  checked_in_by: string | null
  checked_in: boolean
  checked_in_at: string | null
  season_sequence: number | null
  fee_amount: number | null
  payment_status: PaymentStatus
  paid_amount: number
  created_at: string
  updated_at: string
  member?: Member
  activity?: Activity
}

export type PaymentTransactionType = 'payment' | 'debt_repayment'

export interface PaymentTransaction {
  id: string
  member_id: string
  activity_id: string | null
  collected_by: string | null
  amount: number
  payment_method: PaymentMethod
  type: PaymentTransactionType
  paid_at: string
  notes: string | null
  created_at: string
}

export interface Expense {
  id: string
  activity_id: string | null
  season_id: string
  recorded_by: string | null
  category: ExpenseCategory
  amount: number
  description: string
  expense_date: string
  receipt_url: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface AuditLog {
  id: string
  actor_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
  created_at: string
  actor?: Member
}

// View types
export interface MemberDebtSummary {
  member_id: string
  name: string
  display_name: string | null
  gender: Gender
  unpaid_sessions: number
  total_owed: number
}

export interface ActivityFinancials {
  activity_id: string
  activity_date: string | null
  start_time: string
  end_time: string
  venue_name: string
  court_count: number
  max_per_court: number
  season_id: string
  status: ActivityStatus
  attended_count: number
  total_income: number
  total_expense: number
  profit: number
  registration_count: number
  waitlist_count: number
}

export interface SeasonFinancials {
  season_id: string
  year: number
  quarter: number
  activity_count: number
  total_income: number
  total_expense: number
  profit: number
}

// Form types
export interface CreateActivityInput {
  season_id: string
  activity_date: string
  start_time: string
  end_time: string
  venue_name: string
  court_count: number
  max_per_court: number
  status: ActivityStatus
  fee_rule_id?: string
  notes?: string
  venue_cost?: number   // 場地費用（不存活動表，由 server action 同步至 expenses）
}

export interface CreateExpenseInput {
  season_id: string
  activity_id?: string | null
  category: ExpenseCategory
  amount: number
  description: string
  expense_date: string
  notes?: string | null
}

export interface CreateMemberInput {
  name: string
  display_name?: string
  gender: Gender
  role: MemberRole
  status: MemberStatus
  phone?: string
  line_id?: string
  notes?: string
}

// Utility
export const QUARTER_LABELS: Record<number, string> = {
  1: 'Q1 (1–3月)',
  2: 'Q2 (4–6月)',
  3: 'Q3 (7–9月)',
  4: 'Q4 (10–12月)',
}

export const GENDER_LABELS: Record<Gender, string> = {
  male: '男',
  female: '女',
}

export const ROLE_LABELS: Record<MemberRole, string> = {
  member: '會員',
  vice_leader: '副團長',
  leader: '團長',
}

export const STATUS_LABELS: Record<MemberStatus, string> = {
  active: '正式',
  inactive: '停用',
  pending: '待確認',
}

export const ACTIVITY_STATUS_LABELS: Record<ActivityStatus, string> = {
  draft: '草稿',
  open: '開放',
  closed: '截止',
  completed: '完成',
  cancelled: '取消',
}

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  venue_rental: '場租',
  shuttlecock: '羽球',
  drinks: '飲料',
  prizes: '獎品',
  other: '其他',
}

export const EXPENSE_CATEGORY_EMOJI: Record<ExpenseCategory, string> = {
  venue_rental: '🏢',
  shuttlecock: '🏸',
  drinks: '🥤',
  prizes: '🏆',
  other: '📦',
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: '現金',
  transfer: '轉帳',
  other: '其他',
}
