import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { TierBadge } from '@/components/ui/TierBadge'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { formatDate, formatCurrency, getMemberTier, getSeasonLabel } from '@/lib/utils'
import {
  GENDER_LABELS, ROLE_LABELS, STATUS_LABELS,
  ACTIVITY_STATUS_LABELS, PAYMENT_METHOD_LABELS,
  type Member, type AttendanceRecord, type MemberStatus, type MemberRole,
} from '@/types'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { updateMember, deactivateMember, reactivateMember } from '@/lib/actions/members'

export default async function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: member } = await supabase
    .from('members')
    .select('*')
    .eq('id', id)
    .single()

  if (!member) notFound()

  // 依今天日期查詢當前季度（不寫死公曆季度）
  const today = new Date().toISOString().split('T')[0]
  const { data: season } = await supabase
    .from('seasons')
    .select('id, year, quarter')
    .lte('start_date', today)
    .gte('end_date', today)
    .single()

  // Season attendance & debt
  const { data: attendance } = await supabase
    .from('attendance_records')
    .select(`
      *,
      activity:activities(id, activity_date, venue_name, status)
    `)
    .eq('member_id', id)
    .eq('checked_in', true)
    .order('checked_in_at', { ascending: false })
    .limit(20)

  const thisSeasonAtt = attendance?.filter(a => a.season_id === season?.id) ?? []
  const currentSeasonSequence = thisSeasonAtt.length  // 等同於 max(season_sequence)
  const totalOwed = attendance?.reduce((sum, a) => {
    if (a.payment_status === 'pending' || a.payment_status === 'partial') {
      return sum + (a.fee_amount ?? 0) - a.paid_amount
    }
    return sum
  }, 0) ?? 0

  // 下次出席費率（依目前次數 + 1 查詢）
  let nextFeeAmount: number | null = null
  const { data: activeFeeRule } = await supabase
    .from('fee_rules')
    .select('id')
    .eq('is_active', true)
    .single()

  if (activeFeeRule) {
    const { data: fee } = await supabase.rpc('get_fee_amount', {
      p_fee_rule_id: activeFeeRule.id,
      p_gender: member.gender,
      p_season_sequence: currentSeasonSequence + 1,
    })
    nextFeeAmount = fee ?? null
  }

  const currentTier = getMemberTier(currentSeasonSequence, member.role)

  // Server action for edit
  async function handleUpdate(formData: FormData) {
    'use server'
    await updateMember(id, {
      name: formData.get('name') as string,
      display_name: (formData.get('display_name') as string) || undefined,
      gender: formData.get('gender') as 'male' | 'female',
      role: formData.get('role') as any,
      status: formData.get('status') as any,
      notes: (formData.get('notes') as string) || undefined,
    })
  }

  async function handleDeactivate(formData: FormData) {
    'use server'
    const reason = (formData.get('reason') as string) || undefined
    await deactivateMember(id, reason)
  }

  async function handleReactivate() {
    'use server'
    await reactivateMember(id)
  }

  const statusVariant: Record<string, 'success' | 'warning' | 'gray'> = {
    active: 'success', pending: 'warning', inactive: 'gray',
  }
  const paymentVariant: Record<string, 'success' | 'danger' | 'warning' | 'gray'> = {
    paid: 'success', pending: 'danger', partial: 'warning', waived: 'gray',
  }
  const paymentLabel: Record<string, string> = {
    paid: '已收', pending: '未收', partial: '部分', waived: '免除',
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/members" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <PageHeader
          title={member.name}
          description={`加入日期：${formatDate(member.created_at)}`}
          actions={
            <div className="flex gap-2">
              <Badge variant={statusVariant[member.status as string]}>{STATUS_LABELS[member.status as MemberStatus]}</Badge>
              <Badge variant={member.role === 'leader' ? 'default' : member.role === 'vice_leader' ? 'info' : 'gray'}>
                {ROLE_LABELS[member.role as MemberRole]}
              </Badge>
            </div>
          }
        />
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-indigo-600">{thisSeasonAtt.length}</p>
          <p className="text-xs text-gray-500 mt-1">本季出席次數</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-700">{attendance?.length ?? 0}</p>
          <p className="text-xs text-gray-500 mt-1">累計出席次數</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className={`text-2xl font-bold ${totalOwed > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {formatCurrency(totalOwed)}
          </p>
          <p className="text-xs text-gray-500 mt-1">累計欠款</p>
        </div>
      </div>

      {/* 牌位卡片 */}
      <div className={`rounded-2xl border p-4 flex items-center justify-between ${
        currentTier
          ? `${currentTier.bgClass} ${currentTier.borderClass}`
          : 'bg-gray-50 border-gray-200'
      }`}>
        <div className="flex items-center gap-3">
          {currentTier ? (
            <>
              <span className="text-3xl leading-none">{currentTier.emoji}</span>
              <div>
                <p className={`font-bold text-base ${currentTier.textClass}`}>
                  {currentTier.label}會員
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {season ? `${season.year} Q${season.quarter}・` : ''}
                  本季第 {currentSeasonSequence} 次出席
                </p>
              </div>
            </>
          ) : (
            <>
              <span className="text-3xl leading-none">🏸</span>
              <div>
                <p className="font-bold text-base text-gray-600">本季尚未出席</p>
                <p className="text-xs text-gray-400 mt-0.5">首次出席將獲得銅牌</p>
              </div>
            </>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">下次費率</p>
          <p className={`text-lg font-extrabold tabular-nums ${currentTier ? currentTier.textClass : 'text-gray-600'}`}>
            {nextFeeAmount != null ? formatCurrency(nextFeeAmount) : '—'}
          </p>
          <p className="text-xs text-gray-400">
            {member.gender === 'male' ? '男' : '女'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Edit Form */}
        <form action={handleUpdate}>
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-gray-800">基本資料</h2>
            </CardHeader>
            <CardBody className="space-y-3">
              <Input label="姓名" name="name" defaultValue={member.name} required />
              <Input label="暱稱" name="display_name" defaultValue={member.display_name ?? ''} />
              <div className="grid grid-cols-2 gap-3">
                <Select label="性別" name="gender" defaultValue={member.gender}>
                  <option value="male">男</option>
                  <option value="female">女</option>
                </Select>
                <Select label="角色" name="role" defaultValue={member.role}>
                  <option value="member">會員</option>
                  <option value="vice_leader">副團長</option>
                  <option value="leader">團長</option>
                </Select>
              </div>
              <Select label="狀態" name="status" defaultValue={member.status}>
                <option value="active">正式會員</option>
                <option value="pending">待確認</option>
                <option value="inactive">停用</option>
              </Select>
              <Textarea label="備註" name="notes" defaultValue={member.notes ?? ''} />
              <Button type="submit" className="w-full">儲存變更</Button>
            </CardBody>
          </Card>
        </form>

        {/* Attendance History */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-800">
              出席收費歷史
              <span className="ml-2 text-sm font-normal text-gray-400">（近 20 筆）</span>
            </h2>
          </CardHeader>
          <CardBody className="p-0">
            {attendance && attendance.length > 0 ? (
              <ul className="divide-y divide-gray-50">
                {attendance.map(a => (
                  <li key={a.id} className="px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {a.activity?.activity_date ? formatDate(a.activity.activity_date) : '—'}
                        </p>
                        <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-0.5">
                          <TierBadge seasonSequence={a.season_sequence} size="sm" />
                          第 {a.season_sequence ?? '?'} 次・{a.activity?.venue_name ?? '—'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-800">
                          {a.fee_amount != null ? formatCurrency(a.fee_amount) : '—'}
                        </p>
                        <Badge variant={paymentVariant[a.payment_status]} className="mt-0.5">
                          {paymentLabel[a.payment_status]}
                        </Badge>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 py-8 text-sm text-gray-400 text-center">尚無出席紀錄</p>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Danger zone / Reactivate zone */}
      {member.status === 'inactive' ? (
        <Card className="border-green-100">
          <CardBody>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-800">此會員已停用</p>
                {member.deactivated_at && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    停用日期：{formatDate(member.deactivated_at)}
                  </p>
                )}
                {member.deactivation_reason && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    停用原因：{member.deactivation_reason}
                  </p>
                )}
              </div>
              <form action={handleReactivate}>
                <Button type="submit" variant="secondary" size="sm">重新啟用</Button>
              </form>
            </div>
          </CardBody>
        </Card>
      ) : (
        <Card className="border-red-100">
          <CardBody>
            <p className="text-sm font-medium text-gray-800 mb-1">停用帳號</p>
            <p className="text-xs text-gray-500 mb-3">停用後無法報名新活動，歷史紀錄保留。</p>
            <form action={handleDeactivate} className="space-y-3">
              <Input
                name="reason"
                placeholder="停用原因（選填，如：退出球隊、長期請假...）"
              />
              <div className="flex justify-end">
                <Button type="submit" variant="danger" size="sm">停用帳號</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}
    </div>
  )
}
