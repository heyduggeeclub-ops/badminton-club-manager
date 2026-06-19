'use client'

import { useState, useTransition } from 'react'
import { formatDate, formatCurrency } from '@/lib/utils'
import { createFeeRule, updateFeeRuleTiers, setFeeRuleActive, updateFeeRule, updateFeeRuleRoleFees } from '@/lib/actions/fee-rules'
import type { FeeRule, FeeRuleTier } from '@/types'

export interface FeeRuleWithTiers extends FeeRule {
  tiers: FeeRuleTier[]
}

interface Props {
  rules: FeeRuleWithTiers[]
}

// ── 費率表格（可編輯） ─────────────────────────────────────
function TierTable({
  rule,
  onSaved,
}: {
  rule: FeeRuleWithTiers
  onSaved: () => void
}) {
  const maleTiers   = rule.tiers.filter(t => t.gender === 'male').sort((a, b) => a.attendance_from - b.attendance_from)
  const femaleTiers = rule.tiers.filter(t => t.gender === 'female').sort((a, b) => a.attendance_from - b.attendance_from)

  const [amounts, setAmounts] = useState<Record<string, number>>(
    Object.fromEntries(rule.tiers.map(t => [t.id, t.amount]))
  )
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  function handleSave() {
    startTransition(async () => {
      await updateFeeRuleTiers(
        rule.id,
        Object.entries(amounts).map(([id, amount]) => ({ id, amount }))
      )
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      onSaved()
    })
  }

  function tierLabel(t: FeeRuleTier) {
    if (t.attendance_to === null) return `第 ${t.attendance_from} 次以上`
    if (t.attendance_from === t.attendance_to) return `第 ${t.attendance_from} 次`
    return `第 ${t.attendance_from}–${t.attendance_to} 次`
  }

  return (
    <div className="mt-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {[{ label: '男性', tiers: maleTiers }, { label: '女性', tiers: femaleTiers }].map(({ label, tiers }) => (
          <div key={label}>
            <p className="text-xs font-semibold text-gray-500 mb-2">{label}</p>
            <div className="space-y-2.5">
              {tiers.map(t => (
                <div key={t.id} className="flex items-center gap-2 min-w-0">
                  {/* 標籤固定寬度，確保不截斷中文 */}
                  <span className="text-xs text-gray-500 flex-shrink-0 w-[6.5rem] leading-tight">{tierLabel(t)}</span>
                  {/* 金額輸入框 — flex-1 + min-w-0 確保不溢出 */}
                  <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden flex-1 min-w-0">
                    <span className="px-2 text-xs text-gray-400 bg-gray-50 border-r border-gray-200 py-2 flex-shrink-0">$</span>
                    <input
                      type="number"
                      value={amounts[t.id]}
                      onChange={e => setAmounts(prev => ({ ...prev, [t.id]: Number(e.target.value) }))}
                      className="flex-1 min-w-0 px-2 py-2 text-sm text-gray-800 focus:outline-none"
                      min={0}
                      step={10}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? '儲存中…' : '儲存費率'}
        </button>
        {saved && <span className="text-sm text-green-600 font-medium">✓ 已儲存</span>}
      </div>
    </div>
  )
}

// ── 團長/副團長固定費用設定 ──────────────────────────────────
function RoleFeesSection({ rule, onSaved }: { rule: FeeRuleWithTiers; onSaved: () => void }) {
  const [leaderFee, setLeaderFee]         = useState<string>(rule.leader_fee      != null ? String(rule.leader_fee)       : '')
  const [viceLeaderFee, setViceLeaderFee] = useState<string>(rule.vice_leader_fee != null ? String(rule.vice_leader_fee)  : '')
  const [isPending, startTransition]      = useTransition()
  const [saved, setSaved]                 = useState(false)

  function handleSave() {
    startTransition(async () => {
      await updateFeeRuleRoleFees(
        rule.id,
        leaderFee      !== '' ? Number(leaderFee)      : null,
        viceLeaderFee  !== '' ? Number(viceLeaderFee)  : null,
      )
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      onSaved()
    })
  }

  return (
    <div className="mt-5 pt-4 border-t border-gray-100">
      <p className="text-sm font-semibold text-gray-700 mb-1">幹部固定費用</p>
      <p className="text-xs text-gray-400 mb-3">設定後，該角色打卡費用固定為此金額（不走階梯）；留空則與一般會員相同。</p>
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: '團長', value: leaderFee, set: setLeaderFee },
          { label: '副團長', value: viceLeaderFee, set: setViceLeaderFee },
        ].map(({ label, value, set }) => (
          <div key={label} className="min-w-0">
            <p className="text-xs font-medium text-gray-500 mb-1.5">{label}</p>
            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden min-w-0">
              <span className="px-2 text-xs text-gray-400 bg-gray-50 border-r border-gray-200 py-2 flex-shrink-0">$</span>
              <input
                type="number"
                value={value}
                onChange={e => set(e.target.value)}
                placeholder="同一般"
                min={0}
                step={10}
                className="flex-1 min-w-0 px-2 py-2 text-sm text-gray-800 focus:outline-none"
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? '儲存中…' : '儲存幹部費用'}
        </button>
        {saved && <span className="text-sm text-green-600 font-medium">✓ 已儲存</span>}
      </div>
    </div>
  )
}

// ── 新增規則表單（bottom sheet） ───────────────────────────
function NewRuleSheet({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      await createFeeRule(fd)
      onCreated()
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
      <div className="fixed inset-0 bg-black/40" />
      <div
        className="relative bg-white rounded-t-2xl px-5 pt-5 pb-8 safe-area-inset-bottom max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
        <h2 className="text-base font-bold text-gray-900 mb-5">新增收費規則版本</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">規則名稱 *</label>
            <input
              name="name"
              required
              placeholder="例：標準收費 2026"
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">生效日期 *</label>
            <input
              name="effective_from"
              type="date"
              required
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">備註</label>
            <textarea
              name="notes"
              rows={2}
              placeholder="說明此版本調整原因…"
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <p className="text-xs text-gray-400">建立後會自動產生預設費率，可再編輯調整。</p>

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-indigo-600 text-white text-sm font-semibold py-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {isPending ? '建立中…' : '建立規則'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── 主元件 ─────────────────────────────────────────────────
export function FeeRulesClient({ rules: initialRules }: Props) {
  const [rules, setRules] = useState(initialRules)
  const [expanded, setExpanded] = useState<string | null>(initialRules.find(r => r.is_active)?.id ?? initialRules[0]?.id ?? null)
  const [showNewSheet, setShowNewSheet] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // 展開/收合
  function toggle(id: string) {
    setExpanded(prev => prev === id ? null : id)
  }

  // 啟用規則
  function handleActivate(id: string) {
    startTransition(async () => {
      await setFeeRuleActive(id, true)
      setRules(prev => prev.map(r => ({ ...r, is_active: r.id === id })))
    })
  }

  // 更新生效日期（inline）
  async function handleDateChange(id: string, field: 'effective_from' | 'effective_to', value: string) {
    await updateFeeRule(id, { [field]: value || null })
    setRules(prev => prev.map(r => r.id === id ? { ...r, [field]: value || null } : r))
    setEditingId(null)
  }

  return (
    <div className="space-y-4">
      {/* 新增按鈕 */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowNewSheet(true)}
          className="bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2"
        >
          <span className="text-base leading-none">＋</span> 新增版本
        </button>
      </div>

      {rules.length === 0 && (
        <div className="text-center py-12 text-gray-400 text-sm">尚無收費規則，請新增第一個版本。</div>
      )}

      {/* 規則卡片列表 */}
      {rules.map(rule => (
        <div
          key={rule.id}
          className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm"
        >
          {/* 卡片標頭 */}
          <button
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
            onClick={() => toggle(rule.id)}
          >
            <div className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${rule.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
              <div>
                <p className="font-semibold text-gray-900">{rule.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  生效：{formatDate(rule.effective_from)}
                  {rule.effective_to ? ` ～ ${formatDate(rule.effective_to)}` : ' 起'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {rule.is_active && (
                <span className="text-xs bg-green-100 text-green-700 font-semibold px-2.5 py-0.5 rounded-full">
                  使用中
                </span>
              )}
              <span className="text-gray-400 text-sm">{expanded === rule.id ? '▲' : '▼'}</span>
            </div>
          </button>

          {/* 展開內容 */}
          {expanded === rule.id && (
            <div className="px-5 pb-5 border-t border-gray-100">
              {/* 操作按鈕列 */}
              <div className="flex flex-wrap gap-2 mt-4 mb-4">
                {!rule.is_active && (
                  <button
                    onClick={() => handleActivate(rule.id)}
                    disabled={isPending}
                    className="text-sm bg-green-50 text-green-700 border border-green-200 font-medium px-3 py-1.5 rounded-lg hover:bg-green-100 disabled:opacity-50 transition-colors"
                  >
                    設為使用中
                  </button>
                )}

                {/* 生效日期編輯 */}
                {editingId === `date-${rule.id}` ? (
                  <div className="flex items-center gap-2 text-sm flex-wrap">
                    <input
                      type="date"
                      defaultValue={rule.effective_from}
                      onChange={e => handleDateChange(rule.id, 'effective_from', e.target.value)}
                      className="border border-gray-300 rounded-lg px-2 py-1 text-sm"
                    />
                    <span className="text-gray-400">～</span>
                    <input
                      type="date"
                      defaultValue={rule.effective_to ?? ''}
                      onChange={e => handleDateChange(rule.id, 'effective_to', e.target.value)}
                      className="border border-gray-300 rounded-lg px-2 py-1 text-sm"
                    />
                    <button onClick={() => setEditingId(null)} className="text-xs text-gray-400 hover:text-gray-600">取消</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditingId(`date-${rule.id}`)}
                    className="text-sm text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    ✏️ 編輯日期
                  </button>
                )}
              </div>

              {/* 費率表 */}
              <p className="text-sm font-semibold text-gray-700 mb-1">費率設定（本季出席次序）</p>
              <TierTable
                rule={rule}
                onSaved={() => {/* rules already updated on server */}}
              />

              {/* 幹部固定費用 */}
              <RoleFeesSection
                rule={rule}
                onSaved={() => {/* revalidated on server */}}
              />

              {/* 備註 */}
              {rule.notes && (
                <p className="mt-4 text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">{rule.notes}</p>
              )}
            </div>
          )}
        </div>
      ))}

      {/* New rule bottom sheet */}
      {showNewSheet && (
        <NewRuleSheet
          onClose={() => setShowNewSheet(false)}
          onCreated={() => {/* Next.js revalidate will refresh */}}
        />
      )}
    </div>
  )
}
