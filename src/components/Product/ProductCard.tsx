import React, { useState } from 'react';
import { Heart, ShoppingCart, Eye } from 'lucide-react';
import { Product } from '../../lib/supabase';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const { addToCart } = useCart();
  const { user } = useAuth();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA',
      minimumFractionDigits: 2
    }).format(price);
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Faça login para adicionar ao carrinho');
      return;
    }

    setIsAddingToCart(true);
    try {
      await addToCart(product);
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleToggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Faça login para adicionar aos favoritos');
      return;
    }

    // TODO: Implementar wishlist
    setIsWishlisted(!isWishlisted);
    toast.success(isWishlisted ? 'Removido dos favoritos' : 'Adicionado aos favoritos');
  };

  return (
    <div className="group relative bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
      <Link to={`/product/${product.id}`} className="block">
        {/* Imagem do Produto */}
        <div className="aspect-square w-full overflow-hidden rounded-t-lg bg-gray-100">
          {product.featured_image_url || product.image_url ? (
            <img
              src={product.featured_image_url || product.image_url}
              alt={product.name}
              className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-200"
              loading="lazy"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-gray-400">
              <ShoppingCart className="h-12 w-12" />
            </div>
          )}
        </div>

        {/* Informações do Produto */}
        <div className="p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-1 line-clamp-2">
            {product.name}
          </h3>
          
          {product.description && (
            <p className="text-xs text-gray-500 mb-2 line-clamp-2">
              {product.description}
            </p>
          )}

          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-green-600">
              {formatPrice(product.price)}
            </span>
            
            {product.stock_quantity > 0 ? (
              <span className="text-xs text-gray-500">
                {product.stock_quantity} em estoque
              </span>
            ) : (
              <span className="text-xs text-red-500 font-medium">
                Sem estoque
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* Botões de Ação */}
      <div className="absolute top-2 right-2 flex flex-col space-y-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <button
          onClick={handleToggleWishlist}
          className={`p-2 rounded-full shadow-md transition-colors ${
            isWishlisted 
              ? 'bg-red-100 text-red-600 hover:bg-red-200' 
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
          title={isWishlisted ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
        >
          <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-current' : ''}`} />
        </button>
        
        <Link
          to={`/product/${product.id}`}
          className="p-2 bg-white text-gray-600 hover:bg-gray-50 rounded-full shadow-md transition-colors"
          title="Ver detalhes"
        >
          <Eye className="h-4 w-4" />
        </Link>
      </div>

      {/* Botão de Adicionar ao Carrinho */}
      <div className="p-4 pt-0">
        <button
          onClick={handleAddToCart}
          disabled={product.stock_quantity === 0 || isAddingToCart}
          className={`w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
            product.stock_quantity === 0
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700 disabled:opacity-50'
          }`}
        >
          <ShoppingCart className="h-4 w-4" />
          <span>
            {isAddingToCart ? 'Adicionando...' : 
             product.stock_quantity === 0 ? 'Sem Estoque' : 'Adicionar'}
          </span>
        </button>
      </div>

      {/* Badge de Promoção (se aplicável) */}
      {product.stock_quantity < 10 && product.stock_quantity > 0 && (
        <div className="absolute top-2 left-2">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            Últimas unidades
          </span>
        </div>
      )}
    </div>
  );
}