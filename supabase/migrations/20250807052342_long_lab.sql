/*
  # Sistema Completo de Gerenciamento de Produtos

  1. Tabelas
    - Melhoria na tabela products
    - Sistema de imagens múltiplas
    - Categorias organizadas
    
  2. Segurança
    - RLS para produtos
    - Permissões administrativas
    - Upload seguro de imagens
*/

-- Melhorar tabela de produtos
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS featured_image_url TEXT,
ADD COLUMN IF NOT EXISTS meta_description TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS weight DECIMAL(8,2),
ADD COLUMN IF NOT EXISTS dimensions TEXT,
ADD COLUMN IF NOT EXISTS brand TEXT;

-- Criar tabela de imagens de produtos se não existir
CREATE TABLE IF NOT EXISTS product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_name TEXT,
  is_primary BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_primary ON product_images(product_id, is_primary);

-- RLS para product_images
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

-- Políticas para product_images
DROP POLICY IF EXISTS "Anyone can view product images" ON product_images;
CREATE POLICY "Anyone can view product images"
  ON product_images FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Admins can manage product images" ON product_images;
CREATE POLICY "Admins can manage product images"
  ON product_images FOR ALL
  TO public
  USING (is_admin_authenticated())
  WITH CHECK (is_admin_authenticated());

-- Função para definir imagem principal
CREATE OR REPLACE FUNCTION set_primary_image(p_product_id UUID, p_image_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Remove primary de todas as imagens do produto
  UPDATE product_images 
  SET is_primary = false 
  WHERE product_id = p_product_id;
  
  -- Define a nova imagem como primary
  UPDATE product_images 
  SET is_primary = true 
  WHERE id = p_image_id AND product_id = p_product_id;
  
  -- Atualiza a featured_image_url no produto
  UPDATE products 
  SET featured_image_url = (
    SELECT image_url 
    FROM product_images 
    WHERE id = p_image_id
  )
  WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Inserir produtos reais se não existirem
INSERT INTO products (name, description, price, stock_quantity, is_active, category_id) 
SELECT * FROM (VALUES
  ('iPhone 15 Pro Max 256GB', 'Smartphone Apple iPhone 15 Pro Max com 256GB de armazenamento, câmera profissional de 48MP, chip A17 Pro e tela Super Retina XDR de 6.7 polegadas.', 850000.00, 15, true, (SELECT id FROM categories WHERE name = 'Eletrônicos' LIMIT 1)),
  ('Samsung Galaxy S24 Ultra', 'Smartphone Samsung Galaxy S24 Ultra com S Pen integrada, câmera de 200MP, 12GB RAM, 512GB armazenamento e tela Dynamic AMOLED 2X.', 780000.00, 12, true, (SELECT id FROM categories WHERE name = 'Eletrônicos' LIMIT 1)),
  ('MacBook Air M3 13"', 'Laptop Apple MacBook Air com chip M3, 8GB RAM, 256GB SSD, tela Liquid Retina de 13.6 polegadas e até 18 horas de bateria.', 1200000.00, 8, true, (SELECT id FROM categories WHERE name = 'Eletrônicos' LIMIT 1)),
  ('Dell XPS 15', 'Laptop Dell XPS 15 com Intel Core i7, 16GB RAM, 512GB SSD, placa gráfica NVIDIA RTX 4050 e tela InfinityEdge 4K.', 950000.00, 6, true, (SELECT id FROM categories WHERE name = 'Eletrônicos' LIMIT 1)),
  ('Sony WH-1000XM5', 'Fones de ouvido Sony com cancelamento de ruído líder da indústria, 30 horas de bateria e qualidade de som premium.', 45000.00, 25, true, (SELECT id FROM categories WHERE name = 'Eletrônicos' LIMIT 1)),
  ('Camisa Social Masculina', 'Camisa social masculina em algodão premium, corte slim fit, disponível em várias cores e tamanhos.', 8500.00, 50, true, (SELECT id FROM categories WHERE name = 'Roupas' LIMIT 1)),
  ('Vestido Elegante Feminino', 'Vestido elegante feminino em tecido nobre, ideal para ocasiões especiais, disponível em diversos tamanhos.', 12000.00, 30, true, (SELECT id FROM categories WHERE name = 'Roupas' LIMIT 1)),
  ('Tênis Nike Air Max', 'Tênis Nike Air Max com tecnologia de amortecimento avançada, design moderno e conforto excepcional.', 25000.00, 40, true, (SELECT id FROM categories WHERE name = 'Roupas' LIMIT 1)),
  ('Sofá 3 Lugares Premium', 'Sofá de 3 lugares em couro sintético premium, estrutura em madeira maciça, design moderno e confortável.', 85000.00, 10, true, (SELECT id FROM categories WHERE name = 'Casa e Jardim' LIMIT 1)),
  ('Mesa de Jantar 6 Lugares', 'Mesa de jantar para 6 pessoas em madeira nobre, design elegante e acabamento refinado.', 65000.00, 8, true, (SELECT id FROM categories WHERE name = 'Casa e Jardim' LIMIT 1)),
  ('Perfume Importado 100ml', 'Perfume importado masculino/feminino, fragrância marcante e duradoura, frasco de 100ml.', 15000.00, 35, true, (SELECT id FROM categories WHERE name = 'Beleza' LIMIT 1)),
  ('Kit Cuidados Faciais', 'Kit completo para cuidados faciais com limpador, tônico, hidratante e protetor solar.', 8000.00, 45, true, (SELECT id FROM categories WHERE name = 'Beleza' LIMIT 1))
) AS v(name, description, price, stock_quantity, is_active, category_id)
WHERE NOT EXISTS (SELECT 1 FROM products WHERE products.name = v.name);

-- Atualizar produtos existentes com descrições melhores
UPDATE products SET 
  description = CASE 
    WHEN name LIKE '%Smartphone%' THEN 'Smartphone moderno com tecnologia avançada, câmera de alta qualidade e performance excepcional.'
    WHEN name LIKE '%Laptop%' THEN 'Laptop de alta performance para trabalho e entretenimento, com processador rápido e design elegante.'
    WHEN name LIKE '%Camisa%' THEN 'Camisa de qualidade premium, tecido confortável e corte moderno para todas as ocasiões.'
    WHEN name LIKE '%Vestido%' THEN 'Vestido elegante e sofisticado, perfeito para ocasiões especiais e eventos importantes.'
    WHEN name LIKE '%Mesa%' THEN 'Mesa de alta qualidade com design moderno e acabamento refinado para sua casa.'
    WHEN name LIKE '%Perfume%' THEN 'Perfume de fragrância marcante e duradoura, ideal para quem busca elegância e sofisticação.'
    ELSE description
  END
WHERE description IS NULL OR description = '';