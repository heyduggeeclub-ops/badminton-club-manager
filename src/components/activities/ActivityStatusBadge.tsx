import { Badge } from '@/components/ui/Badge'
import { ACTIVITY_STATUS_LABELS, type ActivityStatus } from '@/types'

const variantMap: Record<ActivityStatus, 'success' | 'info' | 'warning' | 'danger' | 'gray'> = {
  completed: 'success',
  open:      'info',
  closed:    'warning',
  cancelled: 'danger',
  draft:     'gray',
}

export function ActivityStatusBadge({ status }: { status: ActivityStatus }) {
  return (
    <Badge variant={variantMap[status]}>
      {ACTIVITY_STATUS_LABELS[status]}
    </Badge>
  )
}
