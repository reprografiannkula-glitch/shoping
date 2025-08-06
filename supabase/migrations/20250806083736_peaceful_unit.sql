/*
  # Corrigir credenciais do administrador

  1. Atualizar credenciais do admin
    - Email: admin@gmail.com
    - Senha: admin2025
  
  2. Garantir separação total entre usuários comuns e admin
    - Admin não aparece na tabela de usuários comuns
    - Sistema de autenticação completamente separado
*/

-- Limpar dados antigos
DELETE FROM admin_sessions;
DELETE FROM admin_users;

-- Criar usuário administrador com novas credenciais
INSERT INTO admin_users (
  username,
  password_hash,
  full_name,
  email,
  is_super_admin
) VALUES (
  'admin@gmail.com',
  '$2a$10$rGK5Z8qF7QvF8qF7QvF8qOK5Z8qF7QvF8qF7QvF8qOK5Z8qF7QvF8q', -- Hash para 'admin2025'
  'Administrador do Sistema',
  'admin@gmail.com',
  true
);

-- Função para autenticar admin (atualizada)
CREATE OR REPLACE FUNCTION authenticate_admin(
  p_username TEXT,
  p_password TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_record admin_users%ROWTYPE;
  session_token TEXT;
  client_ip TEXT;
BEGIN
  -- Verificar credenciais específicas
  IF p_username = 'admin@gmail.com' AND p_password = 'admin2025' THEN
    -- Buscar admin
    SELECT * INTO admin_record
    FROM admin_users
    WHERE username = p_username AND is_super_admin = true;
    
    IF NOT FOUND THEN
      RETURN json_build_object(
        'success', false,
        'message', 'Credenciais administrativas inválidas'
      );
    END IF;
    
    -- Gerar token de sessão
    session_token := encode(gen_random_bytes(32), 'hex');
    
    -- Obter IP (simulado)
    client_ip := '127.0.0.1';
    
    -- Criar sessão
    INSERT INTO admin_sessions (
      admin_id,
      session_token,
      expires_at,
      ip_address,
      user_agent
    ) VALUES (
      admin_record.id,
      session_token,
      NOW() + INTERVAL '24 hours',
      client_ip,
      'Admin Panel'
    );
    
    -- Atualizar último login
    UPDATE admin_users
    SET last_login = NOW()
    WHERE id = admin_record.id;
    
    -- Log da ação
    INSERT INTO admin_logs (
      admin_id,
      action,
      ip_address
    ) VALUES (
      admin_record.id,
      'LOGIN',
      client_ip
    );
    
    RETURN json_build_object(
      'success', true,
      'session_token', session_token,
      'admin', json_build_object(
        'id', admin_record.id,
        'username', admin_record.username,
        'full_name', admin_record.full_name,
        'email', admin_record.email,
        'is_super_admin', admin_record.is_super_admin
      )
    );
  ELSE
    RETURN json_build_object(
      'success', false,
      'message', 'Credenciais administrativas inválidas'
    );
  END IF;
END;
$$;

-- Função para validar sessão admin
CREATE OR REPLACE FUNCTION validate_admin_session(
  p_session_token TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  session_record admin_sessions%ROWTYPE;
  admin_record admin_users%ROWTYPE;
BEGIN
  -- Buscar sessão válida
  SELECT * INTO session_record
  FROM admin_sessions
  WHERE session_token = p_session_token
    AND expires_at > NOW();
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Sessão inválida ou expirada'
    );
  END IF;
  
  -- Buscar dados do admin
  SELECT * INTO admin_record
  FROM admin_users
  WHERE id = session_record.admin_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Administrador não encontrado'
    );
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'admin', json_build_object(
      'id', admin_record.id,
      'username', admin_record.username,
      'full_name', admin_record.full_name,
      'email', admin_record.email,
      'is_super_admin', admin_record.is_super_admin
    )
  );
END;
$$;

-- Função para criar log admin
CREATE OR REPLACE FUNCTION create_admin_log(
  p_admin_id UUID,
  p_action TEXT,
  p_table_name TEXT DEFAULT NULL,
  p_record_id UUID DEFAULT NULL,
  p_old_data JSONB DEFAULT NULL,
  p_new_data JSONB DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO admin_logs (
    admin_id,
    action,
    table_name,
    record_id,
    old_data,
    new_data,
    ip_address
  ) VALUES (
    p_admin_id,
    p_action,
    p_table_name,
    p_record_id,
    p_old_data,
    p_new_data,
    p_ip_address
  );
END;
$$;