import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShoppingBag, TrendingUp, Shield } from 'lucide-react';
import { supabase, Product, Category } from '../lib/supabase';
import { ProductGrid } from '../components/Product/ProductGrid';

export function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Carregar produtos em destaque (os mais recentes)
      const { data: products } = await supabase
        .from('products')
        .select(`
          id,
          name,
          description,
          price,
          image_url,
          stock_quantity,
          is_active,
          created_at,
          updated_at,
          category:categories(name)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(8);

      // Carregar categorias
      const { data: categoryData } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      setFeaturedProducts(products || []);
      setCategories(categoryData || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-green-600 to-green-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl lg:text-6xl font-bold mb-6 leading-tight">
                Bem-vindo à
                <span className="block text-green-200">LojaAngola</span>
              </h1>
              <p className="text-xl mb-8 text-green-100 leading-relaxed">
                A sua loja online de confiança em Angola. Descubra produtos de qualidade 
                com pagamento seguro e entrega rápida em todo o país.
              </p>
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                <Link
                  to="/products"
                  className="inline-flex items-center justify-center px-8 py-3 bg-white text-green-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Explorar Produtos
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
                <Link
                  to="/categories"
                  className="inline-flex items-center justify-center px-8 py-3 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-400 transition-colors"
                >
                  Ver Categorias
                </Link>
              </div>
            </div>
            <div className="relative">
              <img
                src="https://images.pexels.com/photos/230544/pexels-photo-230544.jpeg"
                alt="Compras Online"
                className="rounded-lg shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Características */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <ShoppingBag className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Produtos de Qualidade</h3>
              <p className="text-gray-600">
                Selecionamos cuidadosamente cada produto para garantir a melhor qualidade aos nossos clientes.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Preços Competitivos</h3>
              <p className="text-gray-600">
                Oferecemos os melhores preços do mercado angolano com promoções exclusivas.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto h-16 w-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                <Shield className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Pagamento Seguro</h3>
              <p className="text-gray-600">
                Aceitamos transferências bancárias do BAI e Atlântico com total segurança.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Categorias */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Explore Nossas Categorias
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Encontre exactamente o que procura nas nossas categorias cuidadosamente organizadas.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {categories.map((category) => (
              <Link
                key={category.id}
                to={`/category/${category.id}`}
                className="group relative bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="aspect-square">
                  <img
                    src={category.image_url || 'https://images.pexels.com/photos/230544/pexels-photo-230544.jpeg'}
                    alt={category.name}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                </div>
                <div className="absolute inset-0 bg-black bg-opacity-20 group-hover:bg-opacity-30 transition-opacity"></div>
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="text-white font-semibold text-lg">
                    {category.name}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Produtos em Destaque */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Produtos em Destaque
              </h2>
              <p className="text-lg text-gray-600">
                Confira os nossos produtos mais populares e novidades.
              </p>
            </div>
            <Link
              to="/products"
              className="inline-flex items-center text-green-600 hover:text-green-700 font-semibold"
            >
              Ver Todos
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>

          <ProductGrid products={featuredProducts} loading={loading} />
        </div>
      </section>

      {/* Informações Bancárias */}
      <section className="py-16 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Formas de Pagamento
            </h2>
            <p className="text-xl text-gray-300">
              Aceitamos transferências bancárias dos principais bancos de Angola
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-gray-800 rounded-lg p-6 text-center">
              <h3 className="text-xl font-bold mb-4 text-green-400">Banco BAI</h3>
              <div className="space-y-2">
                <p><span className="font-semibold">Conta:</span> 237770124.10.001</p>
                <p><span className="font-semibold">IBAN:</span> AO06 0040.0000.3777.0124.1012.6</p>
                <p className="text-sm text-gray-400">Titular: LojaAngola, Lda</p>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 text-center">
              <h3 className="text-xl font-bold mb-4 text-blue-400">Banco Atlântico</h3>
              <div className="space-y-2">
                <p><span className="font-semibold">Conta:</span> 31390641610001</p>
                <p><span className="font-semibold">IBAN:</span> AO06 0055.0000.1390.6416.1610.113</p>
                <p className="text-sm text-gray-400">Titular: LojaAngola, Lda</p>
              </div>
            </div>
          </div>

          <div className="text-center mt-8">
            <p className="text-gray-300">
              Após realizar o pagamento, envie o comprovativo para confirmarmos o seu pedido.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}