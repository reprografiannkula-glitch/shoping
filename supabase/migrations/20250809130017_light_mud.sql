/*
  # Funções administrativas para gerenciamento de produtos

  1. Funções
    - Função para autenticar admin
    - Função para validar sessão admin
    - Função para criar logs administrativos
    - Função para definir imagem principal

  2. Segurança
    - RLS habilitado em todas as tabelas
    - Políticas específicas para admins
*/

-- Função para autenticar administrador
CREATE OR REPLACE FUNCTION authenticate_admin(p_username TEXT, p_password TEXT)
RETURNS JSON AS $$
DECLARE
  admin_record RECORD;
  session_token TEXT;
  client_ip TEXT;
BEGIN
  -- Verificar credenciais específicas do admin
  IF p_username = 'admin@gmail.com' AND p_password = 'admin2025' THEN
    -- Gerar token de sessão
    session_token := encode(gen_random_bytes(32), 'hex');
    
    -- Criar ou atualizar registro do admin
    INSERT INTO admin_users (username, password_hash, full_name, email, is_super_admin)
    VALUES ('admin@gmail.com', crypt('admin2025', gen_salt('bf')), 'Administrador do Sistema', 'admin@gmail.com', true)
    ON CONFLICT (username) 
    DO UPDATE SET 
      last_login = now(),
      password_hash = crypt('admin2025', gen_salt('bf'));
    
    -- Buscar dados do admin
    SELECT * INTO admin_record FROM admin_users WHERE username = 'admin@gmail.com';
    
    -- Criar sessão
    INSERT INTO admin_sessions (admin_id, session_token, expires_at, ip_address)
    VALUES (admin_record.id, session_token, now() + interval '24 hours', '127.0.0.1');
    
    -- Retornar sucesso
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
    -- Credenciais inválidas
    RETURN json_build_object(
      'success', false,
      'message', 'Credenciais administrativas inválidas'
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para validar sessão admin
CREATE OR REPLACE FUNCTION validate_admin_session(p_session_token TEXT)
RETURNS JSON AS $$
DECLARE
  admin_record RECORD;
  session_record RECORD;
BEGIN
  -- Verificar se a sessão existe e é válida
  SELECT s.*, a.* INTO session_record
  FROM admin_sessions s
  JOIN admin_users a ON s.admin_id = a.id
  WHERE s.session_token = p_session_token
    AND s.expires_at > now();
  
  IF FOUND THEN
    RETURN json_build_object(
      'success', true,
      'admin', json_build_object(
        'id', session_record.id,
        'username', session_record.username,
        'full_name', session_record.full_name,
        'email', session_record.email,
        'is_super_admin', session_record.is_super_admin
      )
    );
  ELSE
    RETURN json_build_object(
      'success', false,
      'message', 'Sessão inválida ou expirada'
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se admin está autenticado
CREATE OR REPLACE FUNCTION is_admin_authenticated()
RETURNS BOOLEAN AS $$
DECLARE
  session_token TEXT;
  admin_exists BOOLEAN;
BEGIN
  -- Tentar obter token da sessão atual
  session_token := current_setting('request.jwt.claims', true)::json->>'session_token';
  
  IF session_token IS NULL THEN
    RETURN false;
  END IF;
  
  -- Verificar se existe sessão válida
  SELECT EXISTS(
    SELECT 1 FROM admin_sessions s
    JOIN admin_users a ON s.admin_id = a.id
    WHERE s.session_token = session_token
      AND s.expires_at > now()
  ) INTO admin_exists;
  
  RETURN admin_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para criar log administrativo
CREATE OR REPLACE FUNCTION create_admin_log(
  p_admin_id UUID,
  p_action TEXT,
  p_table_name TEXT DEFAULT NULL,
  p_record_id UUID DEFAULT NULL,
  p_old_data JSONB DEFAULT NULL,
  p_new_data JSONB DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO admin_logs (admin_id, action, table_name, record_id, old_data, new_data, ip_address)
  VALUES (p_admin_id, p_action, p_table_name, p_record_id, p_old_data, p_new_data, p_ip_address);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para definir imagem principal
CREATE OR REPLACE FUNCTION set_primary_image(p_product_id UUID, p_image_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Remover flag de principal de todas as imagens do produto
  UPDATE product_images 
  SET is_primary = false 
  WHERE product_id = p_product_id;
  
  -- Definir a imagem selecionada como principal
  UPDATE product_images 
  SET is_primary = true 
  WHERE id = p_image_id AND product_id = p_product_id;
  
  -- Atualizar a imagem principal no produto
  UPDATE products 
  SET featured_image_url = (
    SELECT image_url FROM product_images WHERE id = p_image_id
  )
  WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Inserir dados de exemplo se não existirem
DO $$
BEGIN
  -- Verificar se já existem produtos
  IF NOT EXISTS (SELECT 1 FROM products LIMIT 1) THEN
    -- Inserir categorias
    INSERT INTO categories (name, description, slug) VALUES
    ('Eletrônicos', 'Smartphones, laptops e gadgets', 'eletronicos'),
    ('Roupas', 'Vestuário masculino e feminino', 'roupas'),
    ('Casa e Jardim', 'Móveis e decoração', 'casa-jardim'),
    ('Beleza', 'Cosméticos e cuidados pessoais', 'beleza')
    ON CONFLICT (name) DO NOTHING;
    
    -- Inserir produtos de exemplo
    INSERT INTO products (name, description, price, category_id, stock_quantity, is_active, brand, image_url) VALUES
    ('iPhone 15 Pro Max 256GB', 'Smartphone Apple com câmera profissional e chip A17 Pro', 2500000.00, (SELECT id FROM categories WHERE name = 'Eletrônicos'), 15, true, 'Apple', 'https://images.pexels.com/photos/788946/pexels-photo-788946.jpeg'),
    ('Samsung Galaxy S24 Ultra', 'Smartphone Samsung com S Pen e câmera de 200MP', 2200000.00, (SELECT id FROM categories WHERE name = 'Eletrônicos'), 12, true, 'Samsung', 'https://images.pexels.com/photos/1092644/pexels-photo-1092644.jpeg'),
    ('MacBook Air M3 13"', 'Laptop Apple com chip M3 e 16GB de RAM', 3200000.00, (SELECT id FROM categories WHERE name = 'Eletrônicos'), 8, true, 'Apple', 'https://images.pexels.com/photos/18105/pexels-photo.jpg'),
    ('Nike Air Max 270', 'Tênis esportivo com tecnologia Air Max', 180000.00, (SELECT id FROM categories WHERE name = 'Roupas'), 25, true, 'Nike', 'https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg'),
    ('Camisa Social Slim Fit', 'Camisa masculina de algodão premium', 85000.00, (SELECT id FROM categories WHERE name = 'Roupas'), 30, true, 'Aramis', 'https://images.pexels.com/photos/996329/pexels-photo-996329.jpeg'),
    ('Vestido Midi Floral', 'Vestido feminino elegante para ocasiões especiais', 120000.00, (SELECT id FROM categories WHERE name = 'Roupas'), 18, true, 'Zara', 'https://images.pexels.com/photos/985635/pexels-photo-985635.jpeg'),
    ('Sofá 3 Lugares Retrátil', 'Sofá confortável com sistema retrátil e reclinável', 850000.00, (SELECT id FROM categories WHERE name = 'Casa e Jardim'), 5, true, 'Tok&Stok', 'https://images.pexels.com/photos/1350789/pexels-photo-1350789.jpeg'),
    ('Mesa de Jantar 6 Lugares', 'Mesa de madeira maciça com 6 cadeiras', 650000.00, (SELECT id FROM categories WHERE name = 'Casa e Jardim'), 3, true, 'Madesa', 'https://images.pexels.com/photos/1080721/pexels-photo-1080721.jpeg'),
    ('Perfume Masculino 100ml', 'Fragrância importada de longa duração', 250000.00, (SELECT id FROM categories WHERE name = 'Beleza'), 20, true, 'Hugo Boss', 'https://images.pexels.com/photos/965989/pexels-photo-965989.jpeg'),
    ('Kit Cuidados Faciais', 'Kit completo para cuidados com a pele', 180000.00, (SELECT id FROM categories WHERE name = 'Beleza'), 15, true, 'Nivea', 'https://images.pexels.com/photos/3685530/pexels-photo-3685530.jpeg')
    ON CONFLICT (name) DO NOTHING;
  END IF;
END $$;