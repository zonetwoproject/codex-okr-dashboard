-- OKR Admin Internal DB Schema Draft v0.1
-- Target: PostgreSQL 14+

create extension if not exists pgcrypto;

-- Enum domains
create type okr_status as enum (
  'planned',
  'in_progress',
  'production_released',
  'spec_out',
  'dropped',
  'holding'
);

create type experiment_status as enum (
  'before_start',
  'in_progress',
  'winner_selected',
  'ended',
  'discarded'
);

create type experiment_result as enum (
  '위너 선정 전',
  '대조군(A) 위너 선정',
  '실험군(B) 위너 선정'
);

create type target_type as enum (
  'objective',
  'kr',
  'sub_kr',
  'initiative'
);

create type source_type as enum (
  'manual',
  'synced',
  'calculated'
);

create type input_status as enum (
  'registered',
  'converted',
  'rejected'
);

create type input_decision as enum (
  'convert',
  'reject'
);

-- Core entities
create table objectives (
  id uuid primary key default gen_random_uuid(),
  half varchar(2) not null check (half in ('H1', 'H2')),
  year int not null,
  title varchar(300) not null,
  definition text,
  division varchar(120) not null,
  team varchar(120),
  domain varchar(80) not null,
  aarrr_tag varchar(40) not null default '-',
  baseline numeric(18,4) not null default 0,
  q1_target numeric(18,4) not null default 100,
  q2_target numeric(18,4) not null default 100,
  owner varchar(120) not null default 'unassigned',
  status varchar(40) not null default 'active',
  classification_override varchar(40),
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index idx_objectives_active on objectives (year, half, division, domain) where deleted_at is null;

create table krs (
  id uuid primary key default gen_random_uuid(),
  objective_id uuid not null references objectives(id),
  title varchar(300) not null,
  definition text,
  unit varchar(40),
  target_value numeric(18,4) not null check (target_value > 0),
  baseline numeric(18,4) not null default 0,
  q1_target numeric(18,4) not null,
  q2_target numeric(18,4) not null,
  owner_scope varchar(20) not null default 'division',
  division varchar(120),
  team varchar(120),
  domain varchar(80),
  aarrr_tag varchar(40) not null default '-',
  owner varchar(120) not null default 'unassigned',
  status okr_status not null default 'planned',
  classification_override varchar(40),
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index idx_krs_obj on krs (objective_id) where deleted_at is null;
create index idx_krs_filter on krs (division, team, domain, status) where deleted_at is null;

create table sub_krs (
  id uuid primary key default gen_random_uuid(),
  kr_id uuid not null references krs(id),
  title varchar(300) not null,
  definition text,
  target_value numeric(18,4) not null check (target_value > 0),
  baseline numeric(18,4) not null default 0,
  q1_target numeric(18,4) not null,
  q2_target numeric(18,4) not null,
  owner_scope varchar(20) not null default 'division',
  division varchar(120),
  team varchar(120),
  domain varchar(80),
  aarrr_tag varchar(40) not null default '-',
  owner varchar(120) not null default 'unassigned',
  status okr_status not null default 'planned',
  classification_override varchar(40),
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index idx_sub_krs_kr on sub_krs (kr_id) where deleted_at is null;

create table initiatives (
  id uuid primary key default gen_random_uuid(),
  objective_id uuid not null references objectives(id),
  kr_id uuid references krs(id),
  sub_kr_id uuid references sub_krs(id),
  title varchar(300) not null,
  definition text,
  progress_quant numeric(6,2) not null default 0 check (progress_quant >= 0 and progress_quant <= 100),
  baseline numeric(18,4) not null default 0,
  q1_target numeric(18,4) not null default 1,
  q2_target numeric(18,4) not null default 1,
  division varchar(120),
  team varchar(120),
  domain varchar(80),
  aarrr_tag varchar(40) not null default '-',
  owner varchar(120) not null default 'unassigned',
  status okr_status not null default 'planned',
  classification_override varchar(40),
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index idx_initiatives_obj on initiatives (objective_id) where deleted_at is null;
create index idx_initiatives_kr on initiatives (kr_id, sub_kr_id) where deleted_at is null;

create table experiments (
  id uuid primary key default gen_random_uuid(),
  platform_experiment_id varchar(120),
  title varchar(300) not null,
  aarrr_tag varchar(40) not null,
  owner varchar(120) not null default 'unassigned',
  status experiment_status not null default 'before_start',
  hypothesis text,
  start_date date,
  end_date date,
  result experiment_result not null default '위너 선정 전',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index idx_experiments_filter on experiments (status, aarrr_tag, owner) where deleted_at is null;

-- Single-target mapping per experiment
create table experiment_mappings (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references experiments(id),
  target_type varchar(20) not null check (target_type in ('kr', 'initiative')),
  target_id uuid not null,
  weight numeric(6,2) check (weight >= 0 and weight <= 100),
  rationale text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (experiment_id)
);
create index idx_experiment_mapping_target on experiment_mappings (target_type, target_id);

create table monthly_performances (
  id uuid primary key default gen_random_uuid(),
  target_type target_type not null,
  target_id uuid not null,
  year_month varchar(7) not null check (year_month ~ '^\\d{4}-\\d{2}$'),
  actual_value numeric(18,4) not null,
  source_type source_type not null default 'manual',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (target_type, target_id, year_month)
);
create index idx_monthly_perf_lookup on monthly_performances (target_type, target_id, year_month desc);

create table input_sources (
  id uuid primary key default gen_random_uuid(),
  title varchar(300) not null,
  summary text,
  detail text not null,
  reference_url text,
  division varchar(120),
  team varchar(120) not null,
  reporter varchar(120) not null,
  classification varchar(80) not null,
  product varchar(80) not null,
  source varchar(120) not null,
  priority varchar(8) not null,
  status input_status not null default 'registered',
  working_team varchar(120),
  linked_target_type target_type,
  linked_target_id uuid,
  rejection_reason text,
  deploy_by date,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index idx_input_sources_status on input_sources (status, priority, created_at desc) where deleted_at is null;

-- Admin presets
create table preset_values (
  id uuid primary key default gen_random_uuid(),
  preset_type varchar(40) not null,
  value varchar(120) not null,
  position int not null default 0,
  created_at timestamptz not null default now(),
  unique (preset_type, value)
);

create table preset_team_divisions (
  team varchar(120) primary key,
  division varchar(120) not null,
  updated_at timestamptz not null default now()
);

-- Logs
create table decision_logs (
  id uuid primary key default gen_random_uuid(),
  title varchar(300) not null,
  context text not null,
  decision text not null,
  actor varchar(120) not null,
  timestamp timestamptz not null default now()
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor varchar(120) not null,
  reason text not null,
  action varchar(40) not null,
  entity_type varchar(80) not null,
  entity_id varchar(120) not null,
  before_value jsonb,
  after_value jsonb,
  timestamp timestamptz not null default now()
);
create index idx_audit_entity on audit_logs (entity_type, entity_id, timestamp desc);
create index idx_audit_actor on audit_logs (actor, timestamp desc);

-- Optional trigger utility for updated_at
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_objectives_updated_at before update on objectives for each row execute function set_updated_at();
create trigger trg_krs_updated_at before update on krs for each row execute function set_updated_at();
create trigger trg_sub_krs_updated_at before update on sub_krs for each row execute function set_updated_at();
create trigger trg_initiatives_updated_at before update on initiatives for each row execute function set_updated_at();
create trigger trg_experiments_updated_at before update on experiments for each row execute function set_updated_at();
create trigger trg_monthly_performances_updated_at before update on monthly_performances for each row execute function set_updated_at();
create trigger trg_input_sources_updated_at before update on input_sources for each row execute function set_updated_at();
