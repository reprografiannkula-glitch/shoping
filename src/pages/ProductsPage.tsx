import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, SlidersHorizontal } from 'lucide-react';
import { supabase, Product, Category } from '../lib/supabase';
import { ProductGrid } from '../components/Product/ProductGrid';

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Filtros
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [priceRange, setPriceRange] = useState({
    min: searchParams.get('min_price') || '',
    max: searchParams.get('max_price') || ''
  });
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest');
  const [searchQuery] = useState(searchParams.get('q') || '');

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [selectedCategory, priceRange, sortBy, searchQuery]);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      let query = supabase
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
          category:categories(id, name)
        `)
        .eq('is_active', true);

      // Filtro por categoria
      if (selectedCategory) {
        query = query.eq('category_id', selectedCategory);
      }

      // Filtro por preço
      if (priceRange.min) {
        query = query.gte('price', parseFloat(priceRange.min));
      }
      if (priceRange.max) {
        query = query.lte('price', parseFloat(priceRange.max));
      }

      // Busca por texto
      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      // Ordenação
      switch (sortBy) {
        case 'price_asc':
          query = query.order('price', { ascending: true });
          break;
        case 'price_desc':
          query = query.order('price', { ascending: false });
          break;
        case 'name':
          query = query.order('name', { ascending: true });
          break;
        default:
          query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = () => {
    const params = new URLSearchParams();
    
    if (selectedCategory) params.set('category', selectedCategory);
    if (priceRange.min) params.set('min_price', priceRange.min);
    if (priceRange.max) params.set('max_price', priceRange.max);
    if (sortBy !== 'newest') params.set('sort', sortBy);
    if (searchQuery) params.set('q', searchQuery);

    setSearchParams(params);
  };

  const clearFilters = () => {
    setSelectedCategory('');
    setPriceRange({ min: '', max: '' });
    setSortBy('newest');
    setSearchParams({});
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {searchQuery ? `Resultados para "${searchQuery}"` : 'Todos os Produtos'}
            </h1>
            <p className="text-gray-600 mt-2">
              {products.length} produto{products.length !== 1 ? 's' : ''} encontrado{products.length !== 1 ? 's' : ''}
            </p>
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="lg:hidden flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <SlidersHorizontal className="h-5 w-5" />
            <span>Filtros</span>
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filtros - Sidebar */}
          <div className={`lg:w-64 ${showFilters ? 'block' : 'hidden lg:block'}`}>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-24">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Filter className="h-5 w-5 mr-2" />
                  Filtros
                </h3>
                <button
                  onClick={clearFilters}
                  className="text-sm text-green-600 hover:text-green-700"
                >
                  Limpar
                </button>
              </div>

              {/* Ordenação */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ordenar por
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="newest">Mais Recentes</option>
                  <option value="price_asc">Menor Preço</option>
                  <option value="price_desc">Maior Preço</option>
                  <option value="name">Nome A-Z</option>
                </select>
              </div>

              {/* Categoria */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categoria
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">Todas as Categorias</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Faixa de Preço */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Faixa de Preço (AOA)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    placeholder="Mín"
                    value={priceRange.min}
                    onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Máx"
                    value={priceRange.max}
                    onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              <button
                onClick={handleFilterChange}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
              >
                Aplicar Filtros
              </button>
            </div>
          </div>

          {/* Grid de Produtos */}
          <div className="flex-1">
            <ProductGrid products={products} loading={loading} />
          </div>
        </div>
      </div>
    </div>
  );
}