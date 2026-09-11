-- Setup do keepalive do Supabase — rodar UMA VEZ no SQL Editor do painel.
--
-- Por que existe: o plano free pausa o projeto apos ~7 dias sem atividade, e
-- quando pausa o subdominio sai do DNS e o login quebra para todos os usuarios,
-- so voltando com Restore manual.
--
-- A versao anterior do keepalive fazia um SELECT com a chave anon na tabela
-- `dietas`. O RLS de la e `auth.uid() = user_id`, e o anon nao tem uid, entao o
-- Postgres filtrava tudo e o PostgREST respondia 200 com `[]`. Ficou verde 20
-- dias seguidos e o projeto pausou assim mesmo (run #24, 11/09/2026).
--
-- Esta tabela existe para o ping ESCREVER em vez de so ler. Ela nao guarda nada
-- do aplicativo: e uma linha unica com um timestamp, escrita pelo GitHub
-- Actions uma vez por dia.

CREATE TABLE IF NOT EXISTS keepalive (
  id          INT PRIMARY KEY,
  ultimo_ping TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  origem      TEXT
);

-- A linha id=1 e a unica que o workflow atualiza. Sem ela o UPDATE nao casa
-- nenhuma linha e o PostgREST devolve 200 com `[]` — verde sem ter escrito
-- nada, exatamente o problema que estamos corrigindo. O workflow trata esse
-- `[]` como falha justamente por isso.
INSERT INTO keepalive (id, origem)
VALUES (1, 'setup')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE keepalive ENABLE ROW LEVEL SECURITY;

-- O anon precisa poder ler e atualizar ESTA tabela. O dado exposto e um
-- timestamp sem valor nenhum; o pior abuso possivel e alguem atualizar a hora
-- do ping. Nenhuma outra tabela e afetada — profiles, dietas e alimentos_custom
-- seguem com o RLS por usuario intacto.
DROP POLICY IF EXISTS "anon le o keepalive" ON keepalive;
CREATE POLICY "anon le o keepalive"
  ON keepalive FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "anon atualiza o keepalive" ON keepalive;
CREATE POLICY "anon atualiza o keepalive"
  ON keepalive FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Conferencia: deve devolver exatamente uma linha, com id = 1.
SELECT * FROM keepalive;
