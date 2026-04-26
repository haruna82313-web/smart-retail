create table if not exists public.payment_history (
  id bigserial primary key,
  entry_type text not null check (entry_type in ('debt_payment', 'creditor_payment')),
  reference_id bigint not null,
  party_name text not null,
  amount numeric(12, 2) not null check (amount > 0),
  user_id uuid null,
  created_at timestamptz not null default now()
);

alter table public.payment_history enable row level security;

drop policy if exists "payment_history_select_authenticated" on public.payment_history;
create policy "payment_history_select_authenticated"
on public.payment_history
for select
to authenticated
using (true);

drop policy if exists "payment_history_insert_authenticated" on public.payment_history;
create policy "payment_history_insert_authenticated"
on public.payment_history
for insert
to authenticated
with check (true);
