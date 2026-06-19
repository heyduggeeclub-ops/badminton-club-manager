import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { updateActivity } from '@/lib/actions/activities'
import { ActivityDateSeasonPicker } from '../../new/ActivityDateSeasonPicker'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { Season, FeeRule } from '@/types'

interface Props {
  params: Promise<{ id: string }>
}

const EDITABLE_STATUSES = ['draft', 'open', 'closed']

export default async function EditActivityPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: activity } = await supabase
    .from('activities')
    .select('*')
    .eq('id', id)
    .single()

  if (!activity) notFound()

  // 已完成或已取消 → 不可編輯
  if (!EDITABLE_STATUSES.includes(activity.status)) {
    redirect(`/activities/${id}`)
  }

  const { data: seasons } = await supabase
    .from('seasons')
    .select('*')
    .order('year', { ascending: false })
    .order('quarter', { ascending: false })

  const { data: feeRules } = await supabase
    .from('fee_rules')
    .select('*')
    .order('effective_from', { ascending: false })

  // 取得現有場地費用（如有）
  const { data: venueExpense } = await supabase
    .from('expenses')
    .select('amount')
    .eq('activity_id', id)
    .eq('category', 'venue_rental')
    .maybeSingle()

  const currentVenueCost = venueExpense?.amount ?? 0

  async function handleUpdate(formData: FormData) {
    'use server'
    const courtCount = parseInt(formData.get('court_count') as string) || 3
    const maxPerCourt = parseInt(formData.get('max_per_court') as string) || 8
    const venueCost = parseInt(formData.get('venue_cost') as string) || 0

    await updateActivity(id, {
      season_id: formData.get('season_id') as string,
      activity_date: formData.get('activity_date') as string,
      start_time: formData.get('start_time') as string,
      end_time: formData.get('end_time') as string,
      venue_name: formData.get('venue_name') as string,
      court_count: courtCount,
      max_per_court: maxPerCourt,
      status: formData.get('status') as any,
      fee_rule_id: (formData.get('fee_rule_id') as string) || undefined,
      notes: (formData.get('notes') as string) || undefined,
      venue_cost: venueCost,
    })

    redirect(`/activities/${id}`)
  }

  const statusLabel: Record<string, string> = {
    draft: '草稿', open: '開放報名', closed: '截止報名',
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href={`/activities/${id}`} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <PageHeader title="編輯活動" />
      </div>

      <form action={handleUpdate}>
        <Card className="overflow-hidden">
          <CardHeader>
            <h2 className="font-semibold text-gray-800">基本資訊</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <ActivityDateSeasonPicker
              seasons={(seasons ?? []).map((s: Season) => ({
                id: s.id,
                year: s.year,
                quarter: s.quarter,
                start_date: s.start_date,
                end_date: s.end_date,
              }))}
              defaultDate={activity.activity_date}
              defaultSeasonId={activity.season_id}
            />

            {/* 開始/結束時間 — 手機也 2 欄並排 */}
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="開始時間"
                type="time"
                name="start_time"
                defaultValue={activity.start_time.slice(0, 5)}
                required
              />
              <Input
                label="結束時間"
                type="time"
                name="end_time"
                defaultValue={activity.end_time.slice(0, 5)}
                required
              />
            </div>

            {/* 場館名稱 — 全寬 */}
            <Input
              label="場館名稱"
              name="venue_name"
              defaultValue={activity.venue_name}
              required
            />

            {/* 場地數 + 每場上限 + 場地費用 — 3 欄 */}
            <div className="grid grid-cols-3 gap-3">
              <Input
                label="場地數"
                type="number"
                name="court_count"
                min={1}
                max={10}
                defaultValue={activity.court_count}
                required
              />
              <Input
                label="每場上限"
                type="number"
                name="max_per_court"
                min={1}
                max={20}
                defaultValue={activity.max_per_court}
                required
              />
              <Input
                label="場地費用"
                type="number"
                name="venue_cost"
                min={0}
                defaultValue={currentVenueCost}
                hint="自動入帳"
              />
            </div>

            <Select label="套用費率" name="fee_rule_id" defaultValue={activity.fee_rule_id ?? ''}>
              <option value="">（自動使用最新費率）</option>
              {(feeRules ?? []).map((r: FeeRule) => (
                <option key={r.id} value={r.id}>
                  {r.name}　{r.is_active ? '✅ 使用中' : ''}
                </option>
              ))}
            </Select>

            <Textarea label="備註" name="notes" defaultValue={activity.notes ?? ''} />
          </CardBody>
        </Card>

        <Card className="mt-4">
          <CardHeader>
            <h2 className="font-semibold text-gray-800">活動狀態</h2>
          </CardHeader>
          <CardBody>
            <div className="space-y-2">
              {EDITABLE_STATUSES.map(s => (
                <label key={s} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="status"
                    value={s}
                    defaultChecked={activity.status === s}
                    className="text-indigo-600"
                  />
                  <span className="text-sm font-medium text-gray-800">{statusLabel[s]}</span>
                </label>
              ))}
            </div>
          </CardBody>
        </Card>

        <div className="flex justify-end gap-3 mt-4">
          <Link href={`/activities/${id}`}>
            <Button type="button" variant="secondary">取消</Button>
          </Link>
          <Button type="submit">儲存變更</Button>
        </div>
      </form>
    </div>
  )
}
