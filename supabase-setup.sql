create table anonymous_diagnosis (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default now(),
  type text,
  total integer,
  monthly integer,
  income integer,
  raw jsonb
);