-- Ocean Wave ICM persistent snapshot store. REFERENCE ONLY — NOT APPLIED.
-- Pair with 20261111_icm_content_factory.sql; this store is deliberately separate
-- until normalized stage/event state is made transactional and consistent.
-- Service-role only. Never put these keys in a browser or commit them.
create table if not exists public.icm_workflow_snapshots (
  id uuid primary key,
  tenant_id uuid not null,
  campaign_id text not null check(length(campaign_id) between 3 and 80),
  revision bigint not null check(revision >= 0),
  status text not null check(status in ('active','completed','cancelled')),
  state jsonb not null check(jsonb_typeof(state)='object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, campaign_id)
);
create index if not exists icm_snapshots_tenant_status
 on public.icm_workflow_snapshots(tenant_id,status,updated_at desc);
alter table public.icm_workflow_snapshots enable row level security;
revoke all on public.icm_workflow_snapshots from public,anon,authenticated;
grant select,insert,update on public.icm_workflow_snapshots to service_role;

-- By default public functions have EXECUTE granted to PUBLIC. Revoke it.
-- Functions run as invoker; service_role is the only database API caller.
create or replace function public.icm_snapshot_create(p_tenant uuid,p_run jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare v_id uuid; v_campaign text; v_rev bigint;
begin
 if p_tenant is null or p_run is null then raise exception 'Missing tenant or run'; end if;
 if p_run->>'workflowVersion' <> 'icm.oceanwave.content.v1' then raise exception 'Unknown workflow version'; end if;
 v_id=(p_run->>'id')::uuid;
 v_campaign=p_run->>'campaignId';
 v_rev=(p_run->>'version')::bigint;
 if v_campaign is null or length(v_campaign) not between 3 and 80 or v_rev < 1 then raise exception 'Invalid run'; end if;
 if p_run->>'status' <> 'active' then raise exception 'New run must be active'; end if;
 if (p_run->'budget'->>'capCents')::bigint < 0
    or (p_run->'budget'->>'spentCents')::bigint < 0
    or (p_run->'budget'->>'reservedCents')::bigint < 0
    or (p_run->'budget'->>'spentCents')::bigint + (p_run->'budget'->>'reservedCents')::bigint > (p_run->'budget'->>'capCents')::bigint
 then raise exception 'Invalid initial budget'; end if;
 if jsonb_array_length(p_run->'events') < 1 then raise exception 'Event evidence missing'; end if;
 insert into public.icm_workflow_snapshots(id,tenant_id,campaign_id,revision,status,state)
 values(v_id,p_tenant,v_campaign,v_rev,'active',p_run);
 return p_run;
end $$;

create or replace function public.icm_snapshot_get(p_tenant uuid,p_id uuid)
returns jsonb language sql stable security invoker set search_path = ''
as $$
 select state from public.icm_workflow_snapshots
 where tenant_id=p_tenant and id=p_id
$$;

create or replace function public.icm_snapshot_cas(
 p_tenant uuid,p_id uuid,p_expected_revision bigint,p_run jsonb
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare v_prev public.icm_workflow_snapshots%rowtype; v_new_revision bigint;
begin
 if p_tenant is null or p_id is null or p_run is null then raise exception 'Missing input'; end if;
 select * into v_prev from public.icm_workflow_snapshots
 where tenant_id=p_tenant and id=p_id for update;
 if not found then raise exception 'ICM run not found'; end if;
 if v_prev.revision<>p_expected_revision then raise exception 'ICM revision conflict'; end if;
 if v_prev.status<>'active' then raise exception 'Completed/cancelled runs are immutable'; end if;
 if p_run->>'id'<>p_id::text or p_run->>'campaignId'<>v_prev.campaign_id
    or p_run->>'workflowVersion'<>'icm.oceanwave.content.v1'
 then raise exception 'Immutable run identity mismatch'; end if;
 v_new_revision=(p_run->>'version')::bigint;
 if v_new_revision<=p_expected_revision then raise exception 'Revision must increase'; end if;
 if p_run->>'status' not in ('active','completed','cancelled') then raise exception 'Invalid workflow status'; end if;
 if (p_run->>'campaignId') <> v_prev.campaign_id then raise exception 'Campaign identity changed'; end if;
 if (p_run->'budget'->>'spentCents')::bigint < 0
    or (p_run->'budget'->>'reservedCents')::bigint < 0
    or (p_run->'budget'->>'spentCents')::bigint + (p_run->'budget'->>'reservedCents')::bigint > (p_run->'budget'->>'capCents')::bigint
 then raise exception 'Budget invariant failed'; end if;
 if jsonb_typeof(p_run->'events')<>'array'
    or jsonb_array_length(p_run->'events')<=jsonb_array_length(v_prev.state->'events')
 then raise exception 'Event history must grow'; end if;
 if exists (
    select 1 from jsonb_array_elements(v_prev.state->'events') with ordinality as old_e(value,idx)
    where old_e.value is distinct from (p_run->'events')->(old_e.idx::int - 1)
 ) then raise exception 'Existing audit events cannot be rewritten'; end if;
 update public.icm_workflow_snapshots
 set state=p_run,revision=v_new_revision,status=p_run->>'status',updated_at=now()
 where tenant_id=p_tenant and id=p_id;
 return p_run;
end $$;
revoke all on function public.icm_snapshot_create(uuid,jsonb) from public,anon,authenticated;
revoke all on function public.icm_snapshot_get(uuid,uuid) from public,anon,authenticated;
revoke all on function public.icm_snapshot_cas(uuid,uuid,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.icm_snapshot_create(uuid,jsonb) to service_role;
grant execute on function public.icm_snapshot_get(uuid,uuid) to service_role;
grant execute on function public.icm_snapshot_cas(uuid,uuid,bigint,jsonb) to service_role;
