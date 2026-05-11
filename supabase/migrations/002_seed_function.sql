-- 새 사용자 가입 시 기본 카테고리·계좌 자동 생성
-- Supabase 대시보드 → SQL Editor 에 그대로 붙여넣어 실행

create or replace function public.seed_user_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cat_id uuid;
  parents jsonb := '[
    {"name":"수입",       "kind":"income",   "color":"#1D9E75", "subs":["월급","부수입","이자","기타"]},
    {"name":"식비",       "kind":"expense",  "color":"#D85A30", "subs":["식자재","외식","배달","카페","편의점","기타"]},
    {"name":"주거비",     "kind":"expense",  "color":"#1D9E75", "subs":["관리비","가스비","전기세","수도세","기타"]},
    {"name":"생활비",     "kind":"expense",  "color":"#BA7517", "subs":["생활필수품","가전/가구","핸드폰","인터넷","기타"]},
    {"name":"교통비",     "kind":"expense",  "color":"#534AB7", "subs":["대중교통","택시"]},
    {"name":"취미/여가",  "kind":"expense",  "color":"#185FA5", "subs":["문화/공연","구독","취미","기타"]},
    {"name":"꾸밈비",     "kind":"expense",  "color":"#D4537E", "subs":["뷰티/화장품","의류/잡화","미용/헤어"]},
    {"name":"의료/건강",  "kind":"expense",  "color":"#0F6E56", "subs":["병원","약·영양제","운동"]},
    {"name":"자기계발",   "kind":"expense",  "color":"#185FA5", "subs":["독서/구독","스터디/모임","강의수강"]},
    {"name":"경조사",     "kind":"expense",  "color":"#D4537E", "subs":["경조사","기부"]},
    {"name":"여행",       "kind":"expense",  "color":"#1D9E75", "subs":["식사","숙박","이동수단","입장료","관광","기념품"]},
    {"name":"사회생활",   "kind":"expense",  "color":"#BA7517", "subs":["식사","커피/다과","모임비"]},
    {"name":"금융비용",   "kind":"expense",  "color":"#5F5E5A", "subs":["이자비용","세금","과태료"]},
    {"name":"기타",       "kind":"expense",  "color":"#888780", "subs":["기타"]},
    {"name":"이동",       "kind":"transfer", "color":"#888780", "subs":[]}
  ]'::jsonb;
  parent_obj jsonb;
  sub_name text;
  sort_p int := 0;
  sort_s int;
begin
  -- 카테고리 시드
  for parent_obj in select * from jsonb_array_elements(parents) loop
    insert into public.categories (user_id, name, kind, color, sort_order)
    values (
      new.id,
      parent_obj->>'name',
      parent_obj->>'kind',
      parent_obj->>'color',
      sort_p
    ) returning id into cat_id;

    sort_s := 0;
    for sub_name in select * from jsonb_array_elements_text(parent_obj->'subs') loop
      insert into public.categories (user_id, name, parent_id, kind, color, sort_order)
      values (
        new.id,
        sub_name,
        cat_id,
        parent_obj->>'kind',
        parent_obj->>'color',
        sort_s
      );
      sort_s := sort_s + 1;
    end loop;

    sort_p := sort_p + 1;
  end loop;

  -- 기본 결제수단 (보편적인 4개 — 가입 후 본인 카드·계좌 이름으로 자유롭게 편집/추가)
  insert into public.accounts (user_id, name, type, sort_order) values
    (new.id, '현금',         'cash',        0),
    (new.id, '입출금 통장',   'checking',    1),
    (new.id, '신용카드',      'credit_card', 2),
    (new.id, '체크카드',      'debit_card',  3);

  return new;
end;
$$;

-- auth.users 에 새 row 가 생길 때 트리거 실행
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.seed_user_defaults();
