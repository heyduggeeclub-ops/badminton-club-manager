import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardBody } from '@/components/ui/Card'
import { Download, Users, CalendarDays, CheckSquare, Banknote, AlertCircle, DollarSign, BarChart3 } from 'lucide-react'

const EXPORTS = [
  {
    type: 'members',
    label: '會員名冊',
    desc: '姓名、性別、角色、聯絡資訊',
    icon: Users,
    color: 'text-indigo-500',
    bg: 'bg-indigo-50',
  },
  {
    type: 'activities',
    label: '活動記錄',
    desc: '日期、場館、場地數、狀態',
    icon: CalendarDays,
    color: 'text-blue-500',
    bg: 'bg-blue-50',
  },
  {
    type: 'attendance',
    label: '出席記錄',
    desc: '每場出席名單、費用、收費狀態',
    icon: CheckSquare,
    color: 'text-green-500',
    bg: 'bg-green-50',
  },
  {
    type: 'payments',
    label: '收費記錄',
    desc: '收費金額、方式、補繳紀錄',
    icon: Banknote,
    color: 'text-emerald-500',
    bg: 'bg-emerald-50',
  },
  {
    type: 'debts',
    label: '欠款清單',
    desc: '目前未結清的欠款會員與金額',
    icon: AlertCircle,
    color: 'text-red-500',
    bg: 'bg-red-50',
  },
  {
    type: 'finances',
    label: '財務支出明細',
    desc: '所有季度支出記錄，含類型與關聯活動',
    icon: DollarSign,
    color: 'text-violet-500',
    bg: 'bg-violet-50',
  },
  {
    type: 'finance-summary',
    label: '財務季度彙總',
    desc: '各季收入、支出、結餘與總計',
    icon: BarChart3,
    color: 'text-purple-500',
    bg: 'bg-purple-50',
  },
]

export default function ExportPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title="資料匯出"
        description="以 CSV 格式匯出，可用 Excel 開啟"
      />

      <Card>
        <CardBody className="p-0">
          <ul className="divide-y divide-gray-50">
            {EXPORTS.map(({ type, label, desc, icon: Icon, color, bg }) => (
              <li key={type}>
                <a
                  href={`/api/export/${type}`}
                  download
                  className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon size={20} className={color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900">{label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-indigo-600 text-sm font-medium flex-shrink-0">
                    <Download size={15} />
                    CSV
                  </div>
                </a>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      <p className="text-xs text-gray-400 px-1">
        匯出的 CSV 以 UTF-8 編碼（含 BOM），在 Windows Excel 可直接顯示中文。
      </p>
    </div>
  )
}
