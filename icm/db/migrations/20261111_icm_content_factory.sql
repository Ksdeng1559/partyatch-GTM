-- Ocean Wave ICM reference schema — NOT APPLIED.
-- Deploy only after tenant/auth design review, private schema ownership, access audit and backups.
-- The Node demo does not connect to Supabase or process personal data.
create extension if not exists pgcrypto;

create table if not exists public.icm_campaign_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  campaign_id text not null check (length(campaign_id) between 3 and 80),
  workflow_version text not null default 'icm.oceanwave.content.v1',
  segment text not null,
  format text not null,
  platform text not null,
  workflow_status text not null default 'active' check(workflow_status in ('active','completed','cancelled')),
  revision bigint not null default 0 check (revision >= 0),
  idempotency_key text,
  created_by uuid not null,
  budget_cap_cents bigint not null default 0 check (budget_cap_cents >= 0),
  budget_reserved_cents bigint not null default 0 check (budget_reserved_cents >= 0),
  budget_spent_cents bigint not null default 0 check (budget_spent_cents >= 0),
  currency text not null default 'CAD' check(currency = 'CAD'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint icm_budget_safe check (budget_spent_cents + budget_reserved_cents <= budget_cap_cents),
  constraint icm_unique_run_campaign unique (tenant_id, campaign_id),
  constraint icm_idempotency_scope unique (tenant_id, idempotency_key)
);
create index if not exists icm_runs_tenant_status on public.icm_campaign_runs (tenant_id, workflow_status, created_at desc);
-- Establish composite uniqueness BEFORE creating tenant-bound foreign keys.
alter table public.icm_campaign_runs add constraint icm_runs_id_tenant_unique unique (id,tenant_id);

create table if not exists public.icm_stage_runs (
  run_id uuid not null references public.icm_campaign_runs(id) on delete cascade,
  tenant_id uuid not null,
  stage_id text not null check(stage_id in ('research','segmentation','brief','rights','storyboard','creative_review','generation','quality_review','publishing','measurement')),
  status text not null default 'pending' check(status in ('pending','ready','running','awaiting_approval','completed','failed','cancelled')),
  attempts integer not null default 0 check(attempts between 0 and 3),
  provider text,
  provider_job_id text,
  output_uri text,
  receipt_hash text,
  reserved_cents bigint not null default 0 check(reserved_cents >= 0),
  started_at timestamptz,
  ended_at timestamptz,
  primary key(run_id, stage_id),
  foreign key (run_id,tenant_id) references public.icm_campaign_runs(id,tenant_id) on delete cascade
);
create index if not exists icm_stage_status on public.icm_stage_runs (tenant_id, status);

create table if not exists public.icm_approval_decisions (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null,
  tenant_id uuid not null,
  stage_id text not null,
  decision text not null check(decision in ('approved','rejected')),
  reviewer_user_id uuid not null,
  reviewer_role text not null check(reviewer_role in ('client_approver','authorized_reviewer')),
  evidence_uri text not null check(length(evidence_uri)>0),
  decided_at timestamptz not null default now(),
  foreign key (run_id,tenant_id) references public.icm_campaign_runs(id,tenant_id) on delete cascade,
  foreign key (run_id,stage_id) references public.icm_stage_runs(run_id,stage_id),
  unique(run_id,stage_id)
);
create table if not exists public.icm_event_log (
  id bigint generated always as identity primary key,
  run_id uuid not null,
  tenant_id uuid not null,
  event_seq bigint not null check(event_seq > 0),
  event_type text not null,
  actor_id text not null,
  details jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  foreign key (run_id,tenant_id) references public.icm_campaign_runs(id,tenant_id) on delete cascade,
  unique (run_id,event_seq)
);
create index if not exists icm_events_run on public.icm_event_log(run_id,event_seq);
create table if not exists public.icm_idempotency_receipts (
  tenant_id uuid not null,
  operation_key text not null,
  run_id uuid not null,
  response_hash text not null,
  recorded_at timestamptz not null default now(),
  primary key (tenant_id,operation_key),
  foreign key (run_id,tenant_id) references public.icm_campaign_runs(id,tenant_id) on delete cascade
);

-- RLS fail-closed: no browser/client policies. A trusted server worker needs
-- authenticated user + tenant membership + command-level authorization,
-- enforced in server functions, not direct table writes.
alter table public.icm_campaign_runs enable row level security;
alter table public.icm_stage_runs enable row level security;
alter table public.icm_approval_decisions enable row level security;
alter table public.icm_event_log enable row level security;
alter table public.icm_idempotency_receipts enable row level security;
revoke all on public.icm_campaign_runs,public.icm_stage_runs,public.icm_approval_decisions,public.icm_event_log,public.icm_idempotency_receipts from anon,authenticated;
-- No permissive policies: service-role only until server-side RBAC is implemented.
-- SECURITY NOTE: Never expose service_role keys, bypass RLS from browser or use user supplied
-- reviewer_role as proof of authority. Approved publisher must prove an out-of-band
-- operator authorization. App server must use atomic transaction with SELECT FOR UPDATE
-- (or revision CAS) and persist stage, approval, budget and event together.
-- Event log must be append-only to app actors: restrict UPDATE/DELETE via permissions
-- and dedicated stored procedures. The migration itself does not implement stored procedures.
