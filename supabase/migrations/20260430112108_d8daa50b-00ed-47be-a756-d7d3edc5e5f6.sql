create table public.tracker_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.tracker_states enable row level security;

create policy "Users can view own tracker state"
  on public.tracker_states for select
  using (auth.uid() = user_id);

create policy "Users can insert own tracker state"
  on public.tracker_states for insert
  with check (auth.uid() = user_id);

create policy "Users can update own tracker state"
  on public.tracker_states for update
  using (auth.uid() = user_id);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tracker_states_touch
  before update on public.tracker_states
  for each row execute function public.touch_updated_at();