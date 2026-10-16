-- =============================================================================
-- VISTA DO LAGO — Esquema principal (Supabase / PostgreSQL)
-- Tabelas, restrições, índices, gatilhos, funções seguras (RPC) e RLS.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tipos enumerados
-- -----------------------------------------------------------------------------
create type public.app_role as enum ('admin', 'broker');
create type public.lot_status as enum ('available', 'reserved', 'sold', 'unavailable');
create type public.lead_stage as enum (
  'new', 'first_contact', 'in_progress', 'visit_scheduled',
  'proposal_sent', 'negotiation', 'won', 'lost'
);
create type public.visit_status as enum ('scheduled', 'confirmed', 'done', 'canceled', 'no_show');
create type public.proposal_status as enum ('draft', 'sent', 'accepted', 'rejected', 'expired', 'canceled');
create type public.reservation_status as enum ('active', 'released', 'converted', 'expired');
create type public.sale_status as enum ('completed', 'canceled');
create type public.media_category as enum (
  'aerial', 'lake', 'landscape', 'lots', 'access', 'green', 'perspective', 'drone'
);
create type public.lead_source as enum (
  'site_form', 'lot_map', 'whatsapp', 'phone', 'referral', 'social', 'event', 'manual', 'other'
);
create type public.activity_type as enum (
  'note', 'call', 'whatsapp', 'email', 'meeting', 'visit', 'proposal',
  'reservation', 'sale', 'stage_change', 'assignment', 'system'
);

-- -----------------------------------------------------------------------------
-- Utilitário: updated_at automático
-- -----------------------------------------------------------------------------
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- -----------------------------------------------------------------------------
-- Corretores e perfis de usuário
-- -----------------------------------------------------------------------------
create table public.brokers (
  id          uuid primary key default gen_random_uuid(),
  full_name   text not null check (char_length(btrim(full_name)) between 2 and 120),
  phone       text check (phone ~ '^[0-9]{10,13}$'),
  email       text check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  creci       text check (char_length(creci) <= 30),
  active      boolean not null default true,
  user_id     uuid unique references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index brokers_email_unique on public.brokers (lower(email)) where email is not null;
create trigger brokers_updated_at before update on public.brokers
  for each row execute function public.tg_set_updated_at();

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text check (char_length(full_name) <= 120),
  email       text,
  role        public.app_role not null default 'broker',
  broker_id   uuid unique references public.brokers (id) on delete set null,
  active      boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.tg_set_updated_at();

-- -----------------------------------------------------------------------------
-- Funções auxiliares de autorização (SECURITY DEFINER evita recursão de RLS)
-- -----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin' and p.active
  );
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.active
      and (p.role = 'admin' or p.broker_id is not null)
  );
$$;

create or replace function public.current_broker_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select p.broker_id from public.profiles p
  where p.id = auth.uid() and p.active;
$$;

-- -----------------------------------------------------------------------------
-- Empreendimento, quadras e lotes
-- -----------------------------------------------------------------------------
create table public.developments (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  name        text not null,
  description text,
  is_demo     boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger developments_updated_at before update on public.developments
  for each row execute function public.tg_set_updated_at();

create table public.blocks (
  id              uuid primary key default gen_random_uuid(),
  development_id  uuid not null references public.developments (id) on delete cascade,
  code            text not null check (code ~ '^[A-Za-z0-9-]{1,10}$'),
  name            text,
  description     text,
  is_demo         boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (development_id, code)
);
create trigger blocks_updated_at before update on public.blocks
  for each row execute function public.tg_set_updated_at();

create table public.lots (
  id                uuid primary key default gen_random_uuid(),
  block_id          uuid not null references public.blocks (id) on delete restrict,
  number            text not null check (number ~ '^[0-9A-Za-z-]{1,10}$'),
  area_m2           numeric(12, 2) check (area_m2 > 0),
  front_m           numeric(8, 2) check (front_m > 0),
  back_m            numeric(8, 2) check (back_m > 0),
  left_m            numeric(8, 2) check (left_m > 0),
  right_m           numeric(8, 2) check (right_m > 0),
  price             numeric(14, 2) check (price >= 0),
  price_on_request  boolean not null default true,
  description       text check (char_length(description) <= 4000),
  status            public.lot_status not null default 'available',
  svg_path          text check (char_length(svg_path) <= 8000),
  label_x           numeric(10, 2),
  label_y           numeric(10, 2),
  images            text[] not null default '{}',
  is_demo           boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (block_id, number)
);
create index lots_status_idx on public.lots (status);
create trigger lots_updated_at before update on public.lots
  for each row execute function public.tg_set_updated_at();

-- Impede que o status de um lote seja alterado para/de "reservado" ou "vendido"
-- fora dos fluxos oficiais (reserve_lot, release_reservation, register_sale, cancel_sale).
create or replace function public.tg_guard_lot_status()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status
     and coalesce(current_setting('app.lot_workflow', true), '') <> 'on' then
    if new.status in ('reserved', 'sold') then
      raise exception 'Use os fluxos de reserva/venda para alterar o lote para %', new.status
        using errcode = 'P0001', hint = 'lot_workflow_required';
    end if;
    -- Status sustentado por reserva ativa ou venda concluída só muda pelos fluxos oficiais.
    if (old.status = 'reserved' and exists (
          select 1 from public.reservations r where r.lot_id = old.id and r.status = 'active'))
       or (old.status = 'sold' and exists (
          select 1 from public.sales s where s.lot_id = old.id and s.status = 'completed')) then
      raise exception 'Libere a reserva ou cancele a venda antes de alterar este lote'
        using errcode = 'P0001', hint = 'lot_workflow_required';
    end if;
  end if;
  return new;
end $$;
create trigger lots_guard_status before update of status on public.lots
  for each row execute function public.tg_guard_lot_status();

-- Somente lotes livres podem ser excluídos (lotes com histórico devem ficar "indisponíveis")
create or replace function public.tg_guard_lot_delete()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.status in ('reserved', 'sold') then
    raise exception 'Não é possível excluir um lote reservado ou vendido' using errcode = 'P0001';
  end if;
  return old;
end $$;
create trigger lots_guard_delete before delete on public.lots
  for each row execute function public.tg_guard_lot_delete();

-- -----------------------------------------------------------------------------
-- Galeria / imagens
-- -----------------------------------------------------------------------------
create table public.media (
  id               uuid primary key default gen_random_uuid(),
  lot_id           uuid references public.lots (id) on delete set null,
  url              text not null check (char_length(url) <= 2000),
  storage_path     text,
  title            text not null check (char_length(title) between 1 and 160),
  caption          text check (char_length(caption) <= 600),
  category         public.media_category not null,
  is_illustrative  boolean not null default true,
  sort_order       integer not null default 0,
  published        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index media_order_idx on public.media (sort_order, created_at);
create trigger media_updated_at before update on public.media
  for each row execute function public.tg_set_updated_at();

-- -----------------------------------------------------------------------------
-- CRM: leads, interesses e histórico
-- -----------------------------------------------------------------------------
create table public.leads (
  id                uuid primary key default gen_random_uuid(),
  full_name         text not null check (char_length(btrim(full_name)) between 3 and 120),
  phone             text check (phone ~ '^[0-9]{10,13}$'),
  whatsapp          text check (whatsapp ~ '^[0-9]{10,13}$'),
  email             text check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  source            public.lead_source not null default 'manual',
  source_detail     text check (char_length(source_detail) <= 300),
  utm               jsonb,
  stage             public.lead_stage not null default 'new',
  broker_id         uuid references public.brokers (id) on delete set null,
  message           text check (char_length(message) <= 2000),
  notes             text check (char_length(notes) <= 8000),
  next_action       text check (char_length(next_action) <= 300),
  next_action_at    timestamptz,
  lost_reason       text check (char_length(lost_reason) <= 500),
  consent           boolean not null default false,
  consent_at        timestamptz,
  stage_changed_at  timestamptz not null default now(),
  created_by        uuid default auth.uid(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint leads_contact_required check (phone is not null or email is not null)
);
create index leads_stage_idx on public.leads (stage);
create index leads_broker_idx on public.leads (broker_id);
create index leads_created_idx on public.leads (created_at desc);
create index leads_phone_idx on public.leads (phone);
create index leads_email_idx on public.leads (lower(email));
create trigger leads_updated_at before update on public.leads
  for each row execute function public.tg_set_updated_at();

create or replace function public.can_access_lead(p_lead_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_admin() or exists (
    select 1 from public.leads l
    where l.id = p_lead_id
      and l.broker_id is not null
      and l.broker_id = public.current_broker_id()
  );
$$;

create table public.lead_lot_interests (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references public.leads (id) on delete cascade,
  lot_id      uuid not null references public.lots (id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (lead_id, lot_id)
);
create index lead_lot_interests_lot_idx on public.lead_lot_interests (lot_id);

create table public.lead_activities (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references public.leads (id) on delete cascade,
  type        public.activity_type not null,
  description text not null check (char_length(description) between 1 and 4000),
  metadata    jsonb,
  created_by  uuid default auth.uid(),
  created_at  timestamptz not null default now()
);
create index lead_activities_lead_idx on public.lead_activities (lead_id, created_at desc);

-- Histórico automático de criação, mudança de etapa e de corretor
create or replace function public.tg_lead_history()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.lead_activities (lead_id, type, description, metadata)
    values (new.id, 'system', 'Lead cadastrado', jsonb_build_object('source', new.source));
    return new;
  end if;
  if new.stage is distinct from old.stage then
    new.stage_changed_at := now();
    insert into public.lead_activities (lead_id, type, description, metadata)
    values (new.id, 'stage_change', 'Etapa alterada',
            jsonb_build_object('from', old.stage, 'to', new.stage));
  end if;
  if new.broker_id is distinct from old.broker_id then
    insert into public.lead_activities (lead_id, type, description, metadata)
    values (new.id, 'assignment', 'Corretor responsável alterado',
            jsonb_build_object('from', old.broker_id, 'to', new.broker_id));
  end if;
  return new;
end $$;
create trigger leads_history_insert after insert on public.leads
  for each row execute function public.tg_lead_history();
create trigger leads_history_update before update on public.leads
  for each row execute function public.tg_lead_history();

-- -----------------------------------------------------------------------------
-- Visitas, propostas, reservas e vendas
-- -----------------------------------------------------------------------------
create table public.visits (
  id            uuid primary key default gen_random_uuid(),
  lead_id       uuid not null references public.leads (id) on delete cascade,
  lot_id        uuid references public.lots (id) on delete set null,
  broker_id     uuid references public.brokers (id) on delete set null,
  scheduled_at  timestamptz not null,
  duration_min  integer not null default 60 check (duration_min between 15 and 480),
  status        public.visit_status not null default 'scheduled',
  notes         text check (char_length(notes) <= 2000),
  created_by    uuid default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index visits_scheduled_idx on public.visits (scheduled_at);
create index visits_lead_idx on public.visits (lead_id);
create trigger visits_updated_at before update on public.visits
  for each row execute function public.tg_set_updated_at();

create table public.proposals (
  id            uuid primary key default gen_random_uuid(),
  lead_id       uuid not null references public.leads (id) on delete cascade,
  lot_id        uuid not null references public.lots (id) on delete restrict,
  broker_id     uuid references public.brokers (id) on delete set null,
  amount        numeric(14, 2) not null check (amount > 0),
  down_payment  numeric(14, 2) check (down_payment >= 0),
  installments  integer check (installments between 0 and 480),
  conditions    text check (char_length(conditions) <= 4000),
  status        public.proposal_status not null default 'draft',
  valid_until   date,
  sent_at       timestamptz,
  created_by    uuid default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint proposals_down_payment_le_amount check (down_payment is null or down_payment <= amount)
);
create index proposals_lead_idx on public.proposals (lead_id);
create index proposals_lot_idx on public.proposals (lot_id);
create trigger proposals_updated_at before update on public.proposals
  for each row execute function public.tg_set_updated_at();

create table public.reservations (
  id          uuid primary key default gen_random_uuid(),
  lot_id      uuid not null references public.lots (id) on delete restrict,
  lead_id     uuid not null references public.leads (id) on delete restrict,
  broker_id   uuid references public.brokers (id) on delete set null,
  expires_at  timestamptz not null,
  status      public.reservation_status not null default 'active',
  notes       text check (char_length(notes) <= 2000),
  created_by  uuid default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
-- Nunca duas reservas ativas para o mesmo lote
create unique index reservations_one_active_per_lot on public.reservations (lot_id) where status = 'active';
create index reservations_lead_idx on public.reservations (lead_id);
create trigger reservations_updated_at before update on public.reservations
  for each row execute function public.tg_set_updated_at();

create table public.sales (
  id          uuid primary key default gen_random_uuid(),
  lot_id      uuid not null references public.lots (id) on delete restrict,
  lead_id     uuid not null references public.leads (id) on delete restrict,
  broker_id   uuid references public.brokers (id) on delete set null,
  amount      numeric(14, 2) not null check (amount > 0),
  sold_at     date not null default current_date,
  status      public.sale_status not null default 'completed',
  notes       text check (char_length(notes) <= 2000),
  created_by  uuid default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
-- Nunca duas vendas concluídas para o mesmo lote
create unique index sales_one_completed_per_lot on public.sales (lot_id) where status = 'completed';
create index sales_lead_idx on public.sales (lead_id);
create trigger sales_updated_at before update on public.sales
  for each row execute function public.tg_set_updated_at();

-- -----------------------------------------------------------------------------
-- Configurações do site (conteúdo editável pelo administrador)
-- -----------------------------------------------------------------------------
create table public.site_settings (
  key         text primary key check (key in (
                'contact', 'stats', 'location', 'differentials', 'plan', 'privacy', 'about'
              )),
  value       jsonb not null,
  updated_by  uuid default auth.uid(),
  updated_at  timestamptz not null default now()
);
create trigger site_settings_updated_at before update on public.site_settings
  for each row execute function public.tg_set_updated_at();

-- -----------------------------------------------------------------------------
-- Auditoria
-- -----------------------------------------------------------------------------
create table public.audit_log (
  id          bigint generated always as identity primary key,
  table_name  text not null,
  record_id   text,
  action      text not null,
  actor       uuid,
  old_data    jsonb,
  new_data    jsonb,
  created_at  timestamptz not null default now()
);
create index audit_log_record_idx on public.audit_log (table_name, record_id, created_at desc);

create or replace function public.tg_audit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_old jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_new jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  v_id  text  := coalesce(v_new ->> 'id', v_old ->> 'id', v_new ->> 'key', v_old ->> 'key');
begin
  if tg_op = 'UPDATE' and v_old - 'updated_at' = v_new - 'updated_at' then
    return new;
  end if;
  insert into public.audit_log (table_name, record_id, action, actor, old_data, new_data)
  values (tg_table_name, v_id, lower(tg_op), auth.uid(), v_old, v_new);
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'brokers', 'profiles', 'lots', 'blocks', 'leads', 'visits',
    'proposals', 'reservations', 'sales', 'site_settings', 'media'
  ] loop
    execute format(
      'create trigger %I after insert or update or delete on public.%I
         for each row execute function public.tg_audit()', t || '_audit', t);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- Controle anti-spam do formulário público
-- -----------------------------------------------------------------------------
create table public.lead_submission_log (
  id           bigint generated always as identity primary key,
  fingerprint  text not null,
  created_at   timestamptz not null default now()
);
create index lead_submission_log_idx on public.lead_submission_log (fingerprint, created_at desc);

-- =============================================================================
-- Perfis: criação automática e proteção de campos privilegiados
-- =============================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_broker uuid;
begin
  select b.id into v_broker from public.brokers b
   where b.email is not null and lower(b.email) = lower(new.email) and b.user_id is null
   limit 1;
  insert into public.profiles (id, email, full_name, role, broker_id, active)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
          'broker', v_broker, false);
  if v_broker is not null then
    update public.brokers set user_id = new.id where id = v_broker;
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Usuários comuns só podem alterar o próprio nome; papel, vínculo e ativação são do administrador.
create or replace function public.tg_guard_profile()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (new.role, new.active, new.broker_id, new.email)
     is distinct from (old.role, old.active, old.broker_id, old.email)
     and not public.is_admin()
     and auth.uid() is not null then
    raise exception 'Somente administradores podem alterar papel, vínculo ou ativação'
      using errcode = '42501';
  end if;
  return new;
end $$;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.tg_guard_profile();

-- Corretores não podem reatribuir leads para outros corretores
create or replace function public.tg_guard_lead_broker()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.broker_id is distinct from old.broker_id
     and auth.uid() is not null and not public.is_admin() then
    raise exception 'Somente administradores podem reatribuir leads' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger leads_guard_broker before update of broker_id on public.leads
  for each row execute function public.tg_guard_lead_broker();

-- =============================================================================
-- Funções de negócio (RPC)
-- =============================================================================

-- Formulário público: registra/atualiza lead com validação e limite de envios.
create or replace function public.submit_lead(
  p_full_name text,
  p_phone     text,
  p_email     text default null,
  p_message   text default null,
  p_lot_id    uuid default null,
  p_source    text default 'site_form',
  p_consent   boolean default false,
  p_website   text default null,   -- campo "isca" anti-robô: deve vir vazio
  p_utm       jsonb default null,
  p_page      text default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_name    text := btrim(coalesce(p_full_name, ''));
  v_phone   text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_email   text := nullif(lower(btrim(coalesce(p_email, ''))), '');
  v_message text := nullif(btrim(coalesce(p_message, '')), '');
  v_source  public.lead_source;
  v_ip      text;
  v_lead    uuid;
  v_lot     uuid;
  v_recent  integer;
begin
  -- Robôs preenchem o campo oculto: respondemos "ok" sem gravar nada.
  if coalesce(btrim(p_website), '') <> '' then
    return jsonb_build_object('ok', true);
  end if;

  if not coalesce(p_consent, false) then
    raise exception 'consent_required' using errcode = 'P0001';
  end if;
  if char_length(v_name) < 3 or char_length(v_name) > 120 then
    raise exception 'invalid_name' using errcode = 'P0001';
  end if;
  if v_phone !~ '^[0-9]{10,13}$' then
    raise exception 'invalid_phone' using errcode = 'P0001';
  end if;
  if v_email is not null and v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid_email' using errcode = 'P0001';
  end if;
  if v_message is not null and char_length(v_message) > 2000 then
    raise exception 'invalid_message' using errcode = 'P0001';
  end if;

  v_source := case when p_source in ('site_form', 'lot_map', 'whatsapp')
                   then p_source::public.lead_source else 'site_form' end;

  -- Limite de envios: no máximo 3 por telefone/e-mail/IP a cada 10 minutos.
  begin
    v_ip := split_part(
      coalesce(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ''), ',', 1);
  exception when others then
    v_ip := '';
  end;
  select count(*) into v_recent
    from public.lead_submission_log l
   where l.created_at > now() - interval '10 minutes'
     and l.fingerprint in ('tel:' || v_phone, 'mail:' || coalesce(v_email, '-'), 'ip:' || nullif(v_ip, ''));
  if v_recent >= 3 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  insert into public.lead_submission_log (fingerprint) values ('tel:' || v_phone);
  if v_email is not null then
    insert into public.lead_submission_log (fingerprint) values ('mail:' || v_email);
  end if;
  if coalesce(v_ip, '') <> '' then
    insert into public.lead_submission_log (fingerprint) values ('ip:' || v_ip);
  end if;

  if p_lot_id is not null then
    select id into v_lot from public.lots where id = p_lot_id;
  end if;

  -- Evita duplicidade: reaproveita lead em aberto com mesmo telefone ou e-mail.
  select l.id into v_lead from public.leads l
   where (l.phone = v_phone or (v_email is not null and lower(l.email) = v_email))
     and l.stage not in ('won', 'lost')
   order by l.created_at desc
   limit 1;

  if v_lead is null then
    insert into public.leads (
      full_name, phone, whatsapp, email, source, source_detail, utm,
      message, consent, consent_at, created_by
    ) values (
      v_name, v_phone, v_phone, v_email, v_source, left(p_page, 300), p_utm,
      v_message, true, now(), null
    ) returning id into v_lead;
  else
    update public.leads
       set consent = true, consent_at = now(),
           email = coalesce(email, v_email)
     where id = v_lead;
    insert into public.lead_activities (lead_id, type, description, metadata)
    values (v_lead, 'system', 'Novo contato recebido pelo site',
            jsonb_build_object('source', v_source, 'message', v_message, 'lot_id', v_lot));
  end if;

  if v_lot is not null then
    insert into public.lead_lot_interests (lead_id, lot_id)
    values (v_lead, v_lot) on conflict do nothing;
  end if;

  return jsonb_build_object('ok', true);
end $$;

-- Reserva de lote com bloqueio de linha (evita reservas conflitantes)
create or replace function public.reserve_lot(
  p_lot_id uuid, p_lead_id uuid, p_expires_at timestamptz, p_notes text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_status public.lot_status;
  v_res    uuid;
  v_broker uuid;
begin
  if not public.is_staff() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if not public.can_access_lead(p_lead_id) then
    raise exception 'lead_not_accessible' using errcode = '42501';
  end if;
  if p_expires_at is null or p_expires_at <= now() then
    raise exception 'invalid_expiration' using errcode = 'P0001';
  end if;

  select status into v_status from public.lots where id = p_lot_id for update;
  if not found then
    raise exception 'lot_not_found' using errcode = 'P0001';
  end if;
  if v_status <> 'available' then
    raise exception 'lot_not_available' using errcode = 'P0001';
  end if;

  select coalesce(l.broker_id, public.current_broker_id()) into v_broker
    from public.leads l where l.id = p_lead_id;

  insert into public.reservations (lot_id, lead_id, broker_id, expires_at, notes)
  values (p_lot_id, p_lead_id, v_broker, p_expires_at, p_notes)
  returning id into v_res;

  perform set_config('app.lot_workflow', 'on', true);
  update public.lots set status = 'reserved' where id = p_lot_id;
  perform set_config('app.lot_workflow', 'off', true);

  insert into public.lead_lot_interests (lead_id, lot_id) values (p_lead_id, p_lot_id)
  on conflict do nothing;
  insert into public.lead_activities (lead_id, type, description, metadata)
  values (p_lead_id, 'reservation', 'Lote reservado',
          jsonb_build_object('lot_id', p_lot_id, 'reservation_id', v_res, 'expires_at', p_expires_at));
  return v_res;
end $$;

create or replace function public.release_reservation(p_reservation_id uuid, p_reason text default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare r public.reservations%rowtype;
begin
  if not public.is_staff() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  select * into r from public.reservations where id = p_reservation_id for update;
  if not found then
    raise exception 'reservation_not_found' using errcode = 'P0001';
  end if;
  if not public.can_access_lead(r.lead_id) then
    raise exception 'lead_not_accessible' using errcode = '42501';
  end if;
  if r.status <> 'active' then
    raise exception 'reservation_not_active' using errcode = 'P0001';
  end if;

  perform 1 from public.lots where id = r.lot_id for update;
  update public.reservations
     set status = 'released',
         notes = concat_ws(E'\n', notes, nullif('Liberada: ' || coalesce(p_reason, ''), 'Liberada: '))
   where id = r.id;
  perform set_config('app.lot_workflow', 'on', true);
  update public.lots set status = 'available' where id = r.lot_id and status = 'reserved';
  perform set_config('app.lot_workflow', 'off', true);

  insert into public.lead_activities (lead_id, type, description, metadata)
  values (r.lead_id, 'reservation', 'Reserva liberada',
          jsonb_build_object('lot_id', r.lot_id, 'reservation_id', r.id, 'reason', p_reason));
end $$;

-- Libera reservas vencidas (pode ser agendada com pg_cron ou chamada pelo painel)
create or replace function public.expire_reservations()
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  r record;
  v_count integer := 0;
begin
  if auth.uid() is not null and not public.is_staff() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  for r in
    select * from public.reservations
     where status = 'active' and expires_at < now()
     for update skip locked
  loop
    update public.reservations set status = 'expired' where id = r.id;
    perform set_config('app.lot_workflow', 'on', true);
    update public.lots set status = 'available' where id = r.lot_id and status = 'reserved';
    perform set_config('app.lot_workflow', 'off', true);
    insert into public.lead_activities (lead_id, type, description, metadata)
    values (r.lead_id, 'reservation', 'Reserva expirada automaticamente',
            jsonb_build_object('lot_id', r.lot_id, 'reservation_id', r.id));
    v_count := v_count + 1;
  end loop;
  return v_count;
end $$;

-- Registro de venda (somente administrador)
create or replace function public.register_sale(
  p_lot_id uuid, p_lead_id uuid, p_amount numeric, p_sold_at date default current_date,
  p_notes text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_status public.lot_status;
  v_res    public.reservations%rowtype;
  v_sale   uuid;
  v_broker uuid;
begin
  if not public.is_admin() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid_amount' using errcode = 'P0001';
  end if;
  perform 1 from public.leads where id = p_lead_id;
  if not found then
    raise exception 'lead_not_found' using errcode = 'P0001';
  end if;

  select status into v_status from public.lots where id = p_lot_id for update;
  if not found then
    raise exception 'lot_not_found' using errcode = 'P0001';
  end if;
  if v_status in ('sold', 'unavailable') then
    raise exception 'lot_not_available' using errcode = 'P0001';
  end if;

  select * into v_res from public.reservations
   where lot_id = p_lot_id and status = 'active' for update;
  if found then
    if v_res.lead_id <> p_lead_id then
      raise exception 'lot_reserved_for_other_lead' using errcode = 'P0001';
    end if;
    update public.reservations set status = 'converted' where id = v_res.id;
  end if;

  select broker_id into v_broker from public.leads where id = p_lead_id;
  insert into public.sales (lot_id, lead_id, broker_id, amount, sold_at, notes)
  values (p_lot_id, p_lead_id, v_broker, p_amount, coalesce(p_sold_at, current_date), p_notes)
  returning id into v_sale;

  perform set_config('app.lot_workflow', 'on', true);
  update public.lots set status = 'sold' where id = p_lot_id;
  perform set_config('app.lot_workflow', 'off', true);

  update public.leads set stage = 'won' where id = p_lead_id and stage <> 'won';
  insert into public.lead_lot_interests (lead_id, lot_id) values (p_lead_id, p_lot_id)
  on conflict do nothing;
  insert into public.lead_activities (lead_id, type, description, metadata)
  values (p_lead_id, 'sale', 'Venda registrada',
          jsonb_build_object('lot_id', p_lot_id, 'sale_id', v_sale, 'amount', p_amount));
  return v_sale;
end $$;

create or replace function public.cancel_sale(p_sale_id uuid, p_reason text default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare s public.sales%rowtype;
begin
  if not public.is_admin() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  select * into s from public.sales where id = p_sale_id for update;
  if not found or s.status <> 'completed' then
    raise exception 'sale_not_active' using errcode = 'P0001';
  end if;
  perform 1 from public.lots where id = s.lot_id for update;
  update public.sales
     set status = 'canceled',
         notes = concat_ws(E'\n', notes, nullif('Cancelada: ' || coalesce(p_reason, ''), 'Cancelada: '))
   where id = s.id;
  perform set_config('app.lot_workflow', 'on', true);
  update public.lots set status = 'available' where id = s.lot_id and status = 'sold';
  perform set_config('app.lot_workflow', 'off', true);
  insert into public.lead_activities (lead_id, type, description, metadata)
  values (s.lead_id, 'sale', 'Venda cancelada',
          jsonb_build_object('lot_id', s.lot_id, 'sale_id', s.id, 'reason', p_reason));
end $$;

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.brokers             enable row level security;
alter table public.profiles            enable row level security;
alter table public.developments        enable row level security;
alter table public.blocks              enable row level security;
alter table public.lots                enable row level security;
alter table public.media               enable row level security;
alter table public.leads               enable row level security;
alter table public.lead_lot_interests  enable row level security;
alter table public.lead_activities     enable row level security;
alter table public.visits              enable row level security;
alter table public.proposals           enable row level security;
alter table public.reservations        enable row level security;
alter table public.sales               enable row level security;
alter table public.site_settings       enable row level security;
alter table public.audit_log           enable row level security;
alter table public.lead_submission_log enable row level security;

-- Conteúdo público (site institucional)
create policy "public read developments" on public.developments for select using (true);
create policy "public read blocks"       on public.blocks       for select using (true);
create policy "public read lots"         on public.lots         for select using (true);
create policy "public read settings"     on public.site_settings for select using (true);
create policy "public read media"        on public.media        for select using (published or public.is_staff());

-- Administração de conteúdo e estoque
create policy "admin write developments" on public.developments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "admin write blocks" on public.blocks for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "admin write lots" on public.lots for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "admin write media" on public.media for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "admin write settings" on public.site_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Corretores e perfis
create policy "staff read brokers" on public.brokers for select to authenticated
  using (public.is_staff());
create policy "admin write brokers" on public.brokers for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "read own profile or admin" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy "update own profile or admin" on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());
create policy "admin delete profiles" on public.profiles for delete to authenticated
  using (public.is_admin());

-- Leads: administrador vê tudo; corretor vê apenas os seus
create policy "read leads" on public.leads for select to authenticated
  using (public.is_admin() or (broker_id is not null and broker_id = public.current_broker_id()));
create policy "insert leads" on public.leads for insert to authenticated
  with check (public.is_admin() or (public.is_staff() and broker_id = public.current_broker_id()));
create policy "update leads" on public.leads for update to authenticated
  using (public.is_admin() or (broker_id is not null and broker_id = public.current_broker_id()))
  with check (public.is_admin() or broker_id = public.current_broker_id());
create policy "admin delete leads" on public.leads for delete to authenticated
  using (public.is_admin());

-- Tabelas vinculadas ao lead
create policy "read interests" on public.lead_lot_interests for select to authenticated
  using (public.can_access_lead(lead_id));
create policy "insert interests" on public.lead_lot_interests for insert to authenticated
  with check (public.can_access_lead(lead_id));
create policy "delete interests" on public.lead_lot_interests for delete to authenticated
  using (public.can_access_lead(lead_id));

-- Histórico é somente-inclusão (auditável): sem update/delete
create policy "read activities" on public.lead_activities for select to authenticated
  using (public.can_access_lead(lead_id));
create policy "insert activities" on public.lead_activities for insert to authenticated
  with check (public.can_access_lead(lead_id) and created_by = auth.uid());

create policy "read visits" on public.visits for select to authenticated
  using (public.can_access_lead(lead_id));
create policy "insert visits" on public.visits for insert to authenticated
  with check (public.can_access_lead(lead_id));
create policy "update visits" on public.visits for update to authenticated
  using (public.can_access_lead(lead_id)) with check (public.can_access_lead(lead_id));
create policy "admin delete visits" on public.visits for delete to authenticated
  using (public.is_admin());

create policy "read proposals" on public.proposals for select to authenticated
  using (public.can_access_lead(lead_id));
create policy "insert proposals" on public.proposals for insert to authenticated
  with check (public.can_access_lead(lead_id));
create policy "update proposals" on public.proposals for update to authenticated
  using (public.can_access_lead(lead_id)) with check (public.can_access_lead(lead_id));
create policy "admin delete proposals" on public.proposals for delete to authenticated
  using (public.is_admin());

-- Reservas e vendas: leitura conforme o lead; escrita apenas pelas funções RPC
create policy "read reservations" on public.reservations for select to authenticated
  using (public.can_access_lead(lead_id));
create policy "read sales" on public.sales for select to authenticated
  using (public.can_access_lead(lead_id));

create policy "admin read audit" on public.audit_log for select to authenticated
  using (public.is_admin());
-- lead_submission_log: sem políticas (acesso apenas pelas funções SECURITY DEFINER)

-- =============================================================================
-- Permissões de execução das funções
-- =============================================================================
revoke execute on function public.submit_lead(text, text, text, text, uuid, text, boolean, text, jsonb, text) from public;
grant  execute on function public.submit_lead(text, text, text, text, uuid, text, boolean, text, jsonb, text) to anon, authenticated;

revoke execute on function public.reserve_lot(uuid, uuid, timestamptz, text) from public, anon;
revoke execute on function public.release_reservation(uuid, text) from public, anon;
revoke execute on function public.expire_reservations() from public, anon;
revoke execute on function public.register_sale(uuid, uuid, numeric, date, text) from public, anon;
revoke execute on function public.cancel_sale(uuid, text) from public, anon;
grant execute on function public.reserve_lot(uuid, uuid, timestamptz, text) to authenticated;
grant execute on function public.release_reservation(uuid, text) to authenticated;
grant execute on function public.expire_reservations() to authenticated;
grant execute on function public.register_sale(uuid, uuid, numeric, date, text) to authenticated;
grant execute on function public.cancel_sale(uuid, text) to authenticated;

-- =============================================================================
-- Realtime: o mapa público reflete alterações de status imediatamente
-- =============================================================================
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.lots;
  end if;
end $$;
