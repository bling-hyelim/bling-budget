# DB 스키마 (Supabase / PostgreSQL)

## 테이블 한눈에

| 테이블 | 역할 |
|---|---|
| `auth.users` | Supabase 기본 인증 사용자 (자동 관리) |
| `categories` | 대분류·소분류 카테고리 트리 |
| `accounts` | 결제수단·계좌 (현금/카드/저축/대출 포함) |
| `transactions` | 거래 (지출/수입/이동) |
| `budgets` | 카테고리별 월별 예산 |
| `recurring` | 고정비 정의 (옵션, V1.5) |

## SQL

```sql
-- ============================
-- 1. CATEGORIES (카테고리)
-- ============================
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  parent_id uuid references public.categories(id) on delete cascade,
  kind text not null check (kind in ('income','expense','transfer','saving','debt')),
  color text,                  -- hex like '#D85A30'
  icon text,                   -- emoji or icon key
  sort_order int default 0,
  is_archived boolean default false,
  created_at timestamptz default now()
);

create index categories_user_idx on public.categories(user_id);
create index categories_parent_idx on public.categories(parent_id);

-- ============================
-- 2. ACCOUNTS (결제수단·계좌)
-- ============================
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in (
    'cash','checking','savings','credit_card','debit_card','pay_app','loan','asset','other'
  )),
  initial_balance numeric(14,2) default 0,   -- 시작 잔액
  currency text default 'KRW',
  color text,
  sort_order int default 0,
  is_archived boolean default false,
  -- 부가 정보 (옵션)
  interest_rate numeric(5,3),
  due_day int,
  memo text,
  created_at timestamptz default now()
);

create index accounts_user_idx on public.accounts(user_id);

-- ============================
-- 3. TRANSACTIONS (거래)
-- ============================
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  occurred_on date not null,
  amount numeric(14,2) not null check (amount > 0),    -- 항상 양수, 부호는 type으로 표현
  type text not null check (type in ('income','expense','transfer')),
  category_id uuid references public.categories(id) on delete set null,
  subcategory_id uuid references public.categories(id) on delete set null,
  account_id uuid not null references public.accounts(id) on delete restrict,
  to_account_id uuid references public.accounts(id) on delete restrict,  -- transfer 전용
  memo text,
  is_fixed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index transactions_user_date_idx
  on public.transactions(user_id, occurred_on desc);
create index transactions_user_category_idx
  on public.transactions(user_id, category_id);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end; $$;

create trigger transactions_updated_at
  before update on public.transactions
  for each row execute function public.touch_updated_at();

-- ============================
-- 4. BUDGETS (월별 예산)
-- ============================
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  year int not null check (year between 2000 and 2100),
  month int not null check (month between 1 and 12),
  amount numeric(14,2) not null check (amount >= 0),
  created_at timestamptz default now(),
  unique (user_id, category_id, year, month)
);

create index budgets_user_period_idx
  on public.budgets(user_id, year, month);

-- ============================
-- 5. RECURRING (고정비, V1.5)
-- ============================
create table public.recurring (
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

create policy own_categories   on public.categories   for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy own_accounts     on public.accounts     for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy own_transactions on public.transactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy own_budgets      on public.budgets      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy own_recurring    on public.recurring    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

## 자주 쓰는 쿼리 패턴

### 이번달 카테고리별 지출 집계
```sql
select
  c.name,
  c.color,
  sum(t.amount) as total
from transactions t
join categories c on c.id = t.category_id
where t.user_id = auth.uid()
  and t.type = 'expense'
  and t.occurred_on >= date_trunc('month', current_date)::date
  and t.occurred_on <  (date_trunc('month', current_date) + interval '1 month')::date
group by c.id, c.name, c.color
order by total desc;
```

### 자산 총 현황 (시작 잔액 + 이후 거래 반영)
```sql
with movement as (
  select account_id, coalesce(sum(case
    when type = 'income' then amount
    when type = 'expense' then -amount
    when type = 'transfer' and account_id is not null then -amount
  end), 0) as out_in
  from transactions
  where user_id = auth.uid()
  group by account_id
),
transfer_in as (
  select to_account_id as account_id, sum(amount) as in_amt
  from transactions
  where user_id = auth.uid() and type = 'transfer'
  group by to_account_id
)
select
  a.id, a.name, a.type,
  a.initial_balance
    + coalesce(m.out_in, 0)
    + coalesce(ti.in_amt, 0) as balance
from accounts a
left join movement    m  on m.account_id  = a.id
left join transfer_in ti on ti.account_id = a.id
where a.user_id = auth.uid();
```

### 이번달 예산 진행률
```sql
select
  b.category_id,
  c.name,
  b.amount as budget,
  coalesce(sum(t.amount), 0) as used,
  round(coalesce(sum(t.amount), 0) / nullif(b.amount, 0) * 100, 1) as pct
from budgets b
join categories c on c.id = b.category_id
left join transactions t on t.category_id = b.category_id
  and t.type = 'expense'
  and t.user_id = b.user_id
  and extract(year  from t.occurred_on) = b.year
  and extract(month from t.occurred_on) = b.month
where b.user_id = auth.uid()
  and b.year  = extract(year  from current_date)::int
  and b.month = extract(month from current_date)::int
group by b.id, c.name, b.amount;
```

## 시드 데이터 (17 대분류 + 57 소분류)

누구나 쓸 만한 보편 분류. 가입 후 본인 취향대로 편집·추가·삭제 가능.

| 대분류 | 소분류 |
|---|---|
| 수입 | 월급, 부수입, 이자, 기타 |
| 식비 | 식자재, 외식, 배달, 카페, 편의점, 기타 |
| 주거비 | 관리비, 가스비, 전기세, 수도세, 기타 |
| 생활비 | 생활필수품, 가전/가구, 핸드폰, 인터넷, 기타 |
| 교통비 | 대중교통, 택시 |
| 취미/여가 | 문화/공연, 구독, 취미, 기타 |
| 꾸밈비 | 뷰티/화장품, 의류/잡화, 미용/헤어 |
| 의료/건강 | 병원, 약·영양제, 운동 |
| 자기계발 | 독서/구독, 스터디/모임, 강의수강 |
| 경조사 | 경조사, 기부 |
| 여행 | 식사, 숙박, 이동수단, 입장료, 관광, 기념품 |
| 사회생활 | 식사, 커피/다과, 모임비 |
| 금융비용 | 이자비용, 세금, 과태료 |
| 기타 | 기타 |
| 이동 | (계좌간 이체, 소분류 없음) |

> **저축/투자, 신용카드 / 대출 상환은 "이동(transfer)"** 으로 처리해주세요.
>
> - **저축/투자**: 적금에 100만원 넣는 건 돈이 줄어드는 게 아니라 입출금 통장 → 적금 계좌로 자리만 옮긴 것. **이동**으로 기록하면 자산 현황에 적금 잔액이 정확히 반영됩니다. (적금/주식/주택청약/연금 등은 별도 계좌로 등록)
> - **신용카드 결제 후 납부**: 카드로 결제할 때 이미 식비·교통 등 카테고리로 지출이 기록되므로, 카드값 갚기는 **입출금 통장 → 신용카드 계좌** 이동.
> - **대출 원금 상환**: **입출금 통장 → 대출 계좌** 이동 (대출 잔액 감소).
> - **대출 이자**: "금융비용 → 이자비용" 카테고리로 지출 기록.
>
> 핵심: **자산이 외부로 빠져나갈 때만 지출**, 내부에서 자리만 바뀌면 이동.

기본 결제수단 4개: **현금 · 입출금 통장 · 신용카드 · 체크카드**

사용자는 가입 후 설정 → 카테고리·결제수단 관리에서 본인 카드·통장 이름(예: "카카오뱅크", "현대 대한항공 카드")으로 자유롭게 편집·추가.
