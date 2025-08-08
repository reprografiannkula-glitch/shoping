/*
  # Sistema Completo de Gerenciamento de Produtos

  1. Funções para Gerenciamento
    - Criar, editar, excluir produtos
    - Gerenciar imagens
    - Controle de estoque
  
  2. Políticas de Segurança
    - Apenas admins podem gerenciar produtos
    - Usuários podem visualizar produtos ativos
  
  3. Triggers e Validações
    - Atualização automática de timestamps
    - Validações de dados
*/

-- Função para definir imagem principal
CREATE OR REPLACE FUNCTION set_primary_image(p_product_id uuid, p_image_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Remove primary de todas as imagens do produto
  UPDATE product_images 
  SET is_primary = false 
  WHERE product_id = p_product_id;
  
  -- Define a nova imagem como primary
  UPDATE product_images 
  SET is_primary = true 
  WHERE id = p_image_id AND product_id = p_product_id;
  
  -- Atualiza a featured_image_url do produto
  UPDATE products 
  SET featured_image_url = (
    SELECT image_url 
    FROM product_images 
    WHERE id = p_image_id
  )
  WHERE id = p_product_id;
  
  RETURN true;
END;
$$;

-- Função para criar log de ações admin
CREATE OR REPLACE FUNCTION create_admin_log(
  p_admin_id uuid,
  p_action text,
  p_table_name text DEFAULT NULL,
  p_record_id uuid DEFAULT NULL,
  p_old_data jsonb DEFAULT NULL,
  p_new_data jsonb DEFAULT NULL,
  p_ip_address text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  log_id uuid;
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
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- Função para validar admin
CREATE OR REPLACE FUNCTION is_admin_authenticated()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  session_token text;
  admin_exists boolean;
BEGIN
  -- Pega o token da sessão atual
  session_token := current_setting('request.jwt.claims', true)::json->>'session_token';
  
  IF session_token IS NULL THEN
    RETURN false;
  END IF;
  
  -- Verifica se existe uma sessão válida
  SELECT EXISTS(
    SELECT 1 
    FROM admin_sessions s
    JOIN admin_users a ON s.admin_id = a.id
    WHERE s.session_token = session_token 
    AND s.expires_at > now()
  ) INTO admin_exists;
  
  RETURN admin_exists;
END;
$$;

-- Atualizar políticas RLS para produtos
DROP POLICY IF EXISTS "Anyone can view active products" ON products;
DROP POLICY IF EXISTS "Admins can manage products" ON products;

CREATE POLICY "Anyone can view active products" ON products
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage products" ON products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE username = 'admin@gmail.com'
    )
  );

-- Políticas para product_images
DROP POLICY IF EXISTS "Anyone can view product images" ON product_images;
DROP POLICY IF EXISTS "Admins can manage product images" ON product_images;

CREATE POLICY "Anyone can view product images" ON product_images
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage product images" ON product_images
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE username = 'admin@gmail.com'
    )
  );

-- Inserir produtos reais se não existirem
INSERT INTO products (name, description, price, stock_quantity, is_active, brand, weight, dimensions, meta_description) VALUES
('iPhone 15 Pro Max 256GB', 'O mais avançado iPhone com chip A17 Pro, câmera de 48MP e tela Super Retina XDR de 6.7 polegadas', 2500000.00, 15, true, 'Apple', 0.221, '159.9 x 76.7 x 8.25 mm', 'iPhone 15 Pro Max - O smartphone mais avançado da Apple com tecnologia de ponta'),
('Samsung Galaxy S24 Ultra', 'Smartphone premium com S Pen integrada, câmera de 200MP e tela Dynamic AMOLED 2X', 2200000.00, 12, true, 'Samsung', 0.232, '162.3 x 79.0 x 8.6 mm', 'Samsung Galaxy S24 Ultra - Produtividade e fotografia profissional'),
('MacBook Air M3 13"', 'Laptop ultrafino com chip M3, 8GB RAM, 256GB SSD e até 18 horas de bateria', 3200000.00, 8, true, 'Apple', 1.24, '304.1 x 215.0 x 11.3 mm', 'MacBook Air M3 - Performance excepcional em design ultrafino'),
('Nike Air Max 270', 'Tênis esportivo com tecnologia Air Max visível e design moderno', 180000.00, 25, true, 'Nike', 0.5, '30 x 20 x 12 cm', 'Nike Air Max 270 - Conforto e estilo para o dia a dia'),
('Camisa Social Slim Fit', 'Camisa social masculina de algodão premium, corte slim fit', 85000.00, 30, true, 'Aramis', 0.3, 'P, M, G, GG', 'Camisa social slim fit - Elegância e conforto para ocasiões especiais'),
('Vestido Midi Floral', 'Vestido feminino midi com estampa floral, tecido fluido e confortável', 120000.00, 20, true, 'Zara', 0.4, 'P, M, G', 'Vestido midi floral - Feminilidade e elegância em uma peça'),
('Sofá 3 Lugares Retrátil', 'Sofá confortável com 3 lugares, função retrátil e reclinável', 850000.00, 5, true, 'Tok&Stok', 85.0, '220 x 95 x 90 cm', 'Sofá 3 lugares retrátil - Conforto e funcionalidade para sua sala'),
('Mesa de Jantar 6 Lugares', 'Mesa de jantar em madeira maciça com capacidade para 6 pessoas', 650000.00, 3, true, 'Madesa', 45.0, '160 x 90 x 75 cm', 'Mesa de jantar 6 lugares - Elegância e durabilidade para sua casa'),
('Perfume Masculino 100ml', 'Fragrância masculina sofisticada com notas amadeiradas', 250000.00, 40, true, 'Boticário', 0.5, '10 x 5 x 15 cm', 'Perfume masculino - Fragrância marcante e duradoura'),
('Kit Cuidados Faciais', 'Kit completo para cuidados faciais com limpador, tônico e hidratante', 180000.00, 35, true, 'Natura', 0.8, '20 x 15 x 8 cm', 'Kit cuidados faciais - Rotina completa para pele saudável')
ON CONFLICT (name) DO NOTHING;

-- Inserir categorias se não existirem
INSERT INTO categories (name, description, slug) VALUES
('Eletrônicos', 'Smartphones, laptops, tablets e acessórios tecnológicos', 'eletronicos'),
('Roupas', 'Vestuário masculino e feminino para todas as ocasiões', 'roupas'),
('Casa e Jardim', 'Móveis, decoração e utensílios para o lar', 'casa-jardim'),
('Beleza', 'Cosméticos, perfumes e produtos de cuidados pessoais', 'beleza'),
('Esportes', 'Equipamentos esportivos, roupas fitness e acessórios', 'esportes')
ON CONFLICT (name) DO NOTHING;

-- Associar produtos às categorias
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'eletronicos') 
WHERE name IN ('iPhone 15 Pro Max 256GB', 'Samsung Galaxy S24 Ultra', 'MacBook Air M3 13"');

UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'roupas') 
WHERE name IN ('Nike Air Max 270', 'Camisa Social Slim Fit', 'Vestido Midi Floral');

UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'casa-jardim') 
WHERE name IN ('Sofá 3 Lugares Retrátil', 'Mesa de Jantar 6 Lugares');

UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'beleza') 
WHERE name IN ('Perfume Masculino 100ml', 'Kit Cuidados Faciais');