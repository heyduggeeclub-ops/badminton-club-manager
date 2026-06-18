import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { createActivity } from '@/lib/actions/activities'
import { ActivityDateSeasonPicker } from './ActivityDateSeasonPicker'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { Season, FeeRule } from '@/types'

async function getFormData() {
  const supabase = await createClient()

  const { data: seasons } = await supabase
    .from('seasons')
    .select('*')
    .order('year', { ascending: false })
    .order('quarter', { ascending: false })

  const { data: feeRules } = await supabase
    .from('fee_rules')
    .select('*')
    .order('effective_from', { ascending: false })

  return {
    seasons: (seasons ?? []) as Season[],
    feeRules: (feeRules ?? []) as FeeRule[],
  }
}

export default async function NewActivityPage() {
  const { seasons, feeRules } = await getFormData()

  // 預設當季
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentQuarter = Math.ceil((now.getMonth() + 1) / 3)
  const defaultSeason = seasons.find(s => s.year === currentYear && s.quarter === currentQuarter)
  const defaultFeeRule = feeRules.find(r => r.is_active)

  // 預設下週六
  const nextSaturday = new Date()
  const day = nextSaturday.getDay()
  nextSaturday.setDate(nextSaturday.getDate() + (6 - day + 7) % 7 || 7)
  const defaultDate = nextSaturday.toISOString().split('T')[0]

  async function handleCreate(formData: FormData) {
    'use server'
    const courtCount = parseInt(formData.get('court_count') as string) || 3
    const maxPerCourt = parseInt(formData.get('max_per_court') as string) || 8
    const venueCost = parseInt(formData.get('venue_cost') as string) || 0

    await createActivity({
      season_id: formData.get('season_id') as string,
      activity_date: formData.get('activity_date') as string,
      start_time: formData.get('start_time') as string,
      end_time: formData.get('end_time') as string,
      venue_name: formData.get('venue_name') as string,
      court_count: courtCount,
      max_per_court: maxPerCourt,
      status: formData.get('status') as 'draft' | 'open',
      fee_rule_id: formData.get('fee_rule_id') as string || undefined,
      notes: formData.get('notes') as string || undefined,
      venue_cost: venueCost,
    })
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/activities" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <PageHeader title="新增活動" />
      </div>

      <form action={handleCreate}>
        <Card className="overflow-hidden">
          <CardHeader>
            <h2 className="font-semibold text-gray-800">基本資訊</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <ActivityDateSeasonPicker
              seasons={seasons.map(s => ({
                id: s.id,
                year: s.year,
                quarter: s.quarter,
                start_date: s.start_date,
                end_date: s.end_date,
              }))}
              defaultDate={defaultDate}
              defaultSeasonId={defaultSeason?.id}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="開始時間" type="time" name="start_time" defaultValue="19:00" required />
              <Input label="結束時間" type="time" name="end_time" defaultValue="21:00" required />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Input
                  label="場館名稱"
                  name="venue_name"
                  placeholder="大安運動中心"
                  required
                />
              </div>
              <div>
                <Input
                  label="場地費用"
                  type="number"
                  name="venue_cost"
                  min={0}
                  defaultValue={0}
                  hint="自動同步至財務支出"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="場地數量"
                type="number"
                name="court_count"
                min={1}
                max={10}
                defaultValue={3}
                hint="可報名人數 = 場地數 × 每場最大人數"
                required
              />
              <Input
                label="每場最大人數"
                type="number"
                name="max_per_court"
                min={1}
                max={20}
                defaultValue={8}
                required
              />
            </div>

            <Select label="套用費率" name="fee_rule_id" defaultValue={defaultFeeRule?.id}>
              <option value="">（自動使用最新費率）</option>
              {feeRules.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name}　{r.is_active ? '✅ 使用中' : ''}
                </option>
              ))}
            </Select>

            <Textarea label="備註" name="notes" placeholder="選填" />
          </CardBody>
        </Card>

        <Card className="mt-4">
          <CardHeader>
            <h2 className="font-semibold text-gray-800">活動狀態</h2>
          </CardHeader>
          <CardBody>
            <div className="space-y-2">
              {[
                { value: 'draft', label: '草稿', desc: '尚未開放報名' },
                { value: 'open', label: '開放報名', desc: '立即開放球友報名' },
              ].map(opt => (
                <label key={opt.value} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="status"
                    value={opt.value}
                    defaultChecked={opt.value === 'draft'}
                    className="text-indigo-600"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-800">{opt.label}</span>
                    <span className="ml-2 text-xs text-gray-400">— {opt.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </CardBody>
        </Card>

        <div className="flex justify-end gap-3 mt-4">
          <Link href="/activities">
            <Button type="button" variant="secondary">取消</Button>
          </Link>
          <Button type="submit">儲存活動</Button>
        </div>
      </form>
    </div>
  )
}
