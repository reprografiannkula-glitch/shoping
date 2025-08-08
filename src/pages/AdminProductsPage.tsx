import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Upload, 
  Image as ImageIcon,
  Save,
  X,
  AlertCircle,
  Star,
  Eye,
  Camera,
  Search,
  Filter
} from 'lucide-react';
import { supabase, Product, Category } from '../lib/supabase';
import { useAdmin } from '../context/AdminContext';
import toast from 'react-hot-toast';

interface ProductForm {
  id?: string;
  name: string;
  description: string;
  price: number;
  category_id: string;
  stock_quantity: number;
  is_active: boolean;
  brand?: string;
  weight?: number;
  dimensions?: string;
  meta_description?: string;
}

interface ProductImage {
  id: string;
  image_url: string;
  image_name: string;
  is_primary: boolean;
  sort_order: number;
}

export function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductForm | null>(null);
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [showImageManager, setShowImageManager] = useState(false);
  const [currentProductId, setCurrentProductId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const { admin } = useAdmin();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, searchTerm, filterCategory, filterStatus]);

  const loadData = async () => {
    try {
      // Carregar produtos com categorias e imagens
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          *,
          category:categories(id, name),
          product_images(id, image_url, image_name, is_primary, sort_order)
        `)
        .order('created_at', { ascending: false });

      if (productsError) throw productsError;

      // Carregar categorias
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (categoriesError) throw categoriesError;

      setProducts(productsData || []);
      setCategories(categoriesData || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    let filtered = [...products];

    // Filtro por busca
    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.brand?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por categoria
    if (filterCategory) {
      filtered = filtered.filter(product => product.category_id === filterCategory);
    }

    // Filtro por status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(product => 
        filterStatus === 'active' ? product.is_active : !product.is_active
      );
    }

    setFilteredProducts(filtered);
  };

  const loadProductImages = async (productId: string) => {
    try {
      const { data, error } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', productId)
        .order('sort_order');

      if (error) throw error;
      setProductImages(data || []);
    } catch (error) {
      console.error('Erro ao carregar imagens:', error);
      toast.error('Erro ao carregar imagens');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    try {
      const productData = {
        name: editingProduct.name,
        description: editingProduct.description,
        price: editingProduct.price,
        category_id: editingProduct.category_id || null,
        stock_quantity: editingProduct.stock_quantity,
        is_active: editingProduct.is_active,
        brand: editingProduct.brand || null,
        weight: editingProduct.weight || null,
        dimensions: editingProduct.dimensions || null,
        meta_description: editingProduct.meta_description || null
      };

      if (editingProduct.id) {
        // Atualizar produto existente
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) throw error;
        toast.success('Produto atualizado com sucesso!');
      } else {
        // Criar novo produto
        const { data, error } = await supabase
          .from('products')
          .insert(productData)
          .select()
          .single();

        if (error) throw error;
        
        // Se há imagens selecionadas, fazer upload
        if (selectedFiles && selectedFiles.length > 0) {
          await uploadProductImages(data.id, selectedFiles);
        }
        
        toast.success('Produto criado com sucesso!');
      }

      setShowForm(false);
      setEditingProduct(null);
      setSelectedFiles(null);
      loadData();
    } catch (error: any) {
      console.error('Erro ao salvar produto:', error);
      toast.error(error.message || 'Erro ao salvar produto');
    }
  };

  const uploadProductImages = async (productId: string, files: FileList) => {
    setUploadingImages(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validar arquivo
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} não é uma imagem válida`);
          continue;
        }
        
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} é muito grande (máximo 5MB)`);
          continue;
        }

        // Upload do arquivo
        const fileExt = file.name.split('.').pop();
        const fileName = `${productId}-${Date.now()}-${i}.${fileExt}`;
        const filePath = `products/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('uploads')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Obter URL pública
        const { data: { publicUrl } } = supabase.storage
          .from('uploads')
          .getPublicUrl(filePath);

        // Salvar informações da imagem
        await supabase
          .from('product_images')
          .insert({
            product_id: productId,
            image_url: publicUrl,
            image_name: file.name,
            is_primary: i === 0, // Primeira imagem é a principal
            sort_order: i
          });
      }

      toast.success('Imagens enviadas com sucesso!');
      loadProductImages(productId);
      loadData();
    } catch (error: any) {
      console.error('Erro ao enviar imagens:', error);
      toast.error(error.message || 'Erro ao enviar imagens');
    } finally {
      setUploadingImages(false);
    }
  };

  const setPrimaryImage = async (imageId: string, productId: string) => {
    try {
      const { error } = await supabase.rpc('set_primary_image', {
        p_product_id: productId,
        p_image_id: imageId
      });

      if (error) throw error;
      
      toast.success('Imagem principal definida!');
      loadProductImages(productId);
      loadData();
    } catch (error: any) {
      console.error('Erro ao definir imagem principal:', error);
      toast.error(error.message || 'Erro ao definir imagem principal');
    }
  };

  const deleteImage = async (imageId: string, productId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta imagem?')) return;

    try {
      const { error } = await supabase
        .from('product_images')
        .delete()
        .eq('id', imageId);

      if (error) throw error;
      
      toast.success('Imagem excluída com sucesso!');
      loadProductImages(productId);
      loadData();
    } catch (error: any) {
      console.error('Erro ao excluir imagem:', error);
      toast.error(error.message || 'Erro ao excluir imagem');
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.')) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;
      
      toast.success('Produto excluído com sucesso!');
      loadData();
    } catch (error: any) {
      console.error('Erro ao excluir produto:', error);
      toast.error(error.message || 'Erro ao excluir produto');
    }
  };

  const toggleProductStatus = async (productId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: !currentStatus })
        .eq('id', productId);

      if (error) throw error;
      
      toast.success(`Produto ${!currentStatus ? 'ativado' : 'desativado'} com sucesso!`);
      loadData();
    } catch (error: any) {
      console.error('Erro ao alterar status:', error);
      toast.error(error.message || 'Erro ao alterar status do produto');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA',
      minimumFractionDigits: 2
    }).format(price);
  };

  const openImageManager = (productId: string) => {
    setCurrentProductId(productId);
    setShowImageManager(true);
    loadProductImages(productId);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterCategory('');
    setFilterStatus('all');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gerenciar Produtos</h1>
            <p className="text-gray-600 mt-2">
              {filteredProducts.length} de {products.length} produtos
            </p>
          </div>
          <button
            onClick={() => {
              setEditingProduct({
                name: '',
                description: '',
                price: 0,
                category_id: '',
                stock_quantity: 0,
                is_active: true,
                brand: '',
                weight: 0,
                dimensions: '',
                meta_description: ''
              });
              setShowForm(true);
            }}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Novo Produto</span>
          </button>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Buscar produtos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="">Todas as Categorias</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="all">Todos os Status</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>

            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2"
            >
              <Filter className="h-4 w-4" />
              <span>Limpar Filtros</span>
            </button>
          </div>
        </div>

        {/* Lista de Produtos */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Produto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Categoria
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Preço
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estoque
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-12 w-12">
                          {product.featured_image_url || product.image_url ? (
                            <img
                              className="h-12 w-12 rounded-lg object-cover"
                              src={product.featured_image_url || product.image_url}
                              alt={product.name}
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center">
                              <ImageIcon className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 line-clamp-1">
                            {product.name}
                          </div>
                          <div className="text-sm text-gray-500 line-clamp-1">
                            {product.brand && `${product.brand} • `}
                            {product.description}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.category?.name || 'Sem categoria'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatPrice(product.price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        product.stock_quantity > 10 
                          ? 'bg-green-100 text-green-800'
                          : product.stock_quantity > 0
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {product.stock_quantity} unidades
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleProductStatus(product.id, product.is_active)}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
                          product.is_active 
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                      >
                        {product.is_active ? 'Ativo' : 'Inativo'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openImageManager(product.id)}
                          className="text-purple-600 hover:text-purple-900 transition-colors p-1"
                          title="Gerenciar Imagens"
                        >
                          <Camera className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingProduct({
                              id: product.id,
                              name: product.name,
                              description: product.description || '',
                              price: product.price,
                              category_id: product.category_id || '',
                              stock_quantity: product.stock_quantity,
                              is_active: product.is_active,
                              brand: product.brand || '',
                              weight: product.weight || 0,
                              dimensions: product.dimensions || '',
                              meta_description: product.meta_description || ''
                            });
                            setShowForm(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 transition-colors p-1"
                          title="Editar Produto"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="text-red-600 hover:text-red-900 transition-colors p-1"
                          title="Excluir Produto"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <ImageIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhum produto encontrado
              </h3>
              <p className="text-gray-500">
                {searchTerm || filterCategory || filterStatus !== 'all' 
                  ? 'Tente ajustar os filtros de busca'
                  : 'Comece adicionando seu primeiro produto'
                }
              </p>
            </div>
          )}
        </div>

        {/* Modal de Formulário */}
        {showForm && editingProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {editingProduct.id ? 'Editar Produto' : 'Novo Produto'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowForm(false);
                      setEditingProduct(null);
                      setSelectedFiles(null);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nome do Produto *
                      </label>
                      <input
                        type="text"
                        required
                        value={editingProduct.name}
                        onChange={(e) => setEditingProduct({
                          ...editingProduct,
                          name: e.target.value
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Marca
                      </label>
                      <input
                        type="text"
                        value={editingProduct.brand}
                        onChange={(e) => setEditingProduct({
                          ...editingProduct,
                          brand: e.target.value
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descrição
                    </label>
                    <textarea
                      rows={3}
                      value={editingProduct.description}
                      onChange={(e) => setEditingProduct({
                        ...editingProduct,
                        description: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Meta Descrição (SEO)
                    </label>
                    <textarea
                      rows={2}
                      value={editingProduct.meta_description}
                      onChange={(e) => setEditingProduct({
                        ...editingProduct,
                        meta_description: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="Descrição para motores de busca"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Preço (AOA) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={editingProduct.price}
                        onChange={(e) => setEditingProduct({
                          ...editingProduct,
                          price: parseFloat(e.target.value) || 0
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Estoque *
                      </label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={editingProduct.stock_quantity}
                        onChange={(e) => setEditingProduct({
                          ...editingProduct,
                          stock_quantity: parseInt(e.target.value) || 0
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Peso (kg)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editingProduct.weight}
                        onChange={(e) => setEditingProduct({
                          ...editingProduct,
                          weight: parseFloat(e.target.value) || 0
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Categoria
                      </label>
                      <select
                        value={editingProduct.category_id}
                        onChange={(e) => setEditingProduct({
                          ...editingProduct,
                          category_id: e.target.value
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      >
                        <option value="">Selecione uma categoria</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Dimensões
                      </label>
                      <input
                        type="text"
                        value={editingProduct.dimensions}
                        onChange={(e) => setEditingProduct({
                          ...editingProduct,
                          dimensions: e.target.value
                        })}
                        placeholder="Ex: 20x15x10 cm"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {!editingProduct.id && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Imagens do Produto
                      </label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={(e) => setSelectedFiles(e.target.files)}
                          className="hidden"
                          id="image-upload"
                        />
                        <label
                          htmlFor="image-upload"
                          className="cursor-pointer inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Escolher Imagens
                        </label>
                        <p className="text-xs text-gray-500 mt-2">
                          PNG, JPG até 5MB cada (múltiplas imagens)
                        </p>
                        {selectedFiles && selectedFiles.length > 0 && (
                          <div className="mt-4">
                            <p className="text-sm text-gray-700">
                              {selectedFiles.length} arquivo(s) selecionado(s)
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={editingProduct.is_active}
                      onChange={(e) => setEditingProduct({
                        ...editingProduct,
                        is_active: e.target.checked
                      })}
                      className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                    />
                    <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                      Produto ativo (visível na loja)
                    </label>
                  </div>

                  <div className="flex justify-end space-x-4 pt-6 border-t">
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false);
                        setEditingProduct(null);
                        setSelectedFiles(null);
                      }}
                      className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={uploadingImages}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
                    >
                      <Save className="h-4 w-4" />
                      <span>{uploadingImages ? 'Salvando...' : 'Salvar'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Gerenciamento de Imagens */}
        {showImageManager && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Gerenciar Imagens do Produto
                  </h2>
                  <button
                    onClick={() => {
                      setShowImageManager(false);
                      setCurrentProductId('');
                      setProductImages([]);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {/* Upload de Novas Imagens */}
                <div className="mb-6">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          uploadProductImages(currentProductId, e.target.files);
                        }
                      }}
                      className="hidden"
                      id="new-images-upload"
                    />
                    <label
                      htmlFor="new-images-upload"
                      className="cursor-pointer inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      Adicionar Imagens
                    </label>
                  </div>
                </div>

                {/* Grid de Imagens */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {productImages.map((image) => (
                    <div key={image.id} className="relative group">
                      <img
                        src={image.image_url}
                        alt={image.image_name}
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                      
                      {/* Overlay com ações */}
                      <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center space-x-2">
                        {!image.is_primary && (
                          <button
                            onClick={() => setPrimaryImage(image.id, currentProductId)}
                            className="p-2 bg-yellow-600 text-white rounded-full hover:bg-yellow-700"
                            title="Definir como principal"
                          >
                            <Star className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteImage(image.id, currentProductId)}
                          className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700"
                          title="Excluir imagem"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Badge de imagem principal */}
                      {image.is_primary && (
                        <div className="absolute top-2 left-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            <Star className="h-3 w-3 mr-1" />
                            Principal
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {productImages.length === 0 && (
                  <div className="text-center py-8">
                    <ImageIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-500">Nenhuma imagem adicionada ainda</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}