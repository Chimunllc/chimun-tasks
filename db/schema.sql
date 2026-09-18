-- db/schema.sql — АМЬД DB-ийн БҮТЭН БҮТЭЦ (дата БАЙХГҮЙ)
--
-- ЯАГААД БАЙГАА ВЭ: энэ фолдерын бусад .sql файлууд нь НЭМЭЛТ (шинэ хүснэгт нэмэх
-- үед бичигдсэн). Үндсэн хүснэгтүүд — app_orders, products, employees, tasks,
-- finance, attendance — нь VPS дээр ГАРААР үүссэн, хаана ч бичигдээгүй байв.
-- Тиймээс 2026-09-18 хүртэл ХООСОН системийг тэгээс босгох боломжгүй байсан:
-- нөөцөөс дата сэргээж болно, харин бүтцийг дахин барих аргагүй.
--
-- ХЭРЭГЛЭЭ:
--   1. Сэргээлт — сервер бүрмөсөн алдагдвал энэ файлаар бүтцийг сэргээнэ.
--   2. Шинэ суулгац — өөр компанид зориулж хоосон DB босгоно (нэг харилцагч =
--      нэг сервер, нэг DB; multi-tenant код БАЙХГҮЙ, дата холилдохгүй).
--
-- ДАХИН ҮҮСГЭХ (VPS дээр):
--   docker exec vps-deploy-postgres-1 pg_dump -U chimun -d chimun \
--     --schema-only --no-owner --no-privileges > schema.sql
--
-- ⚠ Энэ файлыг ГАРААР бүү зас. Бүтэц өөрчлөгдвөл дээрх командыг дахин ажиллуул.
-- ⚠ Эрхийн бодлого (RLS) энд багтсан ч `db/rls.sql` нь эх сурвалж хэвээр —
--   тэндээс уншиж, тэндээ зас.
-- ⚠ `_baraa_backup_20260902`, `_sku_mig_backup_20260827` нь хуучин шилжилтийн
--   нөөц хүснэгтүүд. Шинэ суулгацад ХЭРЭГГҮЙ — dump-аас хасч болно.
-- ⚠ Шинэ суулгац нь Монголд наалдсан зүйлстэй ирнэ (НӨАТ, ₮, банкны задлагч,
--   ажилтныг утсаар таних). Гадаад харилцагчид эдгээрийг тохиргоогоор унтраана.
--
-- Үүсгэсэн: 2026-09-18 · 71 хүснэгт · 15 харагдац

--
-- PostgreSQL database dump
--

\restrict PfmQ7HTMEYVcNDh6JEbkGOYTbNsVtoltxx3t6bbGWwBJ3qNAuRVrmVPrOoLbH2a

-- Dumped from database version 16.14 (Debian 16.14-1.pgdg13+1)
-- Dumped by pg_dump version 16.14 (Debian 16.14-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: sec; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA sec;


--
-- Name: app_orders_link_customer(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.app_orders_link_customer() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
declare
  ph text; nm text; key text; cid text; mrg text;
begin
  if new.customer_id is not null then return new; end if;
  ph := cust_phone_norm(new.phone);
  nm := nullif(btrim(regexp_replace(coalesce(new.customer,''),'\s+',' ','g')), '');
  if ph is not null then
    select id into cid from customers where phone = ph and merged_into is null limit 1;
    if cid is null then
      insert into customers (id, name, phone, email)
      values ('c_' || substr(md5(ph), 1, 10),
              coalesce(nullif(nm, '?'), nm, ph), ph,
              nullif(btrim(coalesce(new.email, '')), ''))
      on conflict do nothing;
      select id into cid from customers where phone = ph and merged_into is null limit 1;
    end if;
  elsif nm is not null and nm <> '?' then
    key := lower(nm);
    cid := 'c_n' || substr(md5(key), 1, 9);
    insert into customers (id, name, email)
    values (cid, nm, nullif(btrim(coalesce(new.email, '')), ''))
    on conflict do nothing;
  end if;
  if cid is not null then
    select merged_into into mrg from customers where id = cid;
    if mrg is not null then cid := mrg; end if;
    new.customer_id := cid;
  end if;
  return new;
exception when others then
  return new;
end;
$$;


--
-- Name: att_requests_sync(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.att_requests_sync() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.member_key := coalesce(nullif(regexp_replace(coalesce(new.req->>'key',''),'\D','','g'),''), new.member_key);
  new.day        := coalesce((nullif(new.req->>'day',''))::date, new.day);
  new.status     := coalesce(nullif(new.req->>'status',''), new.status, 'pending');
  new.updated_at := now();
  return new;
end;
$$;


--
-- Name: cust_phone_norm(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cust_phone_norm(raw text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $_$
  select case
    when regexp_replace(coalesce(raw,''),'\D','','g') ~ '^976[0-9]{8}$' then right(regexp_replace(raw,'\D','','g'),8)
    when regexp_replace(coalesce(raw,''),'\D','','g') ~ '^0?[0-9]{8}$'  then right(regexp_replace(raw,'\D','','g'),8)
    else null end;
$_$;


--
-- Name: employees_capture_alias(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.employees_capture_alias() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.phone IS DISTINCT FROM OLD.phone AND NULLIF(OLD.phone,'') IS NOT NULL THEN
    INSERT INTO public.employee_aliases(alias, pk, kind, note)
    VALUES ('phone:'||OLD.phone, NEW.pk, 'phone', 'утас '||OLD.phone||' → '||COALESCE(NEW.phone,'∅'))
    ON CONFLICT (alias) DO NOTHING;   -- эхний зураглал ялна: дугаар дахин олгогдвол түүхийг хамгаална
  END IF;
  IF NEW.email IS DISTINCT FROM OLD.email AND NULLIF(OLD.email,'') IS NOT NULL THEN
    INSERT INTO public.employee_aliases(alias, pk, kind, note)
    VALUES ('email:'||lower(OLD.email), NEW.pk, 'email', 'мэйл өөрчлөгдсөн')
    ON CONFLICT (alias) DO NOTHING;
  END IF;
  -- Нэр: tasks.assignee (438) ба finance.requested_by (1,371) нь НЭР хадгалдаг тул заавал
  IF NEW.name IS DISTINCT FROM OLD.name AND NULLIF(OLD.name,'') IS NOT NULL THEN
    INSERT INTO public.employee_aliases(alias, pk, kind, note)
    VALUES ('name:'||OLD.name, NEW.pk, 'name', 'нэр '||OLD.name||' → '||COALESCE(NEW.name,'∅'))
    ON CONFLICT (alias) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;


--
-- Name: get_employee_doc(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_employee_doc(p_phone text) RETURNS TABLE(id_doc text, doc_type text)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT id_doc, doc_type FROM public.employee_docs
  WHERE member_key = regexp_replace(coalesce(p_phone,''),'\D','','g');
$$;


--
-- Name: mask_contact(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mask_contact(t text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT CASE
    WHEN coalesce(t,'') = '' THEN NULL
    WHEN length(t) <= 4 THEN '****'
    ELSE left(t, 4) || repeat('*', greatest(0, length(t) - 4))
  END $$;


--
-- Name: my_doc_exists(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.my_doc_exists(p_phone text) RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS(SELECT 1 FROM public.employee_docs
    WHERE member_key = regexp_replace(coalesce(p_phone,''),'\D','','g') AND coalesce(id_doc,'') <> '');
$$;


--
-- Name: nk(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.nk(t text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT regexp_replace(translate(lower(replace(coalesce(t,''),'ё','е')),'acepxykmtbh','асерхукмтвн'),'[^0-9a-zа-я]+','','g') $$;


--
-- Name: products_capture_alias(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.products_capture_alias() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE k text;
BEGIN
  IF NEW.name IS DISTINCT FROM OLD.name
     AND OLD.name IS NOT NULL AND btrim(OLD.name) <> '' THEN
    k := regexp_replace(
           translate(lower(replace(OLD.name, 'ё', 'е')),
                     'acepxykmtbh', 'асерхукмтвн'),
           '[^0-9a-zа-я]+', '', 'g');
    IF k <> '' THEN
      INSERT INTO product_aliases(alias, sku, kind, note, created_by)
      VALUES ('name:' || k, NEW.sku, 'name',
              'auto: нэр солигдсон «' || OLD.name || '» → «' || NEW.name || '»', 'trigger')
      ON CONFLICT (alias) DO NOTHING;
    END IF;
  END IF;

  IF NEW.sku IS DISTINCT FROM OLD.sku
     AND OLD.sku IS NOT NULL AND btrim(OLD.sku) <> '' THEN
    INSERT INTO product_aliases(alias, sku, kind, note, created_by)
    VALUES ('sku:' || lower(OLD.sku), NEW.sku, 'sku',
            'auto: sku солигдсон ' || OLD.sku || ' → ' || NEW.sku, 'trigger')
    ON CONFLICT (alias) DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Толь бичих нь бараа хадгалахыг ХЭЗЭЭ Ч зогсоох ёсгүй. Алдаа гарвал
  -- анхааруулга үлдээгээд үргэлжилнэ (гараар тулгах зам нээлттэй хэвээр).
  RAISE WARNING 'products_capture_alias: % (толь бичигдсэнгүй)', SQLERRM;
  RETURN NEW;
END $$;


--
-- Name: rls_auto_enable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rls_auto_enable() RETURNS event_trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


--
-- Name: set_my_doc(text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_my_doc(p_phone text, p_doc text, p_type text DEFAULT 'image'::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE k text := regexp_replace(coalesce(p_phone,''),'\D','','g');
BEGIN
  IF k = '' OR coalesce(p_doc,'') = '' THEN RETURN; END IF;
  INSERT INTO public.employee_docs(member_key,id_doc,doc_type,updated_at)
    VALUES (k, p_doc, coalesce(p_type,'image'), now())
  ON CONFLICT (member_key) DO UPDATE SET id_doc=excluded.id_doc, doc_type=excluded.doc_type, updated_at=now();
END; $$;


--
-- Name: update_my_contact(text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_my_contact(p_phone text, p_photo text DEFAULT NULL::text, p_new_phone text DEFAULT NULL::text) RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  UPDATE public.employees
  SET photo = COALESCE(NULLIF(btrim(p_photo), ''), photo),
      phone = COALESCE(NULLIF(regexp_replace(COALESCE(p_new_phone,''), '\D', '', 'g'), ''), phone)
  WHERE regexp_replace(COALESCE(phone,''), '\D', '', 'g')
      = regexp_replace(COALESCE(p_phone,''), '\D', '', 'g');
$$;


--
-- Name: update_my_profile(text, text, text, text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_my_profile(p_phone text, p_bank text DEFAULT NULL::text, p_bank_account text DEFAULT NULL::text, p_bank_holder text DEFAULT NULL::text, p_emergency_name text DEFAULT NULL::text, p_emergency_phone text DEFAULT NULL::text, p_address text DEFAULT NULL::text) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE n integer;
BEGIN
  UPDATE public.employees SET
    bank            = COALESCE(NULLIF(btrim(p_bank),''), bank),
    bank_account    = COALESCE(NULLIF(btrim(p_bank_account),''), bank_account),
    bank_holder     = COALESCE(NULLIF(btrim(p_bank_holder),''), bank_holder),
    emergency_name  = COALESCE(NULLIF(btrim(p_emergency_name),''), emergency_name),
    emergency_phone = COALESCE(NULLIF(btrim(p_emergency_phone),''), emergency_phone),
    address         = COALESCE(NULLIF(btrim(p_address),''), address)
  WHERE regexp_replace(coalesce(phone,''),'\D','','g') = regexp_replace(coalesce(p_phone,''),'\D','','g')
    AND regexp_replace(coalesce(p_phone,''),'\D','','g') <> '';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;


--
-- Name: can(text); Type: FUNCTION; Schema: sec; Owner: -
--

CREATE FUNCTION sec.can(p_key text) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'sec', 'pg_temp'
    AS $$
declare v_ph text; v jsonb; v_role text;
begin
  if sec.lvl() >= 100 then return true; end if;              -- CEO бүгдийг
  v_ph := sec.phone();
  if v_ph is null then return false; end if;                 -- нэвтрээгүй

  select mp.perms into v from member_perms mp where mp.person_key = v_ph;
  if v is not null and v ? p_key then
    return coalesce((v ->> p_key)::boolean, false);           -- хувь хүний онцгой эрх
  end if;

  select e.role into v_role from employees e
   where regexp_replace(coalesce(e.phone, ''), '\D', '', 'g') = v_ph
     and e.merged_into is null
   order by e.pk limit 1;
  if v_role is null then return false; end if;

  select rp.perms into v from role_perms rp where lower(rp.role) = lower(v_role);
  if v is not null and v ? p_key then
    return coalesce((v ->> p_key)::boolean, false);           -- албан тушаалын загвар
  end if;

  return coalesce(sec.preset_cap(v_role, p_key), false);      -- багц
end $$;


--
-- Name: can_act(text); Type: FUNCTION; Schema: sec; Owner: -
--

CREATE FUNCTION sec.can_act(p_key text) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$ select coalesce(sec.cap(p_key), true) $$;


--
-- Name: can_customers(); Type: FUNCTION; Schema: sec; Owner: -
--

CREATE FUNCTION sec.can_customers() RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
    select coalesce(sec.cap('customers'), sec.is_ceo() or sec.can_act('orders.pay'))
  $$;


--
-- Name: cap(text); Type: FUNCTION; Schema: sec; Owner: -
--

CREATE FUNCTION sec.cap(p_key text) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'sec', 'pg_temp'
    AS $$
declare v_ph text; v jsonb; v_role text;
begin
  if sec.lvl() >= 100 then return true; end if;
  v_ph := sec.phone();
  if v_ph is null then return null; end if;

  select mp.perms into v from member_perms mp where mp.person_key = v_ph;
  if v is not null and v ? p_key then
    return coalesce((v ->> p_key)::boolean, false);
  end if;

  -- Цагийн ажилтан: бүлгийн загварт байгаагаас өөр ЮУ Ч үгүй (NULL буцаахгүй —
  -- эс бөгөөс `can_act` зөвшөөрөх өгөгдмөл рүү унана).
  if sec.is_daily() then
    select rp.perms into v from role_perms rp where lower(rp.role) = 'цагийн ажилтан';
    return coalesce((v ->> p_key)::boolean, false);
  end if;

  select e.role into v_role from employees e
   where regexp_replace(coalesce(e.phone, ''), '\D', '', 'g') = v_ph
     and e.merged_into is null
   order by e.pk limit 1;
  if v_role is null then return null; end if;

  select rp.perms into v from role_perms rp where lower(rp.role) = lower(v_role);
  if v is not null and v ? p_key then
    return coalesce((v ->> p_key)::boolean, false);
  end if;

  return sec.preset_cap(v_role, p_key);   -- таарахгүй бол NULL
end $$;


--
-- Name: fin_full(); Type: FUNCTION; Schema: sec; Owner: -
--

CREATE FUNCTION sec.fin_full() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
    select sec.is_ceo()
        or sec.is_accountant()
        or exists (select 1 from fin_categories f
                    where f.type = 'fin_branch_perm'
                      and f.code = sec.phone()
                      and coalesce(f.active::text, '1') in ('1','true','t'))
  $$;


--
-- Name: is_accountant(); Type: FUNCTION; Schema: sec; Owner: -
--

CREATE FUNCTION sec.is_accountant() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
    select exists (
      select 1 from employees e
       where regexp_replace(coalesce(e.phone, ''), '\D', '', 'g') = sec.phone()
         and e.merged_into is null
         and e.role ~* 'нягтлан')
  $$;


--
-- Name: is_ceo(); Type: FUNCTION; Schema: sec; Owner: -
--

CREATE FUNCTION sec.is_ceo() RETURNS boolean
    LANGUAGE sql STABLE
    AS $$ select sec.lvl() >= 100 $$;


--
-- Name: is_daily(); Type: FUNCTION; Schema: sec; Owner: -
--

CREATE FUNCTION sec.is_daily() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
    select case
      when ov.v is not null then ov.v = 'daily'
      when e.worker_type = 'daily' then true
      else coalesce(e.role ~* 'өдрийн\s*ажил|цагийн\s*ажил', false)
    end
    from (select sec.phone() as ph) q
    left join lateral (
      select e2.role, e2.worker_type from employees e2
       where regexp_replace(coalesce(e2.phone, ''), '\D', '', 'g') = q.ph
         and e2.merged_into is null
       order by e2.pk limit 1) e on true
    left join lateral (
      select c.value ->> q.ph as v from app_config c
       where c.key = 'worker_type_overrides') ov on true
  $$;


--
-- Name: lvl(); Type: FUNCTION; Schema: sec; Owner: -
--

CREATE FUNCTION sec.lvl() RETURNS integer
    LANGUAGE sql STABLE
    AS $$
    select coalesce(
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'lvl')::int, 0)
  $$;


--
-- Name: phone(); Type: FUNCTION; Schema: sec; Owner: -
--

CREATE FUNCTION sec.phone() RETURNS text
    LANGUAGE sql STABLE
    AS $$
    select nullif(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'phone', '')
  $$;


--
-- Name: preset_cap(text, text); Type: FUNCTION; Schema: sec; Owner: -
--

CREATE FUNCTION sec.preset_cap(p_role text, p_key text) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
    select case
      when p.views @> array[p_key] then true
      when p.actions @> array[p_key] then true
      else false
    end
    from sec.role_presets p
    where lower(trim(coalesce(p_role, ''))) ~ p.pattern
    order by p.ord
    limit 1
  $$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _baraa_backup_20260902; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._baraa_backup_20260902 (
    id text NOT NULL,
    items jsonb,
    backed_up timestamp with time zone DEFAULT now()
);


--
-- Name: _sku_mig_backup_20260827; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._sku_mig_backup_20260827 (
    old_sku text,
    new_sku text,
    id text
);


--
-- Name: ads_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ads_posts (
    id text NOT NULL,
    sku text,
    status text DEFAULT 'draft'::text NOT NULL,
    body text NOT NULL,
    image_url text,
    link_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by text,
    approved_at timestamp with time zone,
    approved_by text,
    published_at timestamp with time zone,
    fb_post_id text,
    campaign_id text,
    error text
);


--
-- Name: app_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_config (
    key text NOT NULL,
    value jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: app_config_public; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.app_config_public AS
 SELECT key,
    value,
    updated_at
   FROM public.app_config
  WHERE (key = ANY (ARRAY['tariffs'::text, 'mevent_category_groups'::text, 'mevent_popularity'::text]));


--
-- Name: app_error_state; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_error_state (
    fp text NOT NULL,
    status text DEFAULT 'new'::text NOT NULL,
    note text,
    fixed_ver text,
    updated_by text,
    updated_at timestamp with time zone DEFAULT now(),
    issue_no integer
);


--
-- Name: app_errors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_errors (
    id bigint NOT NULL,
    at timestamp with time zone DEFAULT now() NOT NULL,
    msg text NOT NULL,
    src text,
    view text,
    person text,
    ver text,
    ua text,
    stack text,
    fp text
);


--
-- Name: app_errors_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.app_errors_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: app_errors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.app_errors_id_seq OWNED BY public.app_errors.id;


--
-- Name: app_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_orders (
    id text NOT NULL,
    number integer,
    contract_no text,
    customer text,
    phone text,
    email text,
    delivery_address text,
    status text DEFAULT 'reserved'::text,
    starts_at date,
    stops_at date,
    items jsonb DEFAULT '[]'::jsonb,
    subtotal_mnt bigint DEFAULT 0,
    discount_type text,
    discount_value bigint DEFAULT 0,
    deposit_mnt bigint DEFAULT 0,
    deposit_log jsonb DEFAULT '[]'::jsonb,
    total_mnt bigint DEFAULT 0,
    paid_mnt bigint DEFAULT 0,
    note text,
    created_by text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    paid_ref text,
    paid_method text,
    paid_date text,
    source text DEFAULT 'app'::text,
    stage_meta jsonb DEFAULT '{}'::jsonb,
    customer_id text
);


--
-- Name: att_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.att_requests (
    id text NOT NULL,
    member_key text NOT NULL,
    day date NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    req jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: attendance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attendance (
    id bigint NOT NULL,
    member_key text NOT NULL,
    member_name text,
    member_phone text,
    kind text DEFAULT 'in'::text NOT NULL,
    ts timestamp with time zone DEFAULT now() NOT NULL,
    day date DEFAULT ((now() AT TIME ZONE 'Asia/Ulaanbaatar'::text))::date NOT NULL,
    branch text,
    token text,
    source text DEFAULT 'qr'::text,
    note text
);


--
-- Name: attendance_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.attendance_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: attendance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.attendance_id_seq OWNED BY public.attendance.id;


--
-- Name: bank_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bank_accounts (
    id text NOT NULL,
    bank text,
    name text,
    account_no text,
    iban text,
    currency text DEFAULT 'MNT'::text,
    purpose text,
    branch text,
    note text,
    sort integer DEFAULT 0,
    active boolean DEFAULT true,
    updated_by text,
    updated_at timestamp with time zone DEFAULT now(),
    owner_key text,
    owner_name text
);


--
-- Name: bank_cards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bank_cards (
    id text NOT NULL,
    last4 text,
    bank text,
    account_id text,
    owner_key text,
    owner_name text,
    branch text,
    card_type text,
    note text,
    sort integer DEFAULT 0,
    active boolean DEFAULT true,
    updated_by text,
    updated_at timestamp with time zone DEFAULT now(),
    default_cat text
);


--
-- Name: bank_income; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bank_income (
    fp text NOT NULL,
    stmt_id text,
    acct text,
    dt date,
    amount bigint NOT NULL,
    payer text,
    payer_acct text,
    memo text,
    status text DEFAULT 'open'::text NOT NULL,
    link_type text,
    link_id text,
    note text,
    decided_by text,
    decided_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: bank_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bank_receipts (
    receipt_id text NOT NULL,
    amount bigint,
    pay_date date,
    ref text,
    used_in text,
    recorded_by text,
    created_at timestamp with time zone DEFAULT now(),
    fp text
);


--
-- Name: bank_statements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bank_statements (
    id text NOT NULL,
    acct text NOT NULL,
    ccy text DEFAULT 'MNT'::text NOT NULL,
    period_from date,
    period_to date,
    file_name text,
    opening bigint,
    closing_stated bigint,
    closing_calc bigint,
    credit_total bigint DEFAULT 0 NOT NULL,
    debit_total bigint DEFAULT 0 NOT NULL,
    row_count integer DEFAULT 0 NOT NULL,
    imported_by text,
    imported_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: bq_customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bq_customers (
    id text NOT NULL,
    number integer,
    name text,
    email text,
    legal_type text,
    archived boolean DEFAULT false,
    order_count integer,
    revenue_in_cents bigint,
    average_order_value_in_cents bigint,
    balance_due_in_cents bigint,
    latest_order_at timestamp with time zone,
    created_at timestamp with time zone,
    phone text,
    address text
);


--
-- Name: bq_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bq_documents (
    id text NOT NULL,
    order_id text,
    customer_id text,
    document_type text,
    number bigint,
    prefix_number text,
    doc_date timestamp with time zone,
    due_date timestamp with time zone,
    status text,
    signed boolean,
    sent boolean,
    confirmed boolean,
    finalized boolean,
    revised boolean,
    grand_total_with_tax_in_cents bigint,
    paid_in_cents bigint,
    deposit_in_cents bigint,
    tax_in_cents bigint,
    created_at timestamp with time zone
);


--
-- Name: bq_order_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bq_order_lines (
    id text NOT NULL,
    order_id text,
    item_id text,
    title text,
    line_type text,
    quantity numeric,
    price_each_in_cents bigint,
    price_in_cents bigint,
    charge_label text,
    charge_length bigint,
    discountable boolean,
    taxable boolean,
    created_at timestamp with time zone
);


--
-- Name: bq_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bq_orders (
    id text NOT NULL,
    number integer,
    status text,
    payment_status text,
    customer_id text,
    starts_at timestamp with time zone,
    stops_at timestamp with time zone,
    item_count integer,
    fulfillment_type text,
    grand_total_with_tax_in_cents bigint,
    total_paid_in_cents bigint,
    total_discount_in_cents bigint,
    discount_in_cents bigint,
    tax_in_cents bigint,
    deposit_in_cents bigint,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    delivery_address text,
    paid_ref text,
    paid_method text,
    paid_date text
);


--
-- Name: bq_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bq_payments (
    id text NOT NULL,
    order_id text,
    customer_id text,
    ptype text,
    provider_method text,
    status text,
    mode text,
    amount_in_cents bigint,
    currency text,
    description text,
    succeeded_at timestamp with time zone,
    created_at timestamp with time zone
);


--
-- Name: bq_plannings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bq_plannings (
    id text NOT NULL,
    order_id text,
    item_id text,
    planning_type text,
    quantity numeric,
    status text,
    starts_at timestamp with time zone,
    stops_at timestamp with time zone,
    reserved_from timestamp with time zone,
    reserved_till timestamp with time zone,
    started numeric,
    stopped numeric,
    created_at timestamp with time zone
);


--
-- Name: bq_products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bq_products (
    id text NOT NULL,
    name text,
    sku text,
    group_name text,
    product_group_id text,
    product_type text,
    base_price_in_cents bigint,
    price_type text,
    price_period text,
    default_purchase_cost_in_cents bigint,
    deposit_in_cents bigint,
    archived boolean DEFAULT false,
    show_in_store boolean,
    photo_url text,
    created_at timestamp with time zone
);


--
-- Name: brand_kit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.brand_kit (
    id text DEFAULT 'default'::text NOT NULL,
    name text,
    tagline text,
    phone text,
    website text,
    color1 text,
    color2 text,
    font text,
    logo text,
    updated_by text,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: catering_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.catering_jobs (
    id text NOT NULL,
    title text DEFAULT ''::text,
    source text DEFAULT 'manual'::text,
    quote_no text DEFAULT ''::text,
    company text DEFAULT ''::text,
    event_date text DEFAULT ''::text,
    guests integer DEFAULT 0,
    location text DEFAULT ''::text,
    status text DEFAULT 'planned'::text,
    menu_json text DEFAULT '[]'::text,
    note text DEFAULT ''::text,
    created_by text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: catering_menu; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.catering_menu (
    id text NOT NULL,
    name text NOT NULL,
    meal text DEFAULT ''::text,
    unit text DEFAULT 'порц'::text,
    note text DEFAULT ''::text,
    sort integer DEFAULT 0,
    active boolean DEFAULT true
);


--
-- Name: company_docs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_docs (
    id text NOT NULL,
    title text NOT NULL,
    category text DEFAULT 'other'::text NOT NULL,
    doc_no text,
    doc_date date,
    counterparty text,
    note text,
    mime text,
    file_name text,
    data text,
    size_bytes bigint,
    uploaded_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customers (
    id text DEFAULT ('c_'::text || substr(md5(((random())::text || (clock_timestamp())::text)), 1, 10)) NOT NULL,
    name text NOT NULL,
    phone text,
    email text,
    company text,
    rd text,
    address text,
    note text,
    merged_into text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    followup_until date
);


--
-- Name: COLUMN customers.followup_until; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customers.followup_until IS 'Энэ өдөр хүртэл «эргэж ирээгүй» жагсаалтад гаргахгүй (холбогдсон/хойшлуулсан)';


--
-- Name: email_optout; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_optout (
    email text NOT NULL,
    opted_at timestamp with time zone DEFAULT now()
);


--
-- Name: employee_aliases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_aliases (
    alias text NOT NULL,
    pk bigint NOT NULL,
    kind text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    source text DEFAULT 'trigger'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    note text,
    CONSTRAINT employee_aliases_kind_check CHECK ((kind = ANY (ARRAY['phone'::text, 'email'::text, 'name'::text])))
);


--
-- Name: TABLE employee_aliases; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.employee_aliases IS 'Ажилтны хуучин таних утга → эзэн (pk). Trigger автоматаар бичнэ. Хатуу устгахгүй — active=false.';


--
-- Name: employee_docs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_docs (
    member_key text NOT NULL,
    id_doc text,
    doc_type text,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: employees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employees (
    pk bigint NOT NULL,
    id text,
    name text,
    role text,
    level integer,
    pin text,
    phone text,
    email text,
    branches jsonb,
    grp text,
    status text,
    request_id text,
    rd text,
    address text,
    photo text,
    emergency_name text,
    emergency_phone text,
    left_at text,
    joined_at text,
    requested_at text,
    seasonal_from text,
    seasonal_to text,
    daily_rate numeric,
    base_salary numeric,
    worker_type text,
    bank text,
    bank_account text,
    bank_holder text,
    gender text,
    merged_into bigint
);


--
-- Name: COLUMN employees.merged_into; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.employees.merged_into IS 'Давхардсан бүртгэлийн мөр — эзэн нь энэ pk. NULL = идэвхтэй мөр. 2026-09-04: бүртгэлийн форм олон удаа илгээгдсэнээс үүссэн 10 мөрийг ингэж тэмдэглэв.';


--
-- Name: employees_pk_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.employees_pk_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: employees_pk_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.employees_pk_seq OWNED BY public.employees.pk;


--
-- Name: evaluations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.evaluations (
    id text NOT NULL,
    period text,
    ratee text,
    rater text,
    type text,
    responsibility numeric,
    quality numeric,
    teamwork numeric,
    initiative numeric,
    kpi_pct numeric,
    note text,
    ts text
);


--
-- Name: expense_learn; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expense_learn (
    key text NOT NULL,
    branch text,
    cat text,
    n integer DEFAULT 1,
    updated_by text,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: fb_ad_actions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fb_ad_actions (
    id bigint NOT NULL,
    at timestamp with time zone DEFAULT now() NOT NULL,
    kind text NOT NULL,
    campaign_id text,
    campaign_name text,
    old_val numeric,
    new_val numeric,
    reason text NOT NULL,
    source text DEFAULT 'auto'::text NOT NULL
);


--
-- Name: fb_ad_actions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fb_ad_actions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fb_ad_actions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fb_ad_actions_id_seq OWNED BY public.fb_ad_actions.id;


--
-- Name: fb_ads_daily; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fb_ads_daily (
    day date NOT NULL,
    ad_id text NOT NULL,
    ad_name text,
    adset_id text,
    campaign_id text,
    campaign_name text,
    post_id text,
    spend_usd numeric(12,2) DEFAULT 0 NOT NULL,
    spend_mnt bigint DEFAULT 0 NOT NULL,
    impressions bigint DEFAULT 0 NOT NULL,
    reach bigint DEFAULT 0 NOT NULL,
    clicks bigint DEFAULT 0 NOT NULL,
    messages integer DEFAULT 0 NOT NULL,
    leads integer DEFAULT 0 NOT NULL,
    raw jsonb,
    fetched_at timestamp with time zone DEFAULT now() NOT NULL,
    purchases integer DEFAULT 0 NOT NULL,
    revenue_usd numeric(12,2) DEFAULT 0 NOT NULL,
    revenue_mnt bigint DEFAULT 0 NOT NULL
);


--
-- Name: fb_campaign_state; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fb_campaign_state (
    campaign_id text NOT NULL,
    name text,
    status text,
    effective_status text,
    daily_usd numeric,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    stop_req timestamp with time zone,
    stop_by text
);


--
-- Name: fb_capi_sent; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fb_capi_sent (
    order_id text NOT NULL,
    event_name text DEFAULT 'Purchase'::text NOT NULL,
    event_id text NOT NULL,
    value_usd numeric(12,2) DEFAULT 0 NOT NULL,
    matched text,
    sent_at timestamp with time zone DEFAULT now() NOT NULL,
    response text
);


--
-- Name: fb_chat_bot_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fb_chat_bot_log (
    id bigint NOT NULL,
    thread_id text NOT NULL,
    at timestamp with time zone DEFAULT now() NOT NULL,
    in_text text,
    out_text text,
    out_mid text,
    tools text,
    model text,
    sent boolean DEFAULT false NOT NULL,
    review boolean DEFAULT false NOT NULL,
    approved_by text,
    error text,
    tok_in integer DEFAULT 0 NOT NULL,
    tok_out integer DEFAULT 0 NOT NULL
);


--
-- Name: fb_chat_bot_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fb_chat_bot_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fb_chat_bot_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fb_chat_bot_log_id_seq OWNED BY public.fb_chat_bot_log.id;


--
-- Name: fb_chats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fb_chats (
    thread_id text NOT NULL,
    psid text,
    name text,
    first_at timestamp with time zone,
    last_at timestamp with time zone,
    last_in_at timestamp with time zone,
    last_in_mid text,
    last_out_at timestamp with time zone,
    msgs_in integer DEFAULT 0 NOT NULL,
    msgs_out integer DEFAULT 0 NOT NULL,
    state text DEFAULT 'bot'::text NOT NULL,
    handoff_at timestamp with time zone,
    handoff_why text,
    turns integer DEFAULT 0 NOT NULL,
    order_id text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: fb_page_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fb_page_posts (
    post_id text NOT NULL,
    created_time timestamp with time zone,
    message text,
    picture text,
    permalink text,
    status_type text,
    link_url text,
    boost text,
    boost_kind text,
    campaign_id text,
    requested_by text,
    requested_at timestamp with time zone,
    error text,
    fetched_at timestamp with time zone DEFAULT now() NOT NULL,
    source text
);


--
-- Name: fin_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fin_categories (
    code text NOT NULL,
    type text,
    name text,
    parent text,
    active integer
);


--
-- Name: finance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.finance (
    id text NOT NULL,
    requested_by text,
    requested_at text,
    amount numeric,
    beneficiary text,
    receipt_amount text,
    variance text,
    close_type text,
    close_note text,
    purpose text,
    justification text,
    priority text,
    status text,
    decision text,
    decision_at text,
    decision_by text,
    decision_reason text,
    executed_at text,
    executed_by text,
    executor text,
    purchase_proof_url text,
    payment_proof_url text,
    purchase_receipt_url text,
    category text,
    dept_branch text,
    frequency text,
    bank text,
    account_number text,
    updated text
);


--
-- Name: ga_daily; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ga_daily (
    day date NOT NULL,
    channel text NOT NULL,
    sessions integer DEFAULT 0 NOT NULL,
    users integer DEFAULT 0 NOT NULL,
    engaged integer DEFAULT 0 NOT NULL,
    leads integer DEFAULT 0 NOT NULL,
    fetched_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: gsc_daily; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gsc_daily (
    day date NOT NULL,
    query text NOT NULL,
    page text NOT NULL,
    clicks integer DEFAULT 0 NOT NULL,
    impressions integer DEFAULT 0 NOT NULL,
    "position" numeric(6,2) DEFAULT 0 NOT NULL,
    fetched_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: hourly_ratings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hourly_ratings (
    pk bigint NOT NULL,
    ts text,
    worker_name text,
    worker_phone text,
    stars integer,
    note text,
    rater_name text,
    rater_phone text
);


--
-- Name: hourly_ratings_pk_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hourly_ratings_pk_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hourly_ratings_pk_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hourly_ratings_pk_seq OWNED BY public.hourly_ratings.pk;


--
-- Name: invoice_no_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.invoice_no_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoices (
    id text DEFAULT ('inv_'::text || substr(md5(((random())::text || (clock_timestamp())::text)), 1, 10)) NOT NULL,
    no bigint DEFAULT nextval('public.invoice_no_seq'::regclass) NOT NULL,
    order_id text,
    order_no bigint,
    customer_id text,
    issued_at date DEFAULT ((now() AT TIME ZONE 'Asia/Ulaanbaatar'::text))::date,
    due_at date,
    buyer jsonb DEFAULT '{}'::jsonb NOT NULL,
    lines jsonb DEFAULT '[]'::jsonb NOT NULL,
    totals jsonb DEFAULT '{}'::jsonb NOT NULL,
    total numeric,
    status text DEFAULT 'issued'::text,
    note text,
    created_by text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: member_branches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.member_branches (
    person_key text NOT NULL,
    branches jsonb DEFAULT '[]'::jsonb NOT NULL,
    updated_by text,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: member_perms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.member_perms (
    person_key text NOT NULL,
    perms jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_by text,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: nomaad_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nomaad_payments (
    id text NOT NULL,
    quote_no text,
    company text,
    total numeric,
    advance numeric,
    balance numeric,
    addon numeric,
    damage numeric,
    recorded_by text,
    recorded_at timestamp with time zone,
    pay_date text,
    note text
);


--
-- Name: nomaad_quote_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nomaad_quote_items (
    pk bigint NOT NULL,
    "Үнийн саналын дугаар" text,
    "Мөр №" text,
    "Ангилал" text,
    "Зүйл" text,
    "Тоо" text,
    "Нэгж" text,
    "Нэгж үнэ ₮" text,
    "Дүн ₮" text,
    "Багцад орсон уу?" text,
    "Тэмдэглэл" text
);


--
-- Name: nomaad_quote_items_pk_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nomaad_quote_items_pk_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nomaad_quote_items_pk_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nomaad_quote_items_pk_seq OWNED BY public.nomaad_quote_items.pk;


--
-- Name: nomaad_quotes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nomaad_quotes (
    "Үнийн саналын дугаар" text NOT NULL,
    "Бүртгэлийн огноо" text,
    "Компанийн нэр" text,
    "Регистрийн дугаар" text,
    "Холбоо барих хүн" text,
    "Утас" text,
    "И-мэйл" text,
    "Кемп" text,
    "Багц" text,
    "Хүний тоо" text,
    "Эхлэх огноо" text,
    "Дуусах огноо" text,
    "Нийт дүн" text,
    "Урьдчилгаа 30%" text,
    "PDF файл" text,
    "Тэмдэглэл" text,
    "Дугаарлалт" text,
    "Төлөв" text,
    "Илгээсэн огноо" text,
    "Нэмэлт үйлчилгээ" text,
    "Тээвэр" text,
    "Анхны өгөгдөл" text,
    "Уулзалтын огноо" text,
    "Хямдрал ₮" text,
    "Уулзалтын тэмдэглэл" text,
    "Эцсийн гэрээний дүн" text,
    "Гэрээ зурсан огноо" text,
    "Байршил" text,
    "Орлого урьдчилгаа" text,
    "Орлого үлдэгдэл" text,
    "Орлого нэмэлт" text,
    "Орлого эвдрэл" text,
    "Орлого огноо" text,
    "Орлого бүртгэсэн" text
);


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    order_no text NOT NULL,
    id text,
    created_at text,
    status text,
    customer_name text,
    phone text,
    address text,
    email text,
    company text,
    register text,
    date_start text,
    date_end text,
    days text,
    items_json text,
    subtotal numeric,
    deposit numeric,
    total numeric,
    note text,
    source text,
    assigned_to text,
    task_id text
);


--
-- Name: pbx_callbacks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pbx_callbacks (
    peer text NOT NULL,
    status text DEFAULT 'no_answer'::text NOT NULL,
    tries integer DEFAULT 0 NOT NULL,
    note text,
    by_key text,
    upto timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: pbx_calls; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pbx_calls (
    call_id text NOT NULL,
    started_at timestamp with time zone NOT NULL,
    direction text NOT NULL,
    peer text,
    ext text,
    fwd text,
    answer_sec integer DEFAULT 0 NOT NULL,
    call_sec integer DEFAULT 0 NOT NULL,
    fetched_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: pbx_calls_hourly; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pbx_calls_hourly (
    day date NOT NULL,
    hour smallint NOT NULL,
    calls integer DEFAULT 0 NOT NULL,
    answered integer DEFAULT 0 NOT NULL,
    talk_sec integer DEFAULT 0 NOT NULL,
    fetched_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT pbx_calls_hourly_hour_check CHECK (((hour >= 0) AND (hour <= 23)))
);


--
-- Name: product_aliases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_aliases (
    alias text NOT NULL,
    sku text DEFAULT ''::text NOT NULL,
    kind text DEFAULT 'name'::text NOT NULL,
    note text,
    created_by text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: product_batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_batches (
    id bigint NOT NULL,
    sku text NOT NULL,
    purchased_at date NOT NULL,
    qty integer DEFAULT 0 NOT NULL,
    unit_cost bigint DEFAULT 0 NOT NULL,
    written_off integer DEFAULT 0 NOT NULL,
    source text,
    voided boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: product_batches_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_batches_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: product_batches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_batches_id_seq OWNED BY public.product_batches.id;


--
-- Name: product_transfers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_transfers (
    id text NOT NULL,
    product_id text,
    sku text,
    from_branch text,
    to_branch text,
    qty integer,
    note text,
    moved_by text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    sku text NOT NULL,
    id text,
    name text,
    category text,
    all_categories jsonb,
    type text,
    price numeric,
    deposit numeric,
    stock integer,
    photo text,
    description text,
    archived boolean DEFAULT false NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    cost numeric,
    purchase_date date,
    supplier text,
    photos jsonb,
    bundle_items jsonb,
    broken integer,
    maintenance integer,
    qty_chimun integer DEFAULT 0,
    qty_mevent integer DEFAULT 0,
    qty_nomaad integer DEFAULT 0,
    variant_group text,
    variant_label text,
    source_url text,
    qty_catering integer DEFAULT 0,
    media_url text,
    code text,
    setup_fee numeric,
    market_value numeric DEFAULT 0,
    purchase_ref text,
    stock_opened_at timestamp with time zone,
    stock_opened_by text,
    stock_approved_at timestamp with time zone,
    stock_approved_by text
);


--
-- Name: COLUMN products.purchase_ref; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.products.purchase_ref IS 'finance.id — энэ барааг худалдаж авсан хөрөнгийн зардлын мөр (2026-09-13)';


--
-- Name: COLUMN products.stock_opened_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.products.stock_opened_at IS 'Нөөцийг биечлэн шалгаж баталгаажуулсан огноо (эхний үлдэгдэл). NULL = шалгаагүй.';


--
-- Name: COLUMN products.stock_approved_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.products.stock_approved_at IS 'Эхний үлдэгдлийн 2-р гарын үсэг (ҮАХ захирал). NULL = батлагдаагүй. Энэ ба stock_opened_at ХОЁУЛАА байж суурь хүчинтэй.';


--
-- Name: public_availability; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.public_availability AS
 SELECT number,
    starts_at,
    stops_at,
    COALESCE(( SELECT jsonb_agg(jsonb_build_object('sku', (it.value ->> 'sku'::text), 'name', (it.value ->> 'name'::text), 'qty', (it.value ->> 'qty'::text))) AS jsonb_agg
           FROM jsonb_array_elements(COALESCE(o.items, '[]'::jsonb)) it(value)), '[]'::jsonb) AS items
   FROM public.app_orders o
  WHERE ((status = ANY (ARRAY['reserved'::text, 'preparation'::text, 'cleaning'::text, 'ready'::text, 'started'::text, 'prepared'::text, 'delivering'::text, 'installing'::text, 'rented'::text, 'teardown'::text, 'returning'::text])) OR ((status = 'draft'::text) AND (source = ANY (ARRAY['m-event-website'::text])) AND (created_at > (now() - '72:00:00'::interval)) AND (COALESCE(note, ''::text) !~~ '%⟦SUSPECT⟧%'::text)));


--
-- Name: VIEW public_availability; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.public_availability IS 'mevent.mn-д нөөц эзэлж байгаа захиалга. Төлвийн жагсаалт app.js-ийн _ORDER_OCCUPYING-тэй ЯГ ИЖИЛ байх ёстой (зөрвөл давхар захиалга үүснэ; test/run.js SCAN-тест хамгаална). Эх хувь: chimun-tasks/db/public_availability.sql';


--
-- Name: public_catalog; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.public_catalog AS
 WITH base AS (
         SELECT p.sku,
            p.id,
            p.code,
            p.name,
            p.category,
            p.all_categories,
            p.type,
            p.price,
            p.deposit,
            p.description,
            p.photo,
            p.media_url,
            p.bundle_items,
            p.variant_group,
            p.variant_label,
            p.setup_fee,
            p.updated_at,
            p.photos,
            GREATEST(0, ((COALESCE(p.qty_mevent, 0) - COALESCE(p.broken, 0)) - COALESCE(p.maintenance, 0))) AS unit_stock
           FROM public.products p
          WHERE ((COALESCE(p.archived, false) = false) AND (COALESCE(p.price, (0)::numeric) > (0)::numeric) AND ((p.type = ANY (ARRAY['service'::text, 'package'::text])) OR (COALESCE(p.qty_mevent, 0) > 0)))
        )
 SELECT sku,
    id,
    code,
    name,
    category,
    all_categories,
    type,
    price,
    deposit,
    description,
    photo,
    media_url,
    bundle_items,
    variant_group,
    variant_label,
    setup_fee,
    updated_at,
        CASE
            WHEN (type = 'package'::text) THEN COALESCE(( SELECT (min(floor(((COALESCE(c2.unit_stock, 0))::numeric / GREATEST((1)::numeric, COALESCE(((c.value ->> 'qty'::text))::numeric, (1)::numeric))))))::integer AS min
               FROM (jsonb_array_elements(COALESCE(b.bundle_items, '[]'::jsonb)) c(value)
                 LEFT JOIN base c2 ON ((c2.sku = (c.value ->> 'sku'::text))))
              WHERE ((c.value ->> 'sku'::text) IS NOT NULL)), 0)
            ELSE unit_stock
        END AS stock,
    photos
   FROM base b;


--
-- Name: VIEW public_catalog; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.public_catalog IS 'mevent.mn-д юу харагдахын ЦОРЫН ГАНЦ дүрэм. Сайтын index.html, build-seo.js, build-products-json.js гурвуулаа эндээс уншина. Дүрэм өөрчлөх = ЭНЭ харагдацыг өөрчлөх, кодыг БИШ.';


--
-- Name: push_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.push_subscriptions (
    endpoint text NOT NULL,
    email text,
    p256dh text,
    auth text,
    user_agent text,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: quotes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quotes (
    quote_no text NOT NULL,
    created_at timestamp with time zone,
    company text,
    reg_no text,
    contact text,
    phone text,
    email text,
    camp text,
    package text,
    guest_count integer,
    date_start timestamp with time zone,
    date_end timestamp with time zone,
    total numeric,
    deposit30 numeric,
    pdf text,
    note text,
    counter integer,
    status text,
    sent_at timestamp with time zone,
    addons text,
    transport text,
    raw jsonb,
    meeting_date date,
    discount numeric,
    meeting_note text,
    final_amount numeric,
    contract_signed_date date,
    location text,
    income_deposit numeric,
    income_balance numeric,
    income_extra numeric,
    income_damage numeric,
    income_date date,
    income_by text
);


--
-- Name: receipt_files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.receipt_files (
    receipt_id text NOT NULL,
    mime text DEFAULT 'application/pdf'::text NOT NULL,
    data text NOT NULL,
    amount numeric,
    pay_date text,
    used_in text,
    uploaded_by text,
    uploaded_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: repairs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.repairs (
    id text NOT NULL,
    sku text NOT NULL,
    product_name text,
    qty integer DEFAULT 1 NOT NULL,
    order_number integer,
    status text DEFAULT 'pending'::text NOT NULL,
    note text,
    photos jsonb DEFAULT '[]'::jsonb,
    fix_photos jsonb DEFAULT '[]'::jsonb,
    reported_by text,
    reported_at timestamp with time zone DEFAULT now(),
    assignee text,
    started_at timestamp with time zone,
    fixed_by text,
    fixed_at timestamp with time zone,
    fix_note text,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: rh_v_documents; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.rh_v_documents AS
 SELECT order_id,
    document_type,
    prefix_number,
    doc_date,
    due_date,
    status,
    signed,
    sent,
    revised,
    round(((grand_total_with_tax_in_cents)::numeric / 100.0)) AS total_mnt,
    round(((paid_in_cents)::numeric / 100.0)) AS paid_mnt
   FROM public.bq_documents d
  ORDER BY doc_date DESC NULLS LAST;


--
-- Name: rh_v_monthly_revenue; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.rh_v_monthly_revenue AS
 SELECT to_char(date_trunc('month'::text, (starts_at)::timestamp with time zone), 'YYYY-MM'::text) AS month,
    (sum(total_mnt))::bigint AS charges_mnt,
    (0)::bigint AS refunds_mnt,
    (sum(total_mnt))::bigint AS net_mnt,
    count(*) AS charge_count,
    (0)::bigint AS refund_count
   FROM public.app_orders
  WHERE ((status <> ALL (ARRAY['draft'::text, 'canceled'::text])) AND (starts_at IS NOT NULL))
  GROUP BY (to_char(date_trunc('month'::text, (starts_at)::timestamp with time zone), 'YYYY-MM'::text))
  ORDER BY (to_char(date_trunc('month'::text, (starts_at)::timestamp with time zone), 'YYYY-MM'::text));


--
-- Name: rh_v_order_items; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.rh_v_order_items AS
 SELECT order_id,
    title,
    quantity,
    round(((price_each_in_cents)::numeric / 100.0)) AS price_each_mnt,
    round(((price_in_cents)::numeric / 100.0)) AS price_mnt,
    charge_label
   FROM public.bq_order_lines l
  WHERE (line_type = 'charge'::text);


--
-- Name: rh_v_orders; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.rh_v_orders AS
 SELECT o.number,
    o.id,
    COALESCE(c.name, '?'::text) AS customer,
    c.phone,
    c.email,
    c.address AS customer_address,
    o.delivery_address,
    o.status,
    o.payment_status,
    o.starts_at,
    o.stops_at,
    o.item_count,
    round(((o.grand_total_with_tax_in_cents)::numeric / 100.0)) AS total_mnt,
    round(((o.total_paid_in_cents)::numeric / 100.0)) AS paid_mnt,
    o.created_at
   FROM (public.bq_orders o
     LEFT JOIN public.bq_customers c ON ((c.id = o.customer_id)))
  ORDER BY o.starts_at DESC NULLS LAST;


--
-- Name: rh_v_payment_method; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.rh_v_payment_method AS
 SELECT COALESCE(provider_method, 'тодорхойгүй'::text) AS method,
    round((sum(
        CASE
            WHEN (ptype = 'payment_charges'::text) THEN amount_in_cents
            ELSE (0)::bigint
        END) / 100.0)) AS charges_mnt,
    count(*) FILTER (WHERE (ptype = 'payment_charges'::text)) AS charge_count
   FROM public.bq_payments
  WHERE (status = 'succeeded'::text)
  GROUP BY COALESCE(provider_method, 'тодорхойгүй'::text)
  ORDER BY (round((sum(
        CASE
            WHEN (ptype = 'payment_charges'::text) THEN amount_in_cents
            ELSE (0)::bigint
        END) / 100.0))) DESC;


--
-- Name: rh_v_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.rh_v_summary AS
 SELECT ( SELECT (COALESCE(sum(app_orders.total_mnt), (0)::numeric))::bigint AS "coalesce"
           FROM public.app_orders
          WHERE (app_orders.status <> ALL (ARRAY['draft'::text, 'canceled'::text]))) AS total_charges_mnt,
    (0)::bigint AS total_refunds_mnt,
    ( SELECT (COALESCE(sum(app_orders.total_mnt), (0)::numeric))::bigint AS "coalesce"
           FROM public.app_orders
          WHERE (app_orders.status <> ALL (ARRAY['draft'::text, 'canceled'::text]))) AS net_revenue_mnt,
    ( SELECT (COALESCE(sum(app_orders.paid_mnt), (0)::numeric))::bigint AS "coalesce"
           FROM public.app_orders
          WHERE (app_orders.status <> ALL (ARRAY['draft'::text, 'canceled'::text]))) AS collected_mnt,
    ( SELECT count(*) AS count
           FROM public.app_orders
          WHERE (app_orders.status <> ALL (ARRAY['draft'::text, 'canceled'::text]))) AS real_orders,
    ( SELECT count(*) AS count
           FROM public.app_orders) AS total_orders,
    ( SELECT count(DISTINCT app_orders.customer) AS count
           FROM public.app_orders
          WHERE ((app_orders.status <> ALL (ARRAY['draft'::text, 'canceled'::text])) AND (app_orders.customer IS NOT NULL) AND (app_orders.customer <> '?'::text))) AS active_customers,
    ( SELECT min(app_orders.starts_at) AS min
           FROM public.app_orders
          WHERE (app_orders.status <> ALL (ARRAY['draft'::text, 'canceled'::text]))) AS first_payment_at,
    ( SELECT max(app_orders.starts_at) AS max
           FROM public.app_orders
          WHERE (app_orders.status <> ALL (ARRAY['draft'::text, 'canceled'::text]))) AS last_payment_at;


--
-- Name: role_perms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_perms (
    role text NOT NULL,
    perms jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_by text,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: salary_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.salary_payments (
    id text NOT NULL,
    person_key text NOT NULL,
    ym text NOT NULL,
    amount numeric DEFAULT 0 NOT NULL,
    note text,
    paid_by text,
    paid_at timestamp with time zone DEFAULT now()
);


--
-- Name: staff_salary; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_salary (
    person_key text NOT NULL,
    amount numeric DEFAULT 0 NOT NULL,
    updated_by text,
    updated_at timestamp with time zone DEFAULT now(),
    deduct boolean DEFAULT true
);


--
-- Name: stock_counts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_counts (
    id bigint NOT NULL,
    session_id text NOT NULL,
    sku text NOT NULL,
    counted_by text NOT NULL,
    counted_at timestamp with time zone DEFAULT now() NOT NULL,
    system_qty integer DEFAULT 0 NOT NULL,
    counted_qty integer DEFAULT 0 NOT NULL,
    applied boolean DEFAULT false NOT NULL,
    applied_by text,
    applied_at timestamp with time zone,
    note text
);


--
-- Name: stock_counts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stock_counts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stock_counts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stock_counts_id_seq OWNED BY public.stock_counts.id;


--
-- Name: stock_moves; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_moves (
    id bigint NOT NULL,
    sku text NOT NULL,
    branch text NOT NULL,
    delta numeric NOT NULL,
    qty_before numeric,
    qty_after numeric,
    reason text,
    ref text,
    by text,
    note text,
    at timestamp with time zone DEFAULT now()
);


--
-- Name: stock_moves_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stock_moves_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stock_moves_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stock_moves_id_seq OWNED BY public.stock_moves.id;


--
-- Name: task_audio; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_audio (
    task_id text NOT NULL,
    audio text NOT NULL,
    duration integer,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tasks (
    id text NOT NULL,
    title text,
    descr text,
    branch text,
    project text,
    assignee text,
    co_assignees jsonb,
    due text,
    priority text,
    status text,
    kpi_code text,
    created_by text,
    parent_id text,
    kind text,
    stage text,
    created text,
    updated text,
    task_images text,
    completion_photos text,
    requires_photo text
);


--
-- Name: v_app_errors; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_app_errors AS
 SELECT e.fp,
    count(*) AS hits,
    count(DISTINCT e.person) FILTER (WHERE (COALESCE(e.person, ''::text) <> ''::text)) AS users,
    min(e.at) AS first_at,
    max(e.at) AS last_at,
    (array_agg(e.msg ORDER BY e.at DESC))[1] AS msg,
    (array_agg(e.src ORDER BY e.at DESC))[1] AS src,
    (array_agg(e.view ORDER BY e.at DESC))[1] AS view,
    (array_agg(e.stack ORDER BY e.at DESC))[1] AS stack,
    (array_agg(e.ver ORDER BY e.at DESC))[1] AS last_ver,
    count(DISTINCT e.ver) AS vers,
    COALESCE(s.status, 'new'::text) AS status,
    s.note,
    s.fixed_ver,
    s.issue_no,
    s.updated_at
   FROM (public.app_errors e
     LEFT JOIN public.app_error_state s ON ((s.fp = e.fp)))
  GROUP BY e.fp, s.status, s.note, s.fixed_ver, s.issue_no, s.updated_at;


--
-- Name: v_employee_aliases; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_employee_aliases AS
 SELECT a.alias,
    a.kind,
    COALESCE(NULLIF(regexp_replace(COALESCE(e.phone, ''::text), '\D'::text, ''::text, 'g'::text), ''::text), NULLIF(lower(COALESCE(e.email, ''::text)), ''::text), e.name) AS canon
   FROM (public.employee_aliases a
     JOIN public.employees e ON ((e.pk = a.pk)))
  WHERE (a.active AND (e.merged_into IS NULL));


--
-- Name: VIEW v_employee_aliases; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_employee_aliases IS 'Хуучин таних утга → одоогийн каноник personKey. Апп үүнийг татаж canonKey() болгоно.';


--
-- Name: v_finance_safe; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_finance_safe AS
 SELECT id,
    requested_at,
    amount,
    receipt_amount,
    variance,
    close_type,
    purpose,
    category,
    dept_branch,
    status,
    decision,
    decision_at,
    executed_at,
    bank,
    public.mask_contact(account_number) AS account_number,
    updated
   FROM public.finance;


--
-- Name: v_nomaad_payments_safe; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_nomaad_payments_safe AS
 SELECT id,
    quote_no,
    company,
    total,
    advance,
    balance,
    addon,
    damage,
    pay_date,
    recorded_at
   FROM public.nomaad_payments;


--
-- Name: v_orders_safe; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_orders_safe AS
 SELECT id,
    number,
    contract_no,
    customer,
    public.mask_contact(phone) AS phone,
    public.mask_contact(email) AS email,
    delivery_address,
    status,
    source,
    starts_at,
    stops_at,
    items,
    subtotal_mnt,
    discount_type,
    discount_value,
    deposit_mnt,
    total_mnt,
    paid_mnt,
    note,
    created_by,
    created_at,
    updated_at,
    paid_method,
    paid_date,
    stage_meta
   FROM public.app_orders;


--
-- Name: v_quotes_safe; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_quotes_safe AS
 SELECT "Үнийн саналын дугаар" AS quote_no,
    "Бүртгэлийн огноо" AS created_at,
    "Компанийн нэр" AS company,
    "Кемп" AS camp,
    "Багц" AS package,
    "Хүний тоо" AS guest_count,
    public.mask_contact("Утас") AS phone,
    public.mask_contact("И-мэйл") AS email,
    "Эхлэх огноо" AS date_start,
    "Дуусах огноо" AS date_end,
    "Нийт дүн" AS total,
    "Урьдчилгаа 30%" AS deposit30,
    "Хямдрал ₮" AS discount,
    "Эцсийн гэрээний дүн" AS final_amount,
    "Төлөв" AS status,
    "Илгээсэн огноо" AS sent_at,
    "Уулзалтын огноо" AS meeting_date,
    "Гэрээ зурсан огноо" AS contract_signed_date,
    "Байршил" AS location,
    "Орлого урьдчилгаа" AS income_deposit,
    "Орлого үлдэгдэл" AS income_balance,
    "Орлого нэмэлт" AS income_extra,
    "Орлого эвдрэл" AS income_damage,
    "Орлого огноо" AS income_date
   FROM public.nomaad_quotes;


--
-- Name: vat_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vat_receipts (
    id text NOT NULL,
    pos text,
    ddtd text,
    dt timestamp with time zone,
    total numeric,
    vat numeric,
    net numeric,
    buyer_reg text,
    buyer_name text,
    office text,
    matched_type text,
    matched_id text,
    matched_label text,
    matched_by text,
    created_at timestamp with time zone DEFAULT now(),
    returned boolean DEFAULT false NOT NULL,
    returned_at timestamp with time zone
);


--
-- Name: role_presets; Type: TABLE; Schema: sec; Owner: -
--

CREATE TABLE sec.role_presets (
    ord integer NOT NULL,
    pattern text NOT NULL,
    views text[] NOT NULL,
    actions text[] NOT NULL
);


--
-- Name: app_errors id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_errors ALTER COLUMN id SET DEFAULT nextval('public.app_errors_id_seq'::regclass);


--
-- Name: attendance id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance ALTER COLUMN id SET DEFAULT nextval('public.attendance_id_seq'::regclass);


--
-- Name: employees pk; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees ALTER COLUMN pk SET DEFAULT nextval('public.employees_pk_seq'::regclass);


--
-- Name: fb_ad_actions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fb_ad_actions ALTER COLUMN id SET DEFAULT nextval('public.fb_ad_actions_id_seq'::regclass);


--
-- Name: fb_chat_bot_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fb_chat_bot_log ALTER COLUMN id SET DEFAULT nextval('public.fb_chat_bot_log_id_seq'::regclass);


--
-- Name: hourly_ratings pk; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hourly_ratings ALTER COLUMN pk SET DEFAULT nextval('public.hourly_ratings_pk_seq'::regclass);


--
-- Name: nomaad_quote_items pk; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomaad_quote_items ALTER COLUMN pk SET DEFAULT nextval('public.nomaad_quote_items_pk_seq'::regclass);


--
-- Name: product_batches id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_batches ALTER COLUMN id SET DEFAULT nextval('public.product_batches_id_seq'::regclass);


--
-- Name: stock_counts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_counts ALTER COLUMN id SET DEFAULT nextval('public.stock_counts_id_seq'::regclass);


--
-- Name: stock_moves id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_moves ALTER COLUMN id SET DEFAULT nextval('public.stock_moves_id_seq'::regclass);


--
-- Name: _baraa_backup_20260902 _baraa_backup_20260902_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._baraa_backup_20260902
    ADD CONSTRAINT _baraa_backup_20260902_pkey PRIMARY KEY (id);


--
-- Name: ads_posts ads_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ads_posts
    ADD CONSTRAINT ads_posts_pkey PRIMARY KEY (id);


--
-- Name: app_config app_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_config
    ADD CONSTRAINT app_config_pkey PRIMARY KEY (key);


--
-- Name: app_error_state app_error_state_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_error_state
    ADD CONSTRAINT app_error_state_pkey PRIMARY KEY (fp);


--
-- Name: app_errors app_errors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_errors
    ADD CONSTRAINT app_errors_pkey PRIMARY KEY (id);


--
-- Name: app_orders app_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_orders
    ADD CONSTRAINT app_orders_pkey PRIMARY KEY (id);


--
-- Name: att_requests att_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.att_requests
    ADD CONSTRAINT att_requests_pkey PRIMARY KEY (id);


--
-- Name: attendance attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_pkey PRIMARY KEY (id);


--
-- Name: bank_accounts bank_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_accounts
    ADD CONSTRAINT bank_accounts_pkey PRIMARY KEY (id);


--
-- Name: bank_cards bank_cards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_cards
    ADD CONSTRAINT bank_cards_pkey PRIMARY KEY (id);


--
-- Name: bank_income bank_income_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_income
    ADD CONSTRAINT bank_income_pkey PRIMARY KEY (fp);


--
-- Name: bank_receipts bank_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_receipts
    ADD CONSTRAINT bank_receipts_pkey PRIMARY KEY (receipt_id);


--
-- Name: bank_statements bank_statements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_statements
    ADD CONSTRAINT bank_statements_pkey PRIMARY KEY (id);


--
-- Name: bq_customers bq_customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bq_customers
    ADD CONSTRAINT bq_customers_pkey PRIMARY KEY (id);


--
-- Name: bq_documents bq_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bq_documents
    ADD CONSTRAINT bq_documents_pkey PRIMARY KEY (id);


--
-- Name: bq_order_lines bq_order_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bq_order_lines
    ADD CONSTRAINT bq_order_lines_pkey PRIMARY KEY (id);


--
-- Name: bq_orders bq_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bq_orders
    ADD CONSTRAINT bq_orders_pkey PRIMARY KEY (id);


--
-- Name: bq_payments bq_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bq_payments
    ADD CONSTRAINT bq_payments_pkey PRIMARY KEY (id);


--
-- Name: bq_plannings bq_plannings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bq_plannings
    ADD CONSTRAINT bq_plannings_pkey PRIMARY KEY (id);


--
-- Name: bq_products bq_products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bq_products
    ADD CONSTRAINT bq_products_pkey PRIMARY KEY (id);


--
-- Name: brand_kit brand_kit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brand_kit
    ADD CONSTRAINT brand_kit_pkey PRIMARY KEY (id);


--
-- Name: catering_jobs catering_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catering_jobs
    ADD CONSTRAINT catering_jobs_pkey PRIMARY KEY (id);


--
-- Name: catering_menu catering_menu_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catering_menu
    ADD CONSTRAINT catering_menu_pkey PRIMARY KEY (id);


--
-- Name: company_docs company_docs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_docs
    ADD CONSTRAINT company_docs_pkey PRIMARY KEY (id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: email_optout email_optout_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_optout
    ADD CONSTRAINT email_optout_pkey PRIMARY KEY (email);


--
-- Name: employee_aliases employee_aliases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_aliases
    ADD CONSTRAINT employee_aliases_pkey PRIMARY KEY (alias);


--
-- Name: employee_docs employee_docs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_docs
    ADD CONSTRAINT employee_docs_pkey PRIMARY KEY (member_key);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (pk);


--
-- Name: evaluations evaluations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evaluations
    ADD CONSTRAINT evaluations_pkey PRIMARY KEY (id);


--
-- Name: expense_learn expense_learn_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_learn
    ADD CONSTRAINT expense_learn_pkey PRIMARY KEY (key);


--
-- Name: fb_ad_actions fb_ad_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fb_ad_actions
    ADD CONSTRAINT fb_ad_actions_pkey PRIMARY KEY (id);


--
-- Name: fb_ads_daily fb_ads_daily_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fb_ads_daily
    ADD CONSTRAINT fb_ads_daily_pkey PRIMARY KEY (day, ad_id);


--
-- Name: fb_campaign_state fb_campaign_state_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fb_campaign_state
    ADD CONSTRAINT fb_campaign_state_pkey PRIMARY KEY (campaign_id);


--
-- Name: fb_capi_sent fb_capi_sent_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fb_capi_sent
    ADD CONSTRAINT fb_capi_sent_pkey PRIMARY KEY (order_id);


--
-- Name: fb_chat_bot_log fb_chat_bot_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fb_chat_bot_log
    ADD CONSTRAINT fb_chat_bot_log_pkey PRIMARY KEY (id);


--
-- Name: fb_chats fb_chats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fb_chats
    ADD CONSTRAINT fb_chats_pkey PRIMARY KEY (thread_id);


--
-- Name: fb_page_posts fb_page_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fb_page_posts
    ADD CONSTRAINT fb_page_posts_pkey PRIMARY KEY (post_id);


--
-- Name: fin_categories fin_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fin_categories
    ADD CONSTRAINT fin_categories_pkey PRIMARY KEY (code);


--
-- Name: finance finance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance
    ADD CONSTRAINT finance_pkey PRIMARY KEY (id);


--
-- Name: ga_daily ga_daily_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ga_daily
    ADD CONSTRAINT ga_daily_pkey PRIMARY KEY (day, channel);


--
-- Name: gsc_daily gsc_daily_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gsc_daily
    ADD CONSTRAINT gsc_daily_pkey PRIMARY KEY (day, query, page);


--
-- Name: hourly_ratings hourly_ratings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hourly_ratings
    ADD CONSTRAINT hourly_ratings_pkey PRIMARY KEY (pk);


--
-- Name: invoices invoices_no_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_no_key UNIQUE (no);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: member_branches member_branches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_branches
    ADD CONSTRAINT member_branches_pkey PRIMARY KEY (person_key);


--
-- Name: member_perms member_perms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_perms
    ADD CONSTRAINT member_perms_pkey PRIMARY KEY (person_key);


--
-- Name: nomaad_payments nomaad_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomaad_payments
    ADD CONSTRAINT nomaad_payments_pkey PRIMARY KEY (id);


--
-- Name: nomaad_quote_items nomaad_quote_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomaad_quote_items
    ADD CONSTRAINT nomaad_quote_items_pkey PRIMARY KEY (pk);


--
-- Name: nomaad_quotes nomaad_quotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomaad_quotes
    ADD CONSTRAINT nomaad_quotes_pkey PRIMARY KEY ("Үнийн саналын дугаар");


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (order_no);


--
-- Name: pbx_callbacks pbx_callbacks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pbx_callbacks
    ADD CONSTRAINT pbx_callbacks_pkey PRIMARY KEY (peer);


--
-- Name: pbx_calls_hourly pbx_calls_hourly_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pbx_calls_hourly
    ADD CONSTRAINT pbx_calls_hourly_pkey PRIMARY KEY (day, hour);


--
-- Name: pbx_calls pbx_calls_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pbx_calls
    ADD CONSTRAINT pbx_calls_pkey PRIMARY KEY (call_id);


--
-- Name: product_aliases product_aliases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_aliases
    ADD CONSTRAINT product_aliases_pkey PRIMARY KEY (alias);


--
-- Name: product_batches product_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_batches
    ADD CONSTRAINT product_batches_pkey PRIMARY KEY (id);


--
-- Name: product_transfers product_transfers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_transfers
    ADD CONSTRAINT product_transfers_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (sku);


--
-- Name: push_subscriptions push_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_pkey PRIMARY KEY (endpoint);


--
-- Name: quotes quotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_pkey PRIMARY KEY (quote_no);


--
-- Name: receipt_files receipt_files_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipt_files
    ADD CONSTRAINT receipt_files_pkey PRIMARY KEY (receipt_id);


--
-- Name: repairs repairs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.repairs
    ADD CONSTRAINT repairs_pkey PRIMARY KEY (id);


--
-- Name: role_perms role_perms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_perms
    ADD CONSTRAINT role_perms_pkey PRIMARY KEY (role);


--
-- Name: salary_payments salary_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salary_payments
    ADD CONSTRAINT salary_payments_pkey PRIMARY KEY (id);


--
-- Name: staff_salary staff_salary_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_salary
    ADD CONSTRAINT staff_salary_pkey PRIMARY KEY (person_key);


--
-- Name: stock_counts stock_counts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_counts
    ADD CONSTRAINT stock_counts_pkey PRIMARY KEY (id);


--
-- Name: stock_moves stock_moves_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_moves
    ADD CONSTRAINT stock_moves_pkey PRIMARY KEY (id);


--
-- Name: task_audio task_audio_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_audio
    ADD CONSTRAINT task_audio_pkey PRIMARY KEY (task_id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: vat_receipts vat_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vat_receipts
    ADD CONSTRAINT vat_receipts_pkey PRIMARY KEY (id);


--
-- Name: role_presets role_presets_pkey; Type: CONSTRAINT; Schema: sec; Owner: -
--

ALTER TABLE ONLY sec.role_presets
    ADD CONSTRAINT role_presets_pkey PRIMARY KEY (ord);


--
-- Name: ads_posts_sku_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ads_posts_sku_idx ON public.ads_posts USING btree (sku, created_at DESC);


--
-- Name: ads_posts_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ads_posts_status_idx ON public.ads_posts USING btree (status, created_at DESC);


--
-- Name: app_errors_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX app_errors_at_idx ON public.app_errors USING btree (at DESC);


--
-- Name: app_errors_fp_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX app_errors_fp_idx ON public.app_errors USING btree (fp, at DESC);


--
-- Name: app_orders_customer_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX app_orders_customer_idx ON public.app_orders USING btree (customer_id);


--
-- Name: att_requests_member_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX att_requests_member_idx ON public.att_requests USING btree (member_key, day DESC);


--
-- Name: att_requests_pending_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX att_requests_pending_idx ON public.att_requests USING btree (status) WHERE (status = 'pending'::text);


--
-- Name: attendance_day_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX attendance_day_idx ON public.attendance USING btree (day);


--
-- Name: attendance_member_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX attendance_member_idx ON public.attendance USING btree (member_key, day);


--
-- Name: bank_income_dt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bank_income_dt_idx ON public.bank_income USING btree (dt);


--
-- Name: bank_income_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bank_income_status_idx ON public.bank_income USING btree (status);


--
-- Name: bank_receipts_fp_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bank_receipts_fp_idx ON public.bank_receipts USING btree (fp);


--
-- Name: bank_statements_acct_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bank_statements_acct_idx ON public.bank_statements USING btree (acct, period_from);


--
-- Name: bq_documents_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bq_documents_order_idx ON public.bq_documents USING btree (order_id);


--
-- Name: company_docs_cat_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX company_docs_cat_idx ON public.company_docs USING btree (category, created_at DESC);


--
-- Name: customers_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX customers_name_idx ON public.customers USING btree (lower(name));


--
-- Name: customers_phone_uniq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX customers_phone_uniq ON public.customers USING btree (phone) WHERE ((phone IS NOT NULL) AND (merged_into IS NULL));


--
-- Name: employee_aliases_pk_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX employee_aliases_pk_idx ON public.employee_aliases USING btree (pk);


--
-- Name: employees_phone_active_uniq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX employees_phone_active_uniq ON public.employees USING btree (phone) WHERE ((merged_into IS NULL) AND (COALESCE(status, 'идэвхтэй'::text) <> 'гарсан'::text) AND (phone IS NOT NULL) AND (phone <> ''::text));


--
-- Name: INDEX employees_phone_active_uniq; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.employees_phone_active_uniq IS '2026-09-04: нэг утас = нэг идэвхтэй ажилтан. «Гарсан»-г хасна — буцаж ирэхэд ижил дугаараар бүртгүүлэх боломжтой байх ёстой.';


--
-- Name: employees_rd_active_uniq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX employees_rd_active_uniq ON public.employees USING btree (rd) WHERE ((merged_into IS NULL) AND (COALESCE(status, 'идэвхтэй'::text) <> 'гарсан'::text) AND (rd IS NOT NULL) AND (rd <> ''::text));


--
-- Name: INDEX employees_rd_active_uniq; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.employees_rd_active_uniq IS '2026-09-04: нэг РД = нэг идэвхтэй ажилтан. Шинэ утсаар дахин бүртгүүлэхийг хаана. Гарсан ажилтан хамаарахгүй (буцаж ирэх нь зөв).';


--
-- Name: fb_ad_actions_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX fb_ad_actions_at_idx ON public.fb_ad_actions USING btree (at DESC);


--
-- Name: fb_ads_daily_camp_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX fb_ads_daily_camp_idx ON public.fb_ads_daily USING btree (campaign_id, day DESC);


--
-- Name: fb_ads_daily_day_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX fb_ads_daily_day_idx ON public.fb_ads_daily USING btree (day DESC);


--
-- Name: fb_capi_sent_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX fb_capi_sent_at_idx ON public.fb_capi_sent USING btree (sent_at DESC);


--
-- Name: fb_chat_bot_log_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX fb_chat_bot_log_at_idx ON public.fb_chat_bot_log USING btree (at DESC);


--
-- Name: fb_chat_bot_log_thread_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX fb_chat_bot_log_thread_idx ON public.fb_chat_bot_log USING btree (thread_id, at DESC);


--
-- Name: fb_chats_last_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX fb_chats_last_idx ON public.fb_chats USING btree (last_at DESC);


--
-- Name: fb_chats_state_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX fb_chats_state_idx ON public.fb_chats USING btree (state);


--
-- Name: fb_page_posts_boost_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX fb_page_posts_boost_idx ON public.fb_page_posts USING btree (boost) WHERE (boost IS NOT NULL);


--
-- Name: fb_page_posts_time_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX fb_page_posts_time_idx ON public.fb_page_posts USING btree (created_time DESC);


--
-- Name: ga_daily_day_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ga_daily_day_idx ON public.ga_daily USING btree (day DESC);


--
-- Name: gsc_daily_day_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX gsc_daily_day_idx ON public.gsc_daily USING btree (day DESC);


--
-- Name: gsc_daily_q_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX gsc_daily_q_idx ON public.gsc_daily USING btree (query, day DESC);


--
-- Name: idx_bq_customers_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bq_customers_name ON public.bq_customers USING btree (name);


--
-- Name: idx_bq_lines_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bq_lines_item ON public.bq_order_lines USING btree (item_id);


--
-- Name: idx_bq_lines_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bq_lines_order ON public.bq_order_lines USING btree (order_id);


--
-- Name: idx_bq_lines_title; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bq_lines_title ON public.bq_order_lines USING btree (title);


--
-- Name: idx_bq_orders_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bq_orders_created ON public.bq_orders USING btree (created_at);


--
-- Name: idx_bq_orders_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bq_orders_customer ON public.bq_orders USING btree (customer_id);


--
-- Name: idx_bq_orders_starts; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bq_orders_starts ON public.bq_orders USING btree (starts_at);


--
-- Name: idx_bq_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bq_orders_status ON public.bq_orders USING btree (status);


--
-- Name: idx_bq_payments_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bq_payments_order ON public.bq_payments USING btree (order_id);


--
-- Name: idx_bq_payments_succeeded; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bq_payments_succeeded ON public.bq_payments USING btree (succeeded_at);


--
-- Name: idx_bq_payments_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bq_payments_type ON public.bq_payments USING btree (ptype);


--
-- Name: idx_bq_plan_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bq_plan_item ON public.bq_plannings USING btree (item_id);


--
-- Name: idx_bq_plan_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bq_plan_order ON public.bq_plannings USING btree (order_id);


--
-- Name: idx_bq_plan_starts; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bq_plan_starts ON public.bq_plannings USING btree (starts_at);


--
-- Name: idx_bq_products_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bq_products_name ON public.bq_products USING btree (name);


--
-- Name: idx_bq_products_sku; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bq_products_sku ON public.bq_products USING btree (sku);


--
-- Name: idx_emp_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emp_id ON public.employees USING btree (id);


--
-- Name: idx_emp_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emp_phone ON public.employees USING btree (phone);


--
-- Name: idx_emp_request; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emp_request ON public.employees USING btree (request_id);


--
-- Name: idx_emp_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emp_status ON public.employees USING btree (status);


--
-- Name: idx_eval_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_eval_period ON public.evaluations USING btree (period);


--
-- Name: idx_eval_ratee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_eval_ratee ON public.evaluations USING btree (ratee);


--
-- Name: idx_fin_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fin_branch ON public.finance USING btree (dept_branch);


--
-- Name: idx_fin_decision; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fin_decision ON public.finance USING btree (decision);


--
-- Name: idx_fin_requested; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fin_requested ON public.finance USING btree (requested_by);


--
-- Name: idx_fin_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fin_status ON public.finance USING btree (status);


--
-- Name: idx_hr_worker; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hr_worker ON public.hourly_ratings USING btree (worker_phone);


--
-- Name: idx_orders_assigned_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_assigned_to ON public.orders USING btree (assigned_to);


--
-- Name: idx_orders_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_created_at ON public.orders USING btree (created_at DESC);


--
-- Name: idx_orders_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_phone ON public.orders USING btree (phone);


--
-- Name: idx_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_status ON public.orders USING btree (status);


--
-- Name: idx_products_archived; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_archived ON public.products USING btree (archived);


--
-- Name: idx_products_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_category ON public.products USING btree (category);


--
-- Name: idx_products_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_id ON public.products USING btree (id);


--
-- Name: idx_products_purchase_ref; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_purchase_ref ON public.products USING btree (purchase_ref) WHERE (purchase_ref IS NOT NULL);


--
-- Name: idx_quotes_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_created_at ON public.quotes USING btree (created_at DESC);


--
-- Name: idx_quotes_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_status ON public.quotes USING btree (status);


--
-- Name: idx_tasks_assignee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_assignee ON public.tasks USING btree (assignee);


--
-- Name: idx_tasks_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_branch ON public.tasks USING btree (branch);


--
-- Name: idx_tasks_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_created ON public.tasks USING btree (created);


--
-- Name: idx_tasks_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_parent ON public.tasks USING btree (parent_id);


--
-- Name: idx_tasks_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_status ON public.tasks USING btree (status);


--
-- Name: invoices_customer_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX invoices_customer_idx ON public.invoices USING btree (customer_id);


--
-- Name: invoices_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX invoices_order_idx ON public.invoices USING btree (order_id);


--
-- Name: nomaad_quote_items_Үнийн саналын дугаар_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "nomaad_quote_items_Үнийн саналын дугаар_idx" ON public.nomaad_quote_items USING btree ("Үнийн саналын дугаар");


--
-- Name: nomaad_quotes_Төлөв_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "nomaad_quotes_Төлөв_idx" ON public.nomaad_quotes USING btree ("Төлөв");


--
-- Name: pbx_calls_hourly_day_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pbx_calls_hourly_day_idx ON public.pbx_calls_hourly USING btree (day DESC);


--
-- Name: pbx_calls_peer_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pbx_calls_peer_idx ON public.pbx_calls USING btree (peer, started_at DESC);


--
-- Name: pbx_calls_started_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pbx_calls_started_idx ON public.pbx_calls USING btree (started_at DESC);


--
-- Name: product_aliases_sku_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX product_aliases_sku_idx ON public.product_aliases USING btree (sku);


--
-- Name: product_batches_sku_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX product_batches_sku_idx ON public.product_batches USING btree (sku) WHERE (voided = false);


--
-- Name: repairs_fixed_by_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX repairs_fixed_by_idx ON public.repairs USING btree (fixed_by, fixed_at);


--
-- Name: repairs_sku_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX repairs_sku_idx ON public.repairs USING btree (sku);


--
-- Name: repairs_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX repairs_status_idx ON public.repairs USING btree (status);


--
-- Name: salary_payments_ym_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX salary_payments_ym_idx ON public.salary_payments USING btree (ym);


--
-- Name: stock_counts_session_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stock_counts_session_idx ON public.stock_counts USING btree (session_id);


--
-- Name: stock_counts_sku_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stock_counts_sku_idx ON public.stock_counts USING btree (sku);


--
-- Name: stock_moves_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stock_moves_at_idx ON public.stock_moves USING btree (at DESC);


--
-- Name: stock_moves_sku_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stock_moves_sku_idx ON public.stock_moves USING btree (sku, at DESC);


--
-- Name: vat_receipts_returned_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX vat_receipts_returned_idx ON public.vat_receipts USING btree (returned) WHERE returned;


--
-- Name: app_orders app_orders_link_customer_trg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER app_orders_link_customer_trg BEFORE INSERT OR UPDATE OF phone, customer, email ON public.app_orders FOR EACH ROW EXECUTE FUNCTION public.app_orders_link_customer();


--
-- Name: att_requests att_requests_sync_trg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER att_requests_sync_trg BEFORE INSERT OR UPDATE ON public.att_requests FOR EACH ROW EXECUTE FUNCTION public.att_requests_sync();


--
-- Name: employees employees_capture_alias_trg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER employees_capture_alias_trg AFTER UPDATE OF phone, email, name ON public.employees FOR EACH ROW EXECUTE FUNCTION public.employees_capture_alias();


--
-- Name: products products_capture_alias_trg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER products_capture_alias_trg AFTER UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.products_capture_alias();


--
-- Name: employee_aliases employee_aliases_pk_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_aliases
    ADD CONSTRAINT employee_aliases_pk_fkey FOREIGN KEY (pk) REFERENCES public.employees(pk);


--
-- Name: employees employees_merged_into_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_merged_into_fkey FOREIGN KEY (merged_into) REFERENCES public.employees(pk);


--
-- Name: ads_posts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ads_posts ENABLE ROW LEVEL SECURITY;

--
-- Name: ads_posts ads_posts_edit; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ads_posts_edit ON public.ads_posts FOR UPDATE USING (COALESCE(sec.cap('ads'::text), COALESCE(sec.cap('marketing'::text), (sec.is_ceo() OR (sec.lvl() >= 80)))));


--
-- Name: ads_posts ads_posts_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ads_posts_read ON public.ads_posts FOR SELECT USING (COALESCE(sec.cap('ads'::text), COALESCE(sec.cap('marketing'::text), (sec.is_ceo() OR (sec.lvl() >= 80)))));


--
-- Name: ads_posts ads_posts_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ads_posts_write ON public.ads_posts FOR INSERT WITH CHECK (COALESCE(sec.cap('ads'::text), COALESCE(sec.cap('marketing'::text), (sec.is_ceo() OR (sec.lvl() >= 80)))));


--
-- Name: app_config; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

--
-- Name: app_config app_config_ins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY app_config_ins ON public.app_config FOR INSERT TO authenticated WITH CHECK (
CASE key
    WHEN 'coo_share'::text THEN sec.is_ceo()
    WHEN 'personal_settlements'::text THEN sec.fin_full()
    WHEN 'ads_budget'::text THEN sec.is_ceo()
    ELSE true
END);


--
-- Name: app_config app_config_sel; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY app_config_sel ON public.app_config FOR SELECT TO authenticated USING (((key <> ALL (ARRAY['coo_share'::text, 'personal_settlements'::text])) OR sec.fin_full()));


--
-- Name: app_config app_config_upd; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY app_config_upd ON public.app_config FOR UPDATE TO authenticated USING (
CASE key
    WHEN 'coo_share'::text THEN sec.is_ceo()
    WHEN 'personal_settlements'::text THEN sec.fin_full()
    WHEN 'ads_budget'::text THEN sec.is_ceo()
    ELSE true
END) WITH CHECK (
CASE key
    WHEN 'coo_share'::text THEN sec.is_ceo()
    WHEN 'personal_settlements'::text THEN sec.fin_full()
    WHEN 'ads_budget'::text THEN sec.is_ceo()
    ELSE true
END);


--
-- Name: app_orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.app_orders ENABLE ROW LEVEL SECURITY;

--
-- Name: app_orders app_orders_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY app_orders_read ON public.app_orders FOR SELECT USING (true);


--
-- Name: app_orders app_orders_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY app_orders_write ON public.app_orders TO authenticated USING (true) WITH CHECK (true);


--
-- Name: att_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.att_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: att_requests att_requests_ins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY att_requests_ins ON public.att_requests FOR INSERT TO authenticated WITH CHECK ((sec.can('attendance.edit'::text) OR ((member_key = sec.phone()) AND (status = 'pending'::text))));


--
-- Name: att_requests att_requests_sel; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY att_requests_sel ON public.att_requests FOR SELECT TO authenticated USING ((sec.can('attendance.edit'::text) OR (member_key = sec.phone())));


--
-- Name: att_requests att_requests_upd; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY att_requests_upd ON public.att_requests FOR UPDATE TO authenticated USING (sec.can('attendance.edit'::text)) WITH CHECK (sec.can('attendance.edit'::text));


--
-- Name: bank_accounts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: bank_accounts bank_accounts_sel; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bank_accounts_sel ON public.bank_accounts FOR SELECT TO authenticated USING (sec.fin_full());


--
-- Name: bank_accounts bank_accounts_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bank_accounts_write ON public.bank_accounts TO authenticated USING (((((NULLIF(current_setting('request.jwt.claims'::text, true), ''::text))::json ->> 'lvl'::text))::integer >= 100)) WITH CHECK (((((NULLIF(current_setting('request.jwt.claims'::text, true), ''::text))::json ->> 'lvl'::text))::integer >= 100));


--
-- Name: bank_cards; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bank_cards ENABLE ROW LEVEL SECURITY;

--
-- Name: bank_cards bank_cards_sel; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bank_cards_sel ON public.bank_cards FOR SELECT TO authenticated USING (sec.fin_full());


--
-- Name: bank_cards bank_cards_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bank_cards_write ON public.bank_cards TO authenticated USING (((((NULLIF(current_setting('request.jwt.claims'::text, true), ''::text))::json ->> 'lvl'::text))::integer >= 100)) WITH CHECK (((((NULLIF(current_setting('request.jwt.claims'::text, true), ''::text))::json ->> 'lvl'::text))::integer >= 100));


--
-- Name: bank_income; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bank_income ENABLE ROW LEVEL SECURITY;

--
-- Name: bank_income bank_income_rw; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bank_income_rw ON public.bank_income TO authenticated USING (sec.fin_full()) WITH CHECK (sec.fin_full());


--
-- Name: bank_receipts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bank_receipts ENABLE ROW LEVEL SECURITY;

--
-- Name: bank_receipts bank_receipts_rw; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bank_receipts_rw ON public.bank_receipts TO authenticated USING ((sec.fin_full() OR sec.can('orders.pay'::text))) WITH CHECK ((sec.fin_full() OR sec.can('orders.pay'::text)));


--
-- Name: bank_statements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bank_statements ENABLE ROW LEVEL SECURITY;

--
-- Name: bank_statements bank_statements_rw; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bank_statements_rw ON public.bank_statements TO authenticated USING (sec.fin_full()) WITH CHECK (sec.fin_full());


--
-- Name: bq_customers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bq_customers ENABLE ROW LEVEL SECURITY;

--
-- Name: bq_order_lines; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bq_order_lines ENABLE ROW LEVEL SECURITY;

--
-- Name: bq_orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bq_orders ENABLE ROW LEVEL SECURITY;

--
-- Name: bq_payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bq_payments ENABLE ROW LEVEL SECURITY;

--
-- Name: bq_plannings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bq_plannings ENABLE ROW LEVEL SECURITY;

--
-- Name: bq_products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bq_products ENABLE ROW LEVEL SECURITY;

--
-- Name: company_docs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.company_docs ENABLE ROW LEVEL SECURITY;

--
-- Name: company_docs company_docs_del; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY company_docs_del ON public.company_docs FOR DELETE TO authenticated USING (true);


--
-- Name: company_docs company_docs_ins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY company_docs_ins ON public.company_docs FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: company_docs company_docs_sel; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY company_docs_sel ON public.company_docs FOR SELECT TO authenticated USING (true);


--
-- Name: company_docs company_docs_upd; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY company_docs_upd ON public.company_docs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: customers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

--
-- Name: customers customers_rw; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY customers_rw ON public.customers TO authenticated USING (sec.can_customers()) WITH CHECK (sec.can_customers());


--
-- Name: employee_docs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.employee_docs ENABLE ROW LEVEL SECURITY;

--
-- Name: employee_docs employee_docs_ins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY employee_docs_ins ON public.employee_docs FOR INSERT TO authenticated WITH CHECK ((sec.can('access'::text) OR (member_key = sec.phone())));


--
-- Name: employee_docs employee_docs_sel; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY employee_docs_sel ON public.employee_docs FOR SELECT TO authenticated USING ((sec.can('access'::text) OR (member_key = sec.phone())));


--
-- Name: employee_docs employee_docs_upd; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY employee_docs_upd ON public.employee_docs FOR UPDATE TO authenticated USING ((sec.can('access'::text) OR (member_key = sec.phone()))) WITH CHECK ((sec.can('access'::text) OR (member_key = sec.phone())));


--
-- Name: employees; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

--
-- Name: evaluations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

--
-- Name: fin_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fin_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: finance; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.finance ENABLE ROW LEVEL SECURITY;

--
-- Name: hourly_ratings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hourly_ratings ENABLE ROW LEVEL SECURITY;

--
-- Name: invoices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

--
-- Name: invoices invoices_rw; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY invoices_rw ON public.invoices TO authenticated USING ((sec.is_ceo() OR sec.can_act('orders.pay'::text))) WITH CHECK ((sec.is_ceo() OR sec.can_act('orders.pay'::text)));


--
-- Name: member_perms; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.member_perms ENABLE ROW LEVEL SECURITY;

--
-- Name: member_perms member_perms_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY member_perms_read ON public.member_perms FOR SELECT USING (true);


--
-- Name: member_perms member_perms_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY member_perms_write ON public.member_perms TO authenticated USING (((((NULLIF(current_setting('request.jwt.claims'::text, true), ''::text))::json ->> 'lvl'::text))::integer >= 80)) WITH CHECK (((((NULLIF(current_setting('request.jwt.claims'::text, true), ''::text))::json ->> 'lvl'::text))::integer >= 80));


--
-- Name: nomaad_payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.nomaad_payments ENABLE ROW LEVEL SECURITY;

--
-- Name: nomaad_payments nomaad_payments_rw; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nomaad_payments_rw ON public.nomaad_payments TO authenticated USING ((sec.fin_full() OR sec.can('nomaad'::text))) WITH CHECK ((sec.fin_full() OR sec.can('nomaad.income'::text)));


--
-- Name: nomaad_quote_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.nomaad_quote_items ENABLE ROW LEVEL SECURITY;

--
-- Name: nomaad_quotes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.nomaad_quotes ENABLE ROW LEVEL SECURITY;

--
-- Name: orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

--
-- Name: product_transfers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_transfers ENABLE ROW LEVEL SECURITY;

--
-- Name: product_transfers product_transfers_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY product_transfers_read ON public.product_transfers FOR SELECT USING (true);


--
-- Name: product_transfers product_transfers_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY product_transfers_write ON public.product_transfers TO authenticated USING (true) WITH CHECK (true);


--
-- Name: products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

--
-- Name: products products_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY products_read ON public.products FOR SELECT USING (true);


--
-- Name: products products_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY products_write ON public.products TO authenticated USING (true) WITH CHECK (true);


--
-- Name: push_subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: quotes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

--
-- Name: receipt_files; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.receipt_files ENABLE ROW LEVEL SECURITY;

--
-- Name: receipt_files receipt_files_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY receipt_files_read ON public.receipt_files FOR SELECT USING (true);


--
-- Name: receipt_files receipt_files_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY receipt_files_write ON public.receipt_files TO authenticated USING (true) WITH CHECK (true);


--
-- Name: role_perms; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.role_perms ENABLE ROW LEVEL SECURITY;

--
-- Name: role_perms rp_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rp_read ON public.role_perms FOR SELECT USING (true);


--
-- Name: role_perms rp_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rp_write ON public.role_perms TO authenticated USING (((((NULLIF(current_setting('request.jwt.claims'::text, true), ''::text))::json ->> 'lvl'::text))::integer >= 100)) WITH CHECK (((((NULLIF(current_setting('request.jwt.claims'::text, true), ''::text))::json ->> 'lvl'::text))::integer >= 100));


--
-- Name: salary_payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.salary_payments ENABLE ROW LEVEL SECURITY;

--
-- Name: salary_payments salary_payments_ins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY salary_payments_ins ON public.salary_payments FOR INSERT TO authenticated WITH CHECK (sec.can('salary.pay'::text));


--
-- Name: salary_payments salary_payments_sel; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY salary_payments_sel ON public.salary_payments FOR SELECT TO authenticated USING ((sec.can('salary'::text) OR (person_key = sec.phone())));


--
-- Name: salary_payments salary_payments_upd; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY salary_payments_upd ON public.salary_payments FOR UPDATE TO authenticated USING (sec.can('salary.pay'::text)) WITH CHECK (sec.can('salary.pay'::text));


--
-- Name: staff_salary; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.staff_salary ENABLE ROW LEVEL SECURITY;

--
-- Name: staff_salary staff_salary_ins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY staff_salary_ins ON public.staff_salary FOR INSERT TO authenticated WITH CHECK (sec.can('salary.edit'::text));


--
-- Name: staff_salary staff_salary_sel; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY staff_salary_sel ON public.staff_salary FOR SELECT TO authenticated USING ((sec.can('salary'::text) OR (person_key = sec.phone())));


--
-- Name: staff_salary staff_salary_upd; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY staff_salary_upd ON public.staff_salary FOR UPDATE TO authenticated USING (sec.can('salary.edit'::text)) WITH CHECK (sec.can('salary.edit'::text));


--
-- Name: tasks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

--
-- Name: vat_receipts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vat_receipts ENABLE ROW LEVEL SECURITY;

--
-- Name: vat_receipts vat_receipts_rw; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY vat_receipts_rw ON public.vat_receipts TO authenticated USING ((sec.fin_full() OR sec.can('vat'::text))) WITH CHECK ((sec.fin_full() OR sec.can('vat'::text)));


--
-- PostgreSQL database dump complete
--

\unrestrict PfmQ7HTMEYVcNDh6JEbkGOYTbNsVtoltxx3t6bbGWwBJ3qNAuRVrmVPrOoLbH2a

