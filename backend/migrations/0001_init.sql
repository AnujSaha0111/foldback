-- Foldback schema, version 1. The design lives in docs/spec/data-model.md.
-- Rules this file enforces in the database itself (see backend/docs/principles.md):
--   * only allowed status changes happen (transition tables + triggers)
--   * write-once fields (direction, authorization_id, capture_id) and frozen terms after confirm
--   * money math, id formats, and "sample rows have no PayPal ids"
--   * one in-flight PayPal call per share, one completion per idempotency key
-- Never edit this file after it is applied. Write 0002_*.sql instead.

CREATE EXTENSION IF NOT EXISTS citext;

CREATE FUNCTION touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  id             text PRIMARY KEY,
  kind           text NOT NULL,
  email          citext UNIQUE,
  password_hash  text,
  display_name   text NOT NULL,
  expires_at     timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  last_login_at  timestamptz,
  CONSTRAINT users_id_format CHECK (id ~ '^usr_[A-Za-z0-9_-]{22}$'),
  CONSTRAINT users_kind_valid CHECK (kind IN ('member', 'guest')),
  CONSTRAINT users_email_length CHECK (email IS NULL OR char_length(email::text) <= 254),
  CONSTRAINT users_display_name_length CHECK (char_length(display_name) BETWEEN 1 AND 80),
  CONSTRAINT users_kind_shape CHECK (
    (kind = 'member' AND email IS NOT NULL AND password_hash IS NOT NULL AND expires_at IS NULL)
    OR
    (kind = 'guest' AND email IS NULL AND password_hash IS NULL AND expires_at IS NOT NULL)
  )
);
CREATE INDEX users_guest_expiry ON users (expires_at) WHERE kind = 'guest';

-- ---------------------------------------------------------------------------
-- contracts
-- ---------------------------------------------------------------------------
CREATE TABLE contracts (
  id                      text PRIMARY KEY,
  owner_id                text NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  seed_key                text,
  version                 integer NOT NULL DEFAULT 1,
  title                   text,
  rule_text               text NOT NULL,
  rule_hash               text NOT NULL,
  reference_at            timestamptz NOT NULL,
  status                  text NOT NULL,
  direction               text,
  money_source            text NOT NULL,
  currency                text,
  total_cents             integer,
  share_cents             integer,
  headcount               smallint,
  deadline_at             timestamptz,
  timezone                text,
  grace_person_name       text,
  grace_until             timestamptz,
  demo_now                timestamptz,
  clarify_rounds          smallint NOT NULL DEFAULT 0,
  clarification_question  text,
  resolution_reason       text,
  extraction              jsonb,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  confirmed_at            timestamptz,
  resolved_at             timestamptz,

  CONSTRAINT contracts_owner_seed_key UNIQUE (owner_id, seed_key),
  CONSTRAINT contracts_id_money_source_key UNIQUE (id, money_source),

  CONSTRAINT contracts_id_format CHECK (id ~ '^con_[A-Za-z0-9_-]{22}$'),
  CONSTRAINT contracts_seed_key_valid CHECK (seed_key IN ('cabin-hold', 'print-full')),
  CONSTRAINT contracts_version_positive CHECK (version >= 1),
  CONSTRAINT contracts_title_length CHECK (char_length(title) BETWEEN 1 AND 60),
  CONSTRAINT contracts_rule_text_length CHECK (char_length(rule_text) BETWEEN 1 AND 8000),
  CONSTRAINT contracts_status_valid CHECK (status IN (
    'extracting', 'needs_clarification', 'awaiting_confirmation',
    'active', 'grace', 'capturing', 'kept', 'releasing', 'released', 'blocked')),
  CONSTRAINT contracts_direction_valid CHECK (direction IN ('keep', 'release')),
  CONSTRAINT contracts_money_source_valid CHECK (money_source IN ('sample', 'sandbox')),
  CONSTRAINT contracts_currency_usd CHECK (currency = 'USD'),
  CONSTRAINT contracts_total_positive CHECK (total_cents > 0),
  CONSTRAINT contracts_share_positive CHECK (share_cents > 0),
  CONSTRAINT contracts_headcount_range CHECK (headcount BETWEEN 2 AND 4),
  CONSTRAINT contracts_timezone_format CHECK (timezone ~ '^[A-Za-z_]+(/[A-Za-z0-9_+-]+)+$'),
  CONSTRAINT contracts_grace_name_length CHECK (char_length(grace_person_name) BETWEEN 1 AND 80),
  CONSTRAINT contracts_clarify_rounds_range CHECK (clarify_rounds BETWEEN 0 AND 3),

  -- total = headcount x share, whenever all three are known
  CONSTRAINT contracts_money_math CHECK (
    total_cents IS NULL OR share_cents IS NULL OR headcount IS NULL
    OR total_cents = headcount * share_cents),
  CONSTRAINT contracts_grace_pair CHECK ((grace_person_name IS NULL) = (grace_until IS NULL)),
  CONSTRAINT contracts_grace_after_deadline CHECK (
    grace_until IS NULL OR deadline_at IS NULL OR grace_until > deadline_at),
  -- once past the confirm step every term must be filled in
  CONSTRAINT contracts_confirmed_complete CHECK (
    status IN ('extracting', 'needs_clarification', 'awaiting_confirmation')
    OR (currency IS NOT NULL AND total_cents IS NOT NULL AND share_cents IS NOT NULL
        AND headcount IS NOT NULL AND deadline_at IS NOT NULL AND timezone IS NOT NULL
        AND demo_now IS NOT NULL AND confirmed_at IS NOT NULL AND title IS NOT NULL)),
  -- the decision (direction) matches the status
  CONSTRAINT contracts_keep_direction CHECK (
    status NOT IN ('capturing', 'kept') OR direction IS NOT DISTINCT FROM 'keep'),
  CONSTRAINT contracts_release_direction CHECK (
    status NOT IN ('releasing', 'released') OR direction IS NOT DISTINCT FROM 'release'),
  CONSTRAINT contracts_direction_only_after_decision CHECK (
    direction IS NULL OR status IN ('capturing', 'kept', 'releasing', 'released', 'blocked')),
  CONSTRAINT contracts_resolved_at_matches_status CHECK (
    (status IN ('kept', 'released')) = (resolved_at IS NOT NULL)),
  -- sample contracts exist only as seeds
  CONSTRAINT contracts_sample_is_seed CHECK (money_source = 'sandbox' OR seed_key IS NOT NULL)
);
CREATE INDEX contracts_owner ON contracts (owner_id, created_at);
CREATE INDEX contracts_cache ON contracts (rule_hash, created_at) WHERE extraction IS NOT NULL;

-- ---------------------------------------------------------------------------
-- shares
-- ---------------------------------------------------------------------------
CREATE TABLE shares (
  id                        text PRIMARY KEY,
  contract_id               text NOT NULL,
  money_source              text NOT NULL,
  position                  smallint NOT NULL,
  display_name              text NOT NULL,
  is_grace_subject          boolean NOT NULL DEFAULT false,
  status                    text NOT NULL,
  amount_cents              integer NOT NULL,
  checkout_attempt          smallint NOT NULL DEFAULT 0,
  order_id                  text,
  approve_url               text,
  authorization_id          text,
  authorization_expires_at  timestamptz,
  capture_id                text,
  sample_label              text,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),

  -- a share's money source always equals its contract's: a contract is all sample or all sandbox
  CONSTRAINT shares_contract_fk FOREIGN KEY (contract_id, money_source)
    REFERENCES contracts (id, money_source) ON DELETE CASCADE,
  CONSTRAINT shares_contract_name_key UNIQUE (contract_id, display_name),
  CONSTRAINT shares_contract_position_key UNIQUE (contract_id, position),
  CONSTRAINT shares_order_id_key UNIQUE (order_id),
  CONSTRAINT shares_authorization_id_key UNIQUE (authorization_id),
  CONSTRAINT shares_capture_id_key UNIQUE (capture_id),

  CONSTRAINT shares_id_format CHECK (id ~ '^shr_[A-Za-z0-9_-]{22}$'),
  CONSTRAINT shares_money_source_valid CHECK (money_source IN ('sample', 'sandbox')),
  CONSTRAINT shares_position_range CHECK (position BETWEEN 1 AND 4),
  CONSTRAINT shares_display_name_length CHECK (char_length(display_name) BETWEEN 1 AND 80),
  CONSTRAINT shares_status_valid CHECK (status IN (
    'waiting', 'checkout_open', 'authorize_unknown', 'held', 'capture_unknown',
    'kept', 'capture_failed', 'void_unknown', 'released', 'expired', 'declined')),
  CONSTRAINT shares_amount_positive CHECK (amount_cents > 0),
  CONSTRAINT shares_attempt_range CHECK (checkout_attempt BETWEEN 0 AND 20),
  CONSTRAINT shares_approve_url_host CHECK (
    approve_url IS NULL OR approve_url LIKE 'https://www.sandbox.paypal.com/%'),

  CONSTRAINT shares_sample_label CHECK ((money_source = 'sample') = (sample_label IS NOT NULL)),
  CONSTRAINT shares_sample_has_no_paypal_ids CHECK (
    money_source = 'sandbox'
    OR (order_id IS NULL AND approve_url IS NULL AND authorization_id IS NULL AND capture_id IS NULL)),
  CONSTRAINT shares_hold_has_authorization CHECK (
    money_source = 'sample'
    OR status NOT IN ('held', 'capture_unknown', 'capture_failed', 'void_unknown', 'released')
    OR authorization_id IS NOT NULL),
  CONSTRAINT shares_kept_has_capture CHECK (
    money_source = 'sample' OR status <> 'kept' OR capture_id IS NOT NULL),
  CONSTRAINT shares_authorize_unknown_has_order CHECK (
    money_source = 'sample' OR status <> 'authorize_unknown' OR order_id IS NOT NULL)
);
CREATE UNIQUE INDEX shares_one_grace_subject ON shares (contract_id) WHERE is_grace_subject;

-- ---------------------------------------------------------------------------
-- paypal_operations: audit log and unknown-outcome record
-- ---------------------------------------------------------------------------
CREATE TABLE paypal_operations (
  id                text PRIMARY KEY,
  share_id          text NOT NULL REFERENCES shares (id) ON DELETE CASCADE,
  kind              text NOT NULL,
  idempotency_key   text,
  request           jsonb NOT NULL,
  response_status   smallint,
  response          jsonb,
  paypal_debug_id   text,
  outcome           text NOT NULL,
  resolved_by_sync  boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ops_id_format CHECK (id ~ '^op_[A-Za-z0-9_-]{22}$'),
  CONSTRAINT ops_kind_valid CHECK (kind IN (
    'create_order', 'authorize', 'capture', 'void', 'get_order', 'get_authorization')),
  CONSTRAINT ops_outcome_valid CHECK (outcome IN ('pending', 'completed', 'failed', 'unknown')),
  CONSTRAINT ops_key_only_on_writes CHECK (
    (kind IN ('get_order', 'get_authorization')) = (idempotency_key IS NULL))
);
-- At most one in-flight mutating PayPal call per share, enforced when the row is inserted.
CREATE UNIQUE INDEX ops_one_inflight_per_share ON paypal_operations (share_id)
  WHERE outcome IN ('pending', 'unknown') AND kind IN ('create_order', 'authorize', 'capture', 'void');
-- A given idempotency key completes at most once.
CREATE UNIQUE INDEX ops_one_completion_per_key ON paypal_operations (kind, idempotency_key)
  WHERE outcome = 'completed' AND idempotency_key IS NOT NULL;
CREATE INDEX ops_share ON paypal_operations (share_id, created_at);

-- ---------------------------------------------------------------------------
-- events: append-only log
-- ---------------------------------------------------------------------------
CREATE TABLE events (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  contract_id  text NOT NULL REFERENCES contracts (id) ON DELETE CASCADE,
  share_id     text REFERENCES shares (id) ON DELETE CASCADE,
  type         text NOT NULL,
  detail       text NOT NULL,
  occurred_at  timestamptz NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT events_type_valid CHECK (type IN (
    'rule_extracted', 'clarification_requested', 'clarification_answered', 'rule_confirmed',
    'order_created', 'checkout_declined', 'hold_placed', 'hold_unknown', 'grace_started',
    'share_expired', 'capture_completed', 'capture_unknown', 'capture_refused',
    'hold_released', 'release_unknown', 'contract_kept', 'contract_released',
    'contract_blocked', 'contract_unblocked', 'clock_moved', 'agent_proposal_approved')),
  CONSTRAINT events_detail_length CHECK (char_length(detail) <= 500)
);
CREATE INDEX events_contract ON events (contract_id, id DESC);

-- ---------------------------------------------------------------------------
-- ai_usage: one row per LLM attempt; backs the daily call cap. Never cleared by reset.
-- ---------------------------------------------------------------------------
CREATE TABLE ai_usage (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  day            date NOT NULL,
  route          text NOT NULL,
  provider       text NOT NULL,
  model          text NOT NULL,
  user_id        text REFERENCES users (id) ON DELETE SET NULL,
  contract_id    text,
  ip_hash        text NOT NULL,
  input_tokens   integer NOT NULL,
  output_tokens  integer NOT NULL,
  succeeded      boolean NOT NULL,
  cached         boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_usage_route_valid CHECK (route IN ('extract', 'agent')),
  CONSTRAINT ai_usage_provider_valid CHECK (provider IN ('gemini', 'groq', 'openrouter')),
  CONSTRAINT ai_usage_input_tokens_nonneg CHECK (input_tokens >= 0),
  CONSTRAINT ai_usage_output_tokens_nonneg CHECK (output_tokens >= 0),
  -- the database half of the free-only rule: an OpenRouter row must be a free model
  CONSTRAINT ai_usage_free_only CHECK (
    provider IN ('gemini', 'groq') OR model = 'openrouter/free' OR model LIKE '%:free')
);
CREATE INDEX ai_usage_day ON ai_usage (day);
CREATE INDEX ai_usage_user_day ON ai_usage (user_id, day);

-- ---------------------------------------------------------------------------
-- Allowed status transitions (data, so the rule is visible and testable)
-- ---------------------------------------------------------------------------
CREATE TABLE contract_transitions (
  from_status text NOT NULL,
  to_status   text NOT NULL,
  PRIMARY KEY (from_status, to_status)
);
INSERT INTO contract_transitions (from_status, to_status) VALUES
  ('extracting', 'needs_clarification'),
  ('extracting', 'awaiting_confirmation'),
  ('needs_clarification', 'extracting'),
  ('awaiting_confirmation', 'active'),
  ('active', 'grace'), ('active', 'capturing'), ('active', 'releasing'), ('active', 'blocked'),
  ('grace', 'capturing'), ('grace', 'releasing'), ('grace', 'blocked'),
  ('capturing', 'kept'), ('capturing', 'blocked'),
  ('releasing', 'released'), ('releasing', 'blocked'),
  ('blocked', 'active'), ('blocked', 'grace'), ('blocked', 'capturing'), ('blocked', 'releasing');

CREATE TABLE share_transitions (
  from_status text NOT NULL,
  to_status   text NOT NULL,
  PRIMARY KEY (from_status, to_status)
);
INSERT INTO share_transitions (from_status, to_status) VALUES
  ('waiting', 'checkout_open'), ('waiting', 'expired'),
  ('checkout_open', 'waiting'), ('checkout_open', 'authorize_unknown'), ('checkout_open', 'held'),
  ('checkout_open', 'declined'), ('checkout_open', 'expired'),
  ('authorize_unknown', 'held'), ('authorize_unknown', 'checkout_open'), ('authorize_unknown', 'declined'),
  ('declined', 'checkout_open'), ('declined', 'expired'),
  ('held', 'capture_unknown'), ('held', 'kept'), ('held', 'capture_failed'),
  ('held', 'void_unknown'), ('held', 'released'),
  ('capture_unknown', 'kept'), ('capture_unknown', 'held'),
  ('void_unknown', 'released'), ('void_unknown', 'held');

-- ---------------------------------------------------------------------------
-- Guard triggers. They raise SQLSTATE 23514 (check violation) with a named constraint.
-- ---------------------------------------------------------------------------
CREATE FUNCTION contracts_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NOT EXISTS (
    SELECT 1 FROM contract_transitions t WHERE t.from_status = OLD.status AND t.to_status = NEW.status
  ) THEN
    RAISE EXCEPTION 'illegal contract transition % -> %', OLD.status, NEW.status
      USING ERRCODE = '23514', CONSTRAINT = 'contracts_transition';
  END IF;

  IF OLD.direction IS NOT NULL AND NEW.direction IS DISTINCT FROM OLD.direction THEN
    RAISE EXCEPTION 'direction is write-once (% -> %)', OLD.direction, NEW.direction
      USING ERRCODE = '23514', CONSTRAINT = 'contracts_direction_write_once';
  END IF;

  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id
     OR NEW.money_source IS DISTINCT FROM OLD.money_source
     OR NEW.seed_key IS DISTINCT FROM OLD.seed_key THEN
    RAISE EXCEPTION 'owner, money source, and seed key never change'
      USING ERRCODE = '23514', CONSTRAINT = 'contracts_identity_immutable';
  END IF;

  IF OLD.confirmed_at IS NOT NULL AND (
       NEW.confirmed_at IS DISTINCT FROM OLD.confirmed_at
    OR NEW.title IS DISTINCT FROM OLD.title
    OR NEW.rule_text IS DISTINCT FROM OLD.rule_text
    OR NEW.reference_at IS DISTINCT FROM OLD.reference_at
    OR NEW.currency IS DISTINCT FROM OLD.currency
    OR NEW.total_cents IS DISTINCT FROM OLD.total_cents
    OR NEW.share_cents IS DISTINCT FROM OLD.share_cents
    OR NEW.headcount IS DISTINCT FROM OLD.headcount
    OR NEW.deadline_at IS DISTINCT FROM OLD.deadline_at
    OR NEW.timezone IS DISTINCT FROM OLD.timezone
    OR NEW.grace_person_name IS DISTINCT FROM OLD.grace_person_name
    OR NEW.grace_until IS DISTINCT FROM OLD.grace_until
  ) THEN
    RAISE EXCEPTION 'confirmed terms are frozen'
      USING ERRCODE = '23514', CONSTRAINT = 'contracts_confirmed_terms_immutable';
  END IF;

  NEW.version := OLD.version + 1;
  RETURN NEW;
END $$;

CREATE FUNCTION shares_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NOT EXISTS (
    SELECT 1 FROM share_transitions t WHERE t.from_status = OLD.status AND t.to_status = NEW.status
  ) THEN
    RAISE EXCEPTION 'illegal share transition % -> %', OLD.status, NEW.status
      USING ERRCODE = '23514', CONSTRAINT = 'shares_transition';
  END IF;

  IF NEW.contract_id IS DISTINCT FROM OLD.contract_id
     OR NEW.money_source IS DISTINCT FROM OLD.money_source
     OR NEW.display_name IS DISTINCT FROM OLD.display_name
     OR NEW.amount_cents IS DISTINCT FROM OLD.amount_cents
     OR NEW.is_grace_subject IS DISTINCT FROM OLD.is_grace_subject
     OR NEW.position IS DISTINCT FROM OLD.position THEN
    RAISE EXCEPTION 'contract, money source, name, amount, grace flag, and position never change'
      USING ERRCODE = '23514', CONSTRAINT = 'shares_identity_immutable';
  END IF;

  IF OLD.authorization_id IS NOT NULL AND NEW.authorization_id IS DISTINCT FROM OLD.authorization_id THEN
    RAISE EXCEPTION 'authorization_id is write-once'
      USING ERRCODE = '23514', CONSTRAINT = 'shares_authorization_write_once';
  END IF;

  IF OLD.capture_id IS NOT NULL AND NEW.capture_id IS DISTINCT FROM OLD.capture_id THEN
    RAISE EXCEPTION 'capture_id is write-once'
      USING ERRCODE = '23514', CONSTRAINT = 'shares_capture_write_once';
  END IF;

  IF NEW.checkout_attempt < OLD.checkout_attempt THEN
    RAISE EXCEPTION 'checkout_attempt only increases'
      USING ERRCODE = '23514', CONSTRAINT = 'shares_attempt_monotonic';
  END IF;

  RETURN NEW;
END $$;

CREATE FUNCTION shares_amount_matches() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  expected integer;
BEGIN
  SELECT share_cents INTO expected FROM contracts WHERE id = NEW.contract_id;
  IF expected IS NULL OR NEW.amount_cents <> expected THEN
    RAISE EXCEPTION 'share amount % must equal the contract share %', NEW.amount_cents, expected
      USING ERRCODE = '23514', CONSTRAINT = 'shares_amount_matches_contract';
  END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION events_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'events are append-only'
    USING ERRCODE = '23514', CONSTRAINT = 'events_append_only';
END $$;

CREATE TRIGGER users_touch BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER contracts_touch BEFORE UPDATE ON contracts
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER shares_touch BEFORE UPDATE ON shares
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER paypal_operations_touch BEFORE UPDATE ON paypal_operations
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER contracts_guard_trg BEFORE UPDATE ON contracts
  FOR EACH ROW EXECUTE FUNCTION contracts_guard();
CREATE TRIGGER shares_guard_trg BEFORE UPDATE ON shares
  FOR EACH ROW EXECUTE FUNCTION shares_guard();
CREATE TRIGGER shares_amount_matches_trg BEFORE INSERT ON shares
  FOR EACH ROW EXECUTE FUNCTION shares_amount_matches();
CREATE TRIGGER events_append_only_trg BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION events_append_only();
