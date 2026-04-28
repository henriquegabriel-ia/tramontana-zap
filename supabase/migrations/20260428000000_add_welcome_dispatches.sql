-- Tabela para rastrear leads que receberam template boas-vindas via /api/integrations/rd-station/welcome.
-- Permite ao webhook disparar auto-reply fixo na primeira resposta do lead.

CREATE TABLE IF NOT EXISTS welcome_dispatches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  lead_email text,
  lead_name text,
  template_name text NOT NULL,
  message_id text,
  sent_at timestamptz NOT NULL DEFAULT NOW(),
  replied_at timestamptz,
  auto_reply_message_id text,
  auto_reply_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_welcome_dispatches_phone
  ON welcome_dispatches(phone);

CREATE INDEX IF NOT EXISTS idx_welcome_dispatches_phone_pending
  ON welcome_dispatches(phone) WHERE auto_reply_sent_at IS NULL;

COMMENT ON TABLE welcome_dispatches IS 'Rastreia leads que receberam template boas_vindas via /api/integrations/rd-station/welcome. Usado pelo webhook para disparar auto-reply fixo na primeira resposta do lead.';
