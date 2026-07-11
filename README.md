# 🏸 羽球隊管理系統 — Badminton Club Manager

Next.js 16 · TypeScript · Tailwind CSS · Supabase PostgreSQL

> 本檔案是**本機安裝與執行步驟**。專案背景、功能規則、進度與部署資訊等知識性內容，請見 `KB/00_PROJECT.md`（AI Agent／新接手者請先看這份）。

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

`supabase/migrations/` 目前共有多個檔案（001 至 013，另有 010a），到 Supabase Dashboard → SQL Editor，**依編號順序**貼上並執行全部檔案：

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_seed_test_data.sql
...（依編號遞增，依序執行到最新一筆）
```

`001_initial_schema.sql` 建立基礎結構，包含：
- 11 張資料表（members, seasons, fee_rules, activities, registrations, attendance_records... 等）
- 全部 Index、Constraint、Trigger
- Views（member_debt_summary, activity_financials, season_financials）
- 初始季度資料（2024–2026 年各季）
- 初始預設收費規則
- Row Level Security (RLS) Policy

後續編號的檔案為增量調整（付款類型、季度日期、會員停用、費用獎金、稽核紀錄、角色制收費等）。

⚠️ 待確認：`002_seed_test_data.sql`、`007_reset_seed.sql`、`009_clean_test_data.sql` 等檔名帶有「seed／reset／clean test data」字樣，是否應在正式環境執行尚未確認，正式環境操作前請先確認每個檔案的用途（避免誤清正式資料）。

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
│   │   ├── dashboard/       # 總覽
│   │   ├── activities/      # 活動管理
│   │   ├── members/         # 會員管理
│   │   ├── registrations/   # 報名管理
│   │   ├── attendance/      # 出席管理
│   │   ├── finance/         # 財務管理
│   │   ├── fee-rules/       # 收費規則
│   │   ├── audit-logs/      # 操作紀錄
│   │   ├── export/          # 資料匯出
│   │   ├── settings/        # 系統設定
│   │   └── more/            # 更多（行動版選單）
│   └── api/                 # Route handlers（auth/signout、export）
├── components/
│   ├── ui/                  # Button, Badge, Card, Input, Select
│   └── layout/              # Sidebar, Topbar, BottomNav
├── lib/
│   ├── supabase/            # client.ts, server.ts
│   ├── actions/             # Server Actions（activities, attendance, expenses, fee-rules, members, payment, registrations, seasons）
│   └── utils.ts              # formatDate, formatCurrency...
└── types/index.ts           # 所有 TypeScript 型別定義
```

以上路徑已依實際程式碼核對（每個路由皆有 `page.tsx`）；僅代表「頁面已建立」，不代表功能完整度或是否已通過驗收。

---

## 目前功能狀態

上方各模組的完成度、已知問題與待辦事項，維護在 `KB/PROJECT_STATUS.md`；詳細功能與業務規則說明在 `KB/FEATURES.md`。本檔不重複維護一份完成度表格，避免與 KB 內容不同步。

---

## 技術架構

| 技術 | 說明 |
|------|------|
| Next.js 16 | App Router, Server Components, Server Actions |
| TypeScript | 全型別覆蓋 |
| Tailwind CSS 3 | 原子化 CSS，無外部 UI 庫 |
| Supabase | PostgreSQL + Auth + RLS |
| date-fns | 日期格式化（繁中） |
| lucide-react | 圖示庫 |
