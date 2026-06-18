import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/PageHeader'
import { FeeRulesClient, type FeeRuleWithTiers } from './FeeRulesClient'

async function getFeeRules(): Promise<FeeRuleWithTiers[]> {
  const supabase = await createClient()

  const { data: rules } = await supabase
    .from('fee_rules')
    .select(`
      *,
      tiers:fee_rule_tiers(*)
    `)
    .order('effective_from', { ascending: false })

  return (rules ?? []).map(r => ({
    ...r,
    tiers: (r.tiers ?? []).sort((a: any, b: any) => {
      if (a.gender !== b.gender) return a.gender === 'male' ? -1 : 1
      return a.attendance_from - b.attendance_from
    }),
  })) as FeeRuleWithTiers[]
}

export default async function FeeRulesPage() {
  const rules = await getFeeRules()

  return (
    <div className="space-y-5 max-w-2xl">
      <PageHeader
        title="收費規則"
        description="管理各版本費率與生效日期"
      />
      <FeeRulesClient rules={rules} />
    </div>
  )
}
