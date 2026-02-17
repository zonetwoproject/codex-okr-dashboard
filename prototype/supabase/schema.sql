-- OKR Dashboard normalized schema for Supabase (Postgres)
-- Apply in Supabase SQL Editor.

create table if not exists objectives (
  id text primary key,
  half text not null,
  year integer not null,
  title text not null,
  definition text,
  division text,
  domain text,
  team_id text,
  team text,
  aarrr_tag text,
  baseline numeric,
  q1_target numeric,
  q2_target numeric,
  owner text,
  status text,
  start_date date,
  end_date date,
  classification_override text,
  created_at timestamptz,
  updated_at timestamptz,
  deleted_at timestamptz
);

create table if not exists krs (
  id text primary key,
  objective_id text not null references objectives(id),
  title text not null,
  definition text,
  unit text,
  target_value numeric not null,
  baseline numeric,
  q1_target numeric,
  q2_target numeric,
  owner_scope text,
  division text,
  team text,
  domain text,
  aarrr_tag text,
  owner text,
  status text,
  start_date date,
  end_date date,
  classification_override text,
  created_at timestamptz,
  updated_at timestamptz,
  deleted_at timestamptz
);

create table if not exists sub_krs (
  id text primary key,
  kr_id text not null references krs(id),
  title text not null,
  definition text,
  target_value numeric not null,
  baseline numeric,
  q1_target numeric,
  q2_target numeric,
  owner_scope text,
  division text,
  team text,
  domain text,
  aarrr_tag text,
  owner text,
  status text,
  start_date date,
  end_date date,
  classification_override text,
  created_at timestamptz,
  updated_at timestamptz,
  deleted_at timestamptz
);

create table if not exists initiatives (
  id text primary key,
  objective_id text references objectives(id),
  kr_id text references krs(id),
  sub_kr_id text references sub_krs(id),
  title text not null,
  definition text,
  progress_quant numeric,
  baseline numeric,
  q1_target numeric,
  q2_target numeric,
  division text,
  team text,
  domain text,
  aarrr_tag text,
  owner text,
  status text,
  start_date date,
  end_date date,
  classification_override text,
  created_at timestamptz,
  updated_at timestamptz,
  deleted_at timestamptz
);

create table if not exists experiments (
  id text primary key,
  platform_experiment_id text,
  title text not null,
  aarrr_tag text,
  owner text,
  status text,
  hypothesis text,
  start_date date,
  end_date date,
  result text,
  created_at timestamptz,
  updated_at timestamptz,
  deleted_at timestamptz
);

create table if not exists kr_experiment_links (
  id text primary key,
  kr_id text not null references krs(id) on delete cascade,
  experiment_id text not null references experiments(id) on delete cascade,
  weight numeric,
  rationale text,
  created_at timestamptz,
  updated_at timestamptz
);

create table if not exists initiative_experiment_links (
  id text primary key,
  initiative_id text not null references initiatives(id) on delete cascade,
  experiment_id text not null references experiments(id) on delete cascade,
  created_at timestamptz,
  updated_at timestamptz
);

create table if not exists input_sources (
  id text primary key,
  title text not null,
  summary text,
  detail text,
  reference_url text,
  division text,
  team text,
  reporter text,
  classification text,
  product text,
  source text,
  domain text,
  kr_id text references krs(id),
  linked_initiative_id text references initiatives(id),
  priority text,
  status text,
  working_team text,
  rejection_reason text,
  processed_at timestamptz,
  deploy_by date,
  created_at timestamptz,
  updated_at timestamptz,
  deleted_at timestamptz
);

create table if not exists monthly_performances (
  id text primary key,
  target_type text not null,
  target_id text not null,
  year_month text not null,
  actual_value numeric not null,
  source_type text,
  note text,
  created_at timestamptz,
  updated_at timestamptz
);

create unique index if not exists uq_monthly_target on monthly_performances(target_type, target_id, year_month);

create table if not exists decision_logs (
  id text primary key,
  title text not null,
  context text not null,
  decision text not null,
  actor text not null,
  "timestamp" timestamptz not null
);

create table if not exists audit_logs (
  id text primary key,
  actor text not null,
  reason text,
  action text not null,
  entity_type text,
  entity_id text,
  before_value jsonb,
  after_value jsonb,
  "timestamp" timestamptz not null
);

create table if not exists preset_values (
  id bigserial primary key,
  preset_type text not null,
  value text not null,
  position integer not null default 0
);

create unique index if not exists uq_preset_type_value on preset_values(preset_type, value);

create table if not exists preset_team_divisions (
  team text primary key,
  division text not null
);

create index if not exists idx_krs_objective_id on krs(objective_id);
create index if not exists idx_sub_krs_kr_id on sub_krs(kr_id);
create index if not exists idx_initiatives_objective_id on initiatives(objective_id);
create index if not exists idx_initiatives_kr_id on initiatives(kr_id);
create index if not exists idx_initiatives_sub_kr_id on initiatives(sub_kr_id);
create index if not exists idx_kr_experiment_links_kr_id on kr_experiment_links(kr_id);
create index if not exists idx_kr_experiment_links_experiment_id on kr_experiment_links(experiment_id);
create index if not exists idx_initiative_experiment_links_initiative_id on initiative_experiment_links(initiative_id);
create index if not exists idx_initiative_experiment_links_experiment_id on initiative_experiment_links(experiment_id);
create index if not exists idx_input_sources_kr_id on input_sources(kr_id);
create index if not exists idx_input_sources_linked_initiative_id on input_sources(linked_initiative_id);
create index if not exists idx_monthly_performances_target on monthly_performances(target_type, target_id);
