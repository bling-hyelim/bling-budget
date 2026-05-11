-- 블링 가계부 초기 스키마
-- Supabase 대시보드 → SQL Editor 에서 그대로 붙여넣어 실행

-- ============================
-- 1. CATEGORIES
-- ============================
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  parent_id uuid references public.categories(id) on delete cascade,
  kind text not null check (kind in ('income','expense','transfer','saving','debt')),
  color text,
  icon text,
  sort_order int default 0,
  is_archived boolean default false,
  created_at timestamptz default now()
);

create index if not exists categories_user_idx on public.categories(user_id);
create index if not exists categories_parent_idx on public.categories(parent_id);

-- ============================
-- 2. ACCOUNTS
-- ============================
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in (
    'cash','checking','savings','credit_card','debit_card','pay_app','loan','asset','other'
  )),
  initial_balance numeric(14,2) default 0,
  currency text default 'KRW',
  color text,
  sort_order int default 0,
  is_archived boolean default false,
  interest_rate numeric(5,3),
  due_day int,
  memo text,
  created_at timestamptz default now()
);

create index if not exists accounts_user_idx on public.accounts(user_id);

-- ============================
-- 3. TRANSACTIONS
-- ============================
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  occurred_on date not null,
  amount numeric(14,2) not null check (amount > 0),
  type text not null check (type in ('income','expense','transfer')),
  category_id uuid references public.categories(id) on delete set null,
  subcategory_id uuid references public.categories(id) on delete set null,
  account_id uuid not null references public.accounts(id) on delete restrict,
  to_account_id uuid references public.accounts(id) on delete restrict,
  memo text,
  is_fixed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists transactions_user_date_idx
  on public.transactions(user_id, occurred_on desc);
create index if not exists transactions_user_category_idx
  on public.transactions(user_id, category_id);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end; $$;

drop trigger if exists transactions_updated_at on public.transactions;
create trigger transactions_updated_at
  before update on public.transactions
  for each row execute function public.touch_updated_at();

-- ============================
-- 4. BUDGETS
-- ============================
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  year int not null check (year between 2000 and 2100),
  month int not null check (month between 1 and 12),
  amount numeric(14,2) not null check (amount >= 0),
  created_at timestamptz default now(),
  unique (user_id, category_id, year, month)
);

create index if not exists budgets_user_period_idx
  on public.budgets(user_id, year, month);

-- ============================
-- 5. RECURRING (고정비)
-- ============================
create table if not exists public.recurring (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category_id uuid references public.categories(id) on delete set null,
  subcategory_id uuid references public.categories(id) on delete set null,
  account_id uuid references public.accounts(id) on delete set null,
  type text not null check (type in ('income','expense')),
  amount numeric(14,2) not null,
  cycle text not null check (cycle in ('monthly','yearly','weekly')),
  day_of_month int,
  is_active boolean default true,
  next_due date,
  created_at timestamptz default now()
);

-- ============================
-- RLS (Row Level Security)
-- ============================
alter table public.categories   enable row level security;
alter table public.accounts     enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets      enable row level security;
alter table public.recurring    enable row level security;

drop policy if exists own_categories   on public.categories;
drop policy if exists own_accounts     on public.accounts;
drop policy if exists own_transactions on public.transactions;
drop policy if exists own_budgets      on public.budgets;
drop policy if exists own_recurring    on public.recurring;

create policy own_categories   on public.categories   for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy own_accounts     on public.accounts     for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy own_transactions on public.transactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy own_budgets      on public.budgets      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy own_recurring    on public.recurring    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
