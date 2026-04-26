create table if not exists public.sales_archive (
  id bigserial primary key,
  source_sale_id bigint not null,
  item text,
  quantity numeric(12, 2),
  unit text,
  price numeric(12, 2),
  cost_price numeric(12, 2),
  profit numeric(12, 2),
  stock_id bigint,
  user_id uuid,
  sale_created_at timestamptz,
  closed_at timestamptz not null default now(),
  closed_by uuid null
);

alter table public.sales_archive enable row level security;

drop policy if exists "sales_archive_select_authenticated" on public.sales_archive;
create policy "sales_archive_select_authenticated"
on public.sales_archive
for select
to authenticated
using (true);

drop policy if exists "sales_archive_insert_authenticated" on public.sales_archive;
create policy "sales_archive_insert_authenticated"
on public.sales_archive
for insert
to authenticated
with check (true);

create or replace function public.close_shop_cleanup(
  p_sale_ids bigint[],
  p_closed_by uuid default null
)
returns void
language plpgsql
security definer
as $$
begin
  if p_sale_ids is null or array_length(p_sale_ids, 1) is null then
    return;
  end if;

  insert into public.sales_archive (
    source_sale_id,
    item,
    quantity,
    unit,
    price,
    cost_price,
    profit,
    stock_id,
    user_id,
    sale_created_at,
    closed_by
  )
  select
    s.id,
    s.item,
    s.quantity,
    s.unit,
    s.price,
    s.cost_price,
    s.profit,
    s.stock_id,
    s.user_id,
    s.created_at,
    p_closed_by
  from public.sales s
  where s.id = any(p_sale_ids);

  delete from public.sales
  where id = any(p_sale_ids);
end;
$$;

grant execute on function public.close_shop_cleanup(bigint[], uuid) to authenticated;
