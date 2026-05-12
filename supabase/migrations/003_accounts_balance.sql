-- accounts.current_balance 도입 — 거래 발생 시 트리거로 자동 갱신
-- 기존: getAccounts 가 매번 전체 transactions 를 fetch 해 잔액 계산
-- 개선: accounts 한 SELECT 만으로 잔액 조회 (transactions 스캔 없음)
--
-- Supabase 대시보드 → SQL Editor 에 그대로 붙여넣어 실행하세요.

-- ============================
-- 1. current_balance 컬럼 추가 + 기존 데이터 백필
-- ============================
alter table public.accounts
  add column if not exists current_balance numeric(14,2);

-- 백필: initial_balance + 거래 누적
update public.accounts a
set current_balance = coalesce(a.initial_balance, 0)
  + coalesce((
      select sum(
        case
          when t.type = 'income'   then  t.amount
          when t.type = 'expense'  then -t.amount
          when t.type = 'transfer' then -t.amount
          else 0
        end
      )
      from public.transactions t
      where t.account_id = a.id
    ), 0)
  + coalesce((
      select sum(t.amount)
      from public.transactions t
      where t.to_account_id = a.id and t.type = 'transfer'
    ), 0);

-- NOT NULL + 디폴트
alter table public.accounts
  alter column current_balance set default 0;

update public.accounts set current_balance = 0 where current_balance is null;

alter table public.accounts
  alter column current_balance set not null;

-- ============================
-- 2. 거래 변경 시 잔액 자동 갱신 트리거
-- ============================
create or replace function public.tx_balance_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- OLD 의 효과 되돌리기 (DELETE 또는 UPDATE)
  if (TG_OP = 'DELETE' or TG_OP = 'UPDATE') then
    if OLD.type = 'income' then
      update public.accounts set current_balance = current_balance - OLD.amount
        where id = OLD.account_id;
    elsif OLD.type = 'expense' then
      update public.accounts set current_balance = current_balance + OLD.amount
        where id = OLD.account_id;
    elsif OLD.type = 'transfer' then
      update public.accounts set current_balance = current_balance + OLD.amount
        where id = OLD.account_id;
      if OLD.to_account_id is not null then
        update public.accounts set current_balance = current_balance - OLD.amount
          where id = OLD.to_account_id;
      end if;
    end if;
  end if;

  -- NEW 적용 (INSERT 또는 UPDATE)
  if (TG_OP = 'INSERT' or TG_OP = 'UPDATE') then
    if NEW.type = 'income' then
      update public.accounts set current_balance = current_balance + NEW.amount
        where id = NEW.account_id;
    elsif NEW.type = 'expense' then
      update public.accounts set current_balance = current_balance - NEW.amount
        where id = NEW.account_id;
    elsif NEW.type = 'transfer' then
      update public.accounts set current_balance = current_balance - NEW.amount
        where id = NEW.account_id;
      if NEW.to_account_id is not null then
        update public.accounts set current_balance = current_balance + NEW.amount
          where id = NEW.to_account_id;
      end if;
    end if;
  end if;

  if (TG_OP = 'DELETE') then return OLD; else return NEW; end if;
end;
$$;

drop trigger if exists tx_balance_trigger on public.transactions;
create trigger tx_balance_trigger
  after insert or update or delete on public.transactions
  for each row execute function public.tx_balance_trigger();

-- ============================
-- 3. 계좌 시작잔액 변경 시 current_balance 동기화
-- ============================
create or replace function public.account_initial_balance_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    -- 새 계좌: current_balance := initial_balance
    new.current_balance := coalesce(new.initial_balance, 0);
  elsif TG_OP = 'UPDATE' and new.initial_balance is distinct from old.initial_balance then
    -- 시작잔액 차액만큼 current_balance 도 조정
    new.current_balance := coalesce(new.current_balance, 0)
      + (coalesce(new.initial_balance, 0) - coalesce(old.initial_balance, 0));
  end if;
  return new;
end;
$$;

drop trigger if exists account_initial_balance_sync on public.accounts;
create trigger account_initial_balance_sync
  before insert or update on public.accounts
  for each row execute function public.account_initial_balance_sync();

-- ============================
-- 4. 인덱스 보강 (RLS 효율)
-- ============================
create index if not exists transactions_account_idx
  on public.transactions(account_id);
create index if not exists transactions_to_account_idx
  on public.transactions(to_account_id);
