import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { createMember } from '@/lib/actions/members'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function NewMemberPage() {
  async function handleCreate(formData: FormData) {
    'use server'
    await createMember({
      name: formData.get('name') as string,
      display_name: (formData.get('display_name') as string) || undefined,
      gender: formData.get('gender') as 'male' | 'female',
      role: formData.get('role') as any,
      status: formData.get('status') as any,
      notes: (formData.get('notes') as string) || undefined,
    })
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-center gap-3">
        <Link href="/members" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <PageHeader title="新增會員" />
      </div>

      <form action={handleCreate}>
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-800">基本資料</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <Input
              label="姓名 *"
              name="name"
              placeholder="真實姓名"
              required
            />
            <Input
              label="暱稱（LINE 接龍用）"
              name="display_name"
              placeholder="若與姓名相同可留空"
            />
            <div className="grid grid-cols-2 gap-4">
              <Select label="性別 *" name="gender" required>
                <option value="male">男</option>
                <option value="female">女</option>
              </Select>
              <Select label="角色 *" name="role" required>
                <option value="member">會員</option>
                <option value="vice_leader">副團長</option>
                <option value="leader">團長</option>
                <option value="guest">臨打（非會員）</option>
              </Select>
            </div>
            <Textarea
              label="備註"
              name="notes"
              placeholder="選填"
            />
          </CardBody>
        </Card>

        <Card className="mt-4">
          <CardHeader>
            <h2 className="font-semibold text-gray-800">帳號狀態</h2>
          </CardHeader>
          <CardBody>
            <div className="space-y-2">
              {[
                { value: 'active', label: '正式會員', desc: '已確認加入球隊' },
                { value: 'pending', label: '待確認', desc: '從 LINE 接龍匯入，需補填資料' },
              ].map(opt => (
                <label key={opt.value} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="status"
                    value={opt.value}
                    defaultChecked={opt.value === 'active'}
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
          <Link href="/members">
            <Button type="button" variant="secondary">取消</Button>
          </Link>
          <Button type="submit">儲存會員</Button>
        </div>
      </form>
    </div>
  )
}
