import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { SeasonManager } from './SeasonManager'
import type { Season } from '@/types'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const supabase = await createClient()

  const { data: seasons } = await supabase
    .from('seasons')
    .select('*')
    .order('year', { ascending: false })
    .order('quarter', { ascending: false })

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader title="系統設定" description="季度管理與基本設定" />

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-800">季度管理</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            建立新季度後，即可在活動、財務等頁面中選取
          </p>
        </CardHeader>
        <CardBody className="px-4">
          <SeasonManager seasons={(seasons ?? []) as Season[]} />
        </CardBody>
      </Card>
    </div>
  )
}
