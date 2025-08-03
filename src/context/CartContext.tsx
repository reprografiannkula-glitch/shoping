import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, CartItem, Product } from '../lib/supabase';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

interface CartContextType {
  items: CartItem[];
  loading: boolean;
  addToCart: (product: Product, quantity?: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadCart();
    } else {
      setItems([]);
    }
  }, [user]);

  const loadCart = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          id,
          user_id,
          product_id,
          quantity,
          created_at,
          product:products (
            id,
            name,
            description,
            price,
            image_url,
            stock_quantity,
            is_active
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Erro ao carregar carrinho:', error);
      toast.error('Erro ao carregar carrinho');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (product: Product, quantity = 1) => {
    if (!user) {
      toast.error('Faça login para adicionar ao carrinho');
      return;
    }

    if (product.stock_quantity < quantity) {
      toast.error('Estoque insuficiente');
      return;
    }

    try {
      // Verificar se já existe no carrinho
      const existingItem = items.find(item => item.product_id === product.id);

      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;
        if (newQuantity > product.stock_quantity) {
          toast.error('Quantidade solicitada excede o estoque');
          return;
        }
        await updateQuantity(product.id, newQuantity);
      } else {
        const { error } = await supabase
          .from('cart_items')
          .insert({
            user_id: user.id,
            product_id: product.id,
            quantity
          });

        if (error) throw error;
        await loadCart();
      }

      toast.success('Produto adicionado ao carrinho!');
    } catch (error) {
      console.error('Erro ao adicionar ao carrinho:', error);
      toast.error('Erro ao adicionar produto');
    }
  };

  const removeFromCart = async (productId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId);

      if (error) throw error;
      await loadCart();
      toast.success('Produto removido do carrinho');
    } catch (error) {
      console.error('Erro ao remover do carrinho:', error);
      toast.error('Erro ao remover produto');
    }
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    if (!user) return;

    if (quantity <= 0) {
      await removeFromCart(productId);
      return;
    }

    try {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity })
        .eq('user_id', user.id)
        .eq('product_id', productId);

      if (error) throw error;
      await loadCart();
    } catch (error) {
      console.error('Erro ao atualizar quantidade:', error);
      toast.error('Erro ao atualizar quantidade');
    }
  };

  const clearCart = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
      setItems([]);
      toast.success('Carrinho limpo');
    } catch (error) {
      console.error('Erro ao limpar carrinho:', error);
      toast.error('Erro ao limpar carrinho');
    }
  };

  const getTotalItems = () => {
    return items.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalPrice = () => {
    return items.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  };

  return (
    <CartContext.Provider value={{
      items,
      loading,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      getTotalItems,
      getTotalPrice
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}