import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/PageHeader'
import { AuditLogsClient } from './AuditLogsClient'
import type { AuditLog } from '@/types'

const PAGE_SIZE = 30

interface SearchParams {
  search?: string
  dateFrom?: string
  dateTo?: string
  entityType?: string
  page?: string
}

async function getAuditLogs({
  search = '',
  dateFrom = '',
  dateTo = '',
  entityType = '',
  page = '1',
}: SearchParams) {
  const supabase = await createClient()
  const pageNum = Math.max(1, Number(page))
  const from = (pageNum - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('audit_logs')
    .select('*, actor:members!audit_logs_actor_id_fkey(name, display_name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (entityType) query = query.eq('entity_type', entityType)
  if (dateFrom)   query = query.gte('created_at', `${dateFrom}T00:00:00+08:00`)
  if (dateTo)     query = query.lte('created_at', `${dateTo}T23:59:59+08:00`)
  if (search) {
    // 搜尋操作類型或操作人
    query = query.ilike('action', `%${search}%`)
  }

  const { data, count, error } = await query
  if (error) console.error('audit_logs query error:', error)

  return {
    logs: (data ?? []) as AuditLog[],
    total: count ?? 0,
    page: pageNum,
    pageSize: PAGE_SIZE,
  }
}

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const { logs, total, page, pageSize } = await getAuditLogs(sp)

  return (
    <div className="space-y-5 max-w-3xl">
      <PageHeader
        title="操作紀錄"
        description="所有管理員操作的完整歷程"
      />
      <AuditLogsClient
        logs={logs}
        total={total}
        page={page}
        pageSize={pageSize}
        search={sp.search ?? ''}
        dateFrom={sp.dateFrom ?? ''}
        dateTo={sp.dateTo ?? ''}
        entityType={sp.entityType ?? ''}
      />
    </div>
  )
}
