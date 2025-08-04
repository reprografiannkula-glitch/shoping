/*
  # Sistema de Administração

  1. Novas Tabelas
    - `admin_users` - Usuários administradores
    - `admin_sessions` - Sessões de admin
    - `product_images` - Múltiplas imagens por produto
    - `admin_logs` - Log de ações administrativas

  2. Segurança
    - RLS habilitado em todas as tabelas
    - Políticas específicas para administradores
    - Log de todas as ações administrativas

  3. Funcionalidades
    - Login especial com credenciais "admin"/"admin"
    - Upload múltiplo de imagens
    - Gerenciamento completo de produtos
    - Dashboard com estatísticas
*/

-- Tabela de usuários administradores
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  full_name text,
  email text,
  is_super_admin boolean DEFAULT false,
  last_login timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de sessões administrativas
CREATE TABLE IF NOT EXISTS admin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES admin_users(id) ON DELETE CASCADE,
  session_token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Tabela para múltiplas imagens por produto
CREATE TABLE IF NOT EXISTS product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  image_name text,
  is_primary boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Tabela de logs administrativos
CREATE TABLE IF NOT EXISTS admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES admin_users(id),
  action text NOT NULL,
  table_name text,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para admin_users (apenas super admins podem gerenciar)
CREATE POLICY "Super admins can manage admin users"
  ON admin_users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_sessions s
      JOIN admin_users a ON s.admin_id = a.id
      WHERE s.session_token = current_setting('request.jwt.claims', true)::json->>'session_token'
      AND a.is_super_admin = true
      AND s.expires_at > now()
    )
  );

-- Políticas para admin_sessions
CREATE POLICY "Admins can manage their own sessions"
  ON admin_sessions
  FOR ALL
  TO authenticated
  USING (
    admin_id IN (
      SELECT a.id FROM admin_users a
      JOIN admin_sessions s ON s.admin_id = a.id
      WHERE s.session_token = current_setting('request.jwt.claims', true)::json->>'session_token'
      AND s.expires_at > now()
    )
  );

-- Políticas para product_images
CREATE POLICY "Anyone can view product images"
  ON product_images
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can manage product images"
  ON product_images
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_sessions s
      JOIN admin_users a ON s.admin_id = a.id
      WHERE s.session_token = current_setting('request.jwt.claims', true)::json->>'session_token'
      AND s.expires_at > now()
    )
  );

-- Políticas para admin_logs
CREATE POLICY "Admins can view logs"
  ON admin_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_sessions s
      JOIN admin_users a ON s.admin_id = a.id
      WHERE s.session_token = current_setting('request.jwt.claims', true)::json->>'session_token'
      AND s.expires_at > now()
    )
  );

-- Atualizar tabela de produtos para suportar múltiplas imagens
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'featured_image_url'
  ) THEN
    ALTER TABLE products ADD COLUMN featured_image_url text;
  END IF;
END $$;

-- Criar usuário admin padrão
INSERT INTO admin_users (username, password_hash, full_name, email, is_super_admin)
VALUES (
  'admin',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- hash de "admin"
  'Administrador Principal',
  'admin@lojaangola.ao',
  true
) ON CONFLICT (username) DO NOTHING;

-- Função para criar log administrativo
CREATE OR REPLACE FUNCTION create_admin_log(
  p_admin_id uuid,
  p_action text,
  p_table_name text DEFAULT NULL,
  p_record_id uuid DEFAULT NULL,
  p_old_data jsonb DEFAULT NULL,
  p_new_data jsonb DEFAULT NULL,
  p_ip_address text DEFAULT NULL
) RETURNS void AS $$
BEGIN
  INSERT INTO admin_logs (admin_id, action, table_name, record_id, old_data, new_data, ip_address)
  VALUES (p_admin_id, p_action, p_table_name, p_record_id, p_old_data, p_new_data, p_ip_address);
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_primary ON product_images(product_id, is_primary);
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at);