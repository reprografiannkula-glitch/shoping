/*
  # Atualizar credenciais do administrador

  1. Atualizar dados do usuário admin
    - Alterar username para email
    - Atualizar informações pessoais
  
  2. Manter estrutura de segurança
    - Sessões e logs funcionando
    - Permissões administrativas
*/

-- Atualizar dados do administrador principal
UPDATE admin_users 
SET 
  username = 'paufergunza@gmail.com',
  email = 'paufergunza@gmail.com',
  full_name = 'Paulo Fergunza',
  updated_at = now()
WHERE username = 'admin';

-- Se não existir, criar o usuário administrador
INSERT INTO admin_users (
  username,
  password_hash,
  full_name,
  email,
  is_super_admin,
  created_at,
  updated_at
) 
SELECT 
  'paufergunza@gmail.com',
  'hashed_password_placeholder',
  'Paulo Fergunza',
  'paufergunza@gmail.com',
  true,
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM admin_users WHERE username = 'paufergunza@gmail.com'
);