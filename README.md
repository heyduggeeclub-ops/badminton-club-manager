# 🏸 羽球隊管理系統 — Badminton Club Manager

Next.js 15 · TypeScript · Tailwind CSS · Supabase PostgreSQL

---

## 快速啟動

### 1. 安裝依賴

```bash
cd badminton-club-manager
npm install
```

### 2. 設定環境變數

複製範本並填入你的 Supabase 設定：

```bash
cp .env.local.example .env.local
```

編輯 `.env.local`：

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

> 從 Supabase Dashboard → Settings → API 取得上述值

### 3. 執行 Database Migration

到 Supabase Dashboard → SQL Editor，貼上並執行：

```
supabase/migrations/001_initial_schema.sql
```

此 Migration 包含：
- 11 張資料表（members, seasons, fee_rules, activities, registrations, attendance_records... 等）
- 全部 Index、Constraint、Trigger
- Views（member_debt_summary, activity_financials, season_financials）
- 初始季度資料（2024–2026 年各季）
- 初始預設收費規則
- Row Level Security (RLS) Policy

### 4. 建立管理員帳號

在 Supabase Dashboard → Authentication → Users → Invite User，
建立管理員 Email 後，到 SQL Editor 執行：

```sql
-- 將帳號設為團長
INSERT INTO public.members (user_id, name, display_name, gender, role, status)
VALUES (
  '<your-user-id>',   -- 從 auth.users 複製 UUID
  '你的名字',
  '你的暱稱',
  'male',             -- 或 'female'
  'leader',
  'active'
);
```

### 5. 啟動開發伺服器

```bash
npm run dev
```

打開 http://localhost:3000 即可使用。

---

## 專案結構

```
src/
├── app/
│   ├── login/               # 登入頁
│   ├── (admin)/             # 管理後台（需登入）
│   │   ├── layout.tsx       # Sidebar + Topbar 佈局
│   │   ├── dashboard/       # ✅ Phase 1 完成
│   │   ├── activities/      # ✅ Phase 1 完成
│   │   ├── members/         # ✅ Phase 1 完成
│   │   ├── registrations/   # 🚧 Phase 2
│   │   ├── attendance/      # 🚧 Phase 2
│   │   ├── finance/         # 🚧 Phase 2
│   │   └── fee-rules/       # 🚧 Phase 2
│   └── api/auth/signout/    # 登出 API
├── components/
│   ├── ui/                  # Button, Badge, Card, Input, Select
│   └── layout/              # Sidebar, Topbar, PageHeader
├── lib/
│   ├── supabase/            # client.ts, server.ts
│   ├── actions/             # Server Actions (activities, members)
│   └── utils.ts             # formatDate, formatCurrency...
└── types/index.ts           # 所有 TypeScript 型別定義
```

---

## Phase 1 完成功能

| 功能 | 狀態 | 路徑 |
|------|------|------|
| 登入 / 登出 | ✅ | `/login` |
| Dashboard 總覽 | ✅ | `/dashboard` |
| 活動列表 | ✅ | `/activities` |
| 新增活動 | ✅ | `/activities/new` |
| 活動詳情 | ✅ | `/activities/[id]` |
| 會員列表 | ✅ | `/members` |
| 新增會員 | ✅ | `/members/new` |
| 會員詳情 | ✅ | `/members/[id]` |

## Phase 2 計畫功能

- 報名管理（LINE 接龍匯入、候補遞補）
- 出席打卡 & 費用鎖定
- 收費記錄（全額 / 部分付款）
- 欠款追蹤
- 財務報表（月報、季報）
- 收費規則管理
- 操作紀錄查詢

---

## 技術架構

| 技術 | 說明 |
|------|------|
| Next.js 15 | App Router, Server Components, Server Actions |
| TypeScript | 全型別覆蓋 |
| Tailwind CSS 3 | 原子化 CSS，無外部 UI 庫 |
| Supabase | PostgreSQL + Auth + RLS |
| date-fns | 日期格式化（繁中） |
| lucide-react | 圖示庫 |
