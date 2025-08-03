import React from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingCart, ArrowLeft } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export function CartPage() {
  const { items, updateQuantity, removeFromCart, getTotalPrice, loading } = useCart();
  const { user } = useAuth();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA',
      minimumFractionDigits: 2
    }).format(price);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ShoppingCart className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Faça login para ver seu carrinho
          </h2>
          <p className="text-gray-600 mb-6">
            É necessário estar logado para adicionar produtos ao carrinho.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
          >
            Fazer Login
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <ShoppingCart className="mx-auto h-16 w-16 text-gray-400 mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Seu carrinho está vazio
            </h2>
            <p className="text-gray-600 mb-8">
              Adicione alguns produtos incríveis ao seu carrinho e comece a comprar!
            </p>
            <Link
              to="/products"
              className="inline-flex items-center px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              Continuar Comprando
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center mb-8">
          <Link
            to="/products"
            className="flex items-center text-green-600 hover:text-green-700 mr-4"
          >
            <ArrowLeft className="h-5 w-5 mr-1" />
            Continuar Comprando
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            Meu Carrinho ({items.length} {items.length === 1 ? 'item' : 'itens'})
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Lista de Produtos */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6">
                <div className="space-y-6">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center space-x-4 pb-6 border-b border-gray-200 last:border-b-0">
                      {/* Imagem do Produto */}
                      <div className="flex-shrink-0">
                        <img
                          src={item.product.image_url || '/placeholder-product.jpg'}
                          alt={item.product.name}
                          className="h-20 w-20 object-cover rounded-lg border border-gray-200"
                        />
                      </div>

                      {/* Informações do Produto */}
                      <div className="flex-1 min-w-0">
                        <Link
                          to={`/product/${item.product.id}`}
                          className="text-lg font-medium text-gray-900 hover:text-green-600 line-clamp-2"
                        >
                          {item.product.name}
                        </Link>
                        <p className="text-sm text-gray-500 mt-1">
                          {formatPrice(item.product.price)} cada
                        </p>
                        <p className="text-sm text-gray-500">
                          Estoque: {item.product.stock_quantity} unidades
                        </p>
                      </div>

                      {/* Controles de Quantidade */}
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                          className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="h-4 w-4 text-gray-600" />
                        </button>

                        <span className="min-w-[3rem] text-center font-medium">
                          {item.quantity}
                        </span>

                        <button
                          onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                          className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                          disabled={item.quantity >= item.product.stock_quantity}
                        >
                          <Plus className="h-4 w-4 text-gray-600" />
                        </button>
                      </div>

                      {/* Preço Total do Item */}
                      <div className="text-right">
                        <p className="text-lg font-semibold text-gray-900">
                          {formatPrice(item.product.price * item.quantity)}
                        </p>
                      </div>

                      {/* Botão Remover */}
                      <button
                        onClick={() => removeFromCart(item.product_id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                        title="Remover do carrinho"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Resumo do Pedido */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-24">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Resumo do Pedido
              </h3>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="text-gray-900">{formatPrice(getTotalPrice())}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Entrega</span>
                  <span className="text-gray-900">Grátis</span>
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total</span>
                    <span className="text-green-600">{formatPrice(getTotalPrice())}</span>
                  </div>
                </div>
              </div>

              <Link
                to="/checkout"
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 transition-colors text-center block"
              >
                Finalizar Compra
              </Link>

              <div className="mt-4 text-center">
                <Link
                  to="/products"
                  className="text-green-600 hover:text-green-700 text-sm font-medium"
                >
                  Continuar Comprando
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}