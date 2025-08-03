import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { CreditCard, Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const schema = yup.object({
  customer_name: yup.string().required('Nome é obrigatório'),
  customer_email: yup.string().email('Email inválido').required('Email é obrigatório'),
  customer_phone: yup.string().required('Telefone é obrigatório'),
  shipping_address: yup.string().required('Endereço de entrega é obrigatório'),
  bank_name: yup.string().required('Selecione um banco'),
});

type FormData = yup.InferType<typeof schema>;

export function CheckoutPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [orderId, setOrderId] = useState<string>('');
  
  const { items, getTotalPrice, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors }, watch } = useForm<FormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      customer_name: user?.user_metadata?.name || '',
      customer_email: user?.email || '',
    }
  });

  const selectedBank = watch('bank_name');

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA',
      minimumFractionDigits: 2
    }).format(price);
  };

  const getBankInfo = (bankName: string) => {
    const banks = {
      'BAI': {
        name: 'Banco BAI',
        account: '237770124.10.001',
        iban: 'AO06 0040.0000.3777.0124.1012.6',
        holder: 'LojaAngola, Lda'
      },
      'Atlantico': {
        name: 'Banco Atlântico',
        account: '31390641610001',
        iban: 'AO06 0055.0000.1390.6416.1610.113',
        holder: 'LojaAngola, Lda'
      }
    };
    return banks[bankName as keyof typeof banks];
  };

  const onSubmit = async (data: FormData) => {
    if (!user || items.length === 0) return;

    try {
      // Criar pedido
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          total_amount: getTotalPrice(),
          status: 'pending',
          customer_name: data.customer_name,
          customer_email: data.customer_email,
          customer_phone: data.customer_phone,
          shipping_address: data.shipping_address,
          payment_method: 'bank_transfer',
          bank_name: data.bank_name,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Criar itens do pedido
      const orderItems = items.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.product.name,
        product_price: item.product.price,
        quantity: item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      setOrderId(order.id);
      setCurrentStep(2);
      toast.success('Pedido criado com sucesso!');
    } catch (error) {
      console.error('Erro ao criar pedido:', error);
      toast.error('Erro ao criar pedido. Tente novamente.');
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile || !orderId) return;

    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 5MB.');
      return;
    }

    setUploading(true);
    try {
      // Upload do arquivo
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${orderId}-${Date.now()}.${fileExt}`;
      const filePath = `payment-proofs/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('uploads')
        .getPublicUrl(filePath);

      // Salvar informações do comprovativo
      const { error: proofError } = await supabase
        .from('payment_proofs')
        .insert({
          order_id: orderId,
          file_url: publicUrl,
          file_name: selectedFile.name,
          file_size: selectedFile.size,
          status: 'pending'
        });

      if (proofError) throw proofError;

      // Atualizar status do pedido
      await supabase
        .from('orders')
        .update({ status: 'paid' })
        .eq('id', orderId);

      setCurrentStep(3);
      clearCart();
      toast.success('Comprovativo enviado com sucesso!');
    } catch (error) {
      console.error('Erro ao enviar comprovativo:', error);
      toast.error('Erro ao enviar comprovativo. Tente novamente.');
    } finally {
      setUploading(false);
    }
  };

  if (!user) {
    navigate('/login');
    return null;
  }

  if (items.length === 0) {
    navigate('/cart');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-8">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  currentStep >= step 
                    ? 'bg-green-600 border-green-600 text-white' 
                    : 'border-gray-300 text-gray-500'
                }`}>
                  {currentStep > step ? <CheckCircle className="h-6 w-6" /> : step}
                </div>
                <span className={`ml-2 text-sm font-medium ${
                  currentStep >= step ? 'text-green-600' : 'text-gray-500'
                }`}>
                  {step === 1 && 'Dados'}
                  {step === 2 && 'Pagamento'}
                  {step === 3 && 'Confirmação'}
                </span>
                {step < 3 && (
                  <div className={`ml-8 w-16 h-0.5 ${
                    currentStep > step ? 'bg-green-600' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Dados do Cliente */}
        {currentStep === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Dados de Entrega
              </h2>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    {...register('customer_name')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  {errors.customer_name && (
                    <p className="text-red-500 text-sm mt-1">{errors.customer_name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    {...register('customer_email')}
                    type="email"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  {errors.customer_email && (
                    <p className="text-red-500 text-sm mt-1">{errors.customer_email.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefone *
                  </label>
                  <input
                    {...register('customer_phone')}
                    type="tel"
                    placeholder="+244 900 000 000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  {errors.customer_phone && (
                    <p className="text-red-500 text-sm mt-1">{errors.customer_phone.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Endereço de Entrega *
                  </label>
                  <textarea
                    {...register('shipping_address')}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Rua, número, bairro, cidade, província"
                  />
                  {errors.shipping_address && (
                    <p className="text-red-500 text-sm mt-1">{errors.shipping_address.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Banco para Pagamento *
                  </label>
                  <select
                    {...register('bank_name')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Selecione um banco</option>
                    <option value="BAI">Banco BAI</option>
                    <option value="Atlantico">Banco Atlântico</option>
                  </select>
                  {errors.bank_name && (
                    <p className="text-red-500 text-sm mt-1">{errors.bank_name.message}</p>
                  )}
                </div>

                {selectedBank && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">
                      Dados para Transferência - {getBankInfo(selectedBank)?.name}
                    </h4>
                    <div className="text-sm text-blue-800 space-y-1">
                      <p><strong>Conta:</strong> {getBankInfo(selectedBank)?.account}</p>
                      <p><strong>IBAN:</strong> {getBankInfo(selectedBank)?.iban}</p>
                      <p><strong>Titular:</strong> {getBankInfo(selectedBank)?.holder}</p>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 transition-colors"
                >
                  Continuar para Pagamento
                </button>
              </form>
            </div>

            {/* Resumo do Pedido */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Resumo do Pedido
              </h3>

              <div className="space-y-4 mb-6">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center space-x-3">
                    <img
                      src={item.product.image_url || '/placeholder-product.jpg'}
                      alt={item.product.name}
                      className="h-12 w-12 object-cover rounded border"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 line-clamp-1">
                        {item.product.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {item.quantity}x {formatPrice(item.product.price)}
                      </p>
                    </div>
                    <span className="text-sm font-semibold">
                      {formatPrice(item.product.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatPrice(getTotalPrice())}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Entrega</span>
                  <span>Grátis</span>
                </div>
                <div className="flex justify-between text-lg font-semibold border-t pt-2">
                  <span>Total</span>
                  <span className="text-green-600">{formatPrice(getTotalPrice())}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Upload do Comprovativo */}
        {currentStep === 2 && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-center mb-6">
                <CreditCard className="mx-auto h-12 w-12 text-green-600 mb-4" />
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  Realizar Pagamento
                </h2>
                <p className="text-gray-600">
                  Faça a transferência bancária e envie o comprovativo
                </p>
              </div>

              {selectedBank && (
                <div className="bg-blue-50 rounded-lg p-6 mb-6">
                  <h3 className="font-semibold text-blue-900 mb-4">
                    Dados para Transferência - {getBankInfo(selectedBank)?.name}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-blue-700 font-medium">Conta:</p>
                      <p className="text-blue-900 font-mono">{getBankInfo(selectedBank)?.account}</p>
                    </div>
                    <div>
                      <p className="text-blue-700 font-medium">IBAN:</p>
                      <p className="text-blue-900 font-mono text-xs">{getBankInfo(selectedBank)?.iban}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-blue-700 font-medium">Titular:</p>
                      <p className="text-blue-900">{getBankInfo(selectedBank)?.holder}</p>
                    </div>
                    <div className="md:col-span-2 bg-blue-100 rounded p-3">
                      <p className="text-blue-700 font-medium">Valor a Transferir:</p>
                      <p className="text-blue-900 text-xl font-bold">{formatPrice(getTotalPrice())}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Enviar Comprovativo de Pagamento
                </h3>
                <p className="text-gray-600 mb-4">
                  Aceitos: PDF, JPG, PNG (máximo 5MB)
                </p>

                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="proof-upload"
                />
                <label
                  htmlFor="proof-upload"
                  className="inline-flex items-center px-6 py-3 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  Escolher Arquivo
                </label>

                {selectedFile && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-900 font-medium">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                )}
                
                <div className="mt-4 flex items-center justify-center space-x-2 text-sm text-yellow-600">
                  <AlertCircle className="h-4 w-4" />
                  <span>
                    Seu pedido será processado após a verificação do comprovativo
                  </span>
                </div>
              </div>

              <div className="mt-6 flex space-x-4">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  Voltar
                </button>
                <button
                  onClick={handleFileUpload}
                  disabled={!selectedFile || uploading}
                  className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {uploading ? 'Enviando...' : 'Enviar Comprovativo'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Confirmação */}
        {currentStep === 3 && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <CheckCircle className="mx-auto h-16 w-16 text-green-600 mb-6" />
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Pedido Enviado com Sucesso!
              </h2>
              <p className="text-gray-600 mb-6">
                Seu comprovativo foi enviado e seu pedido está sendo processado. 
                Você receberá uma confirmação por email quando o pagamento for aprovado.
              </p>
              
              <div className="bg-green-50 rounded-lg p-4 mb-6">
                <p className="text-green-800 font-medium">
                  Número do Pedido: #{orderId.slice(-8).toUpperCase()}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
                <button
                  onClick={() => navigate('/orders')}
                  className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 transition-colors"
                >
                  Ver Meus Pedidos
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  Voltar ao Início
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}