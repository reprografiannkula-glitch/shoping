import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Phone, Mail, MapPin } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo e Descrição */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <ShoppingCart className="h-8 w-8 text-green-400" />
              <span className="text-xl font-bold">LojaAngola</span>
            </div>
            <p className="text-gray-300 mb-4 max-w-md">
              A sua loja online de confiança em Angola. Oferecemos produtos de qualidade 
              com entrega rápida e pagamento seguro via transferência bancária.
            </p>
            <div className="flex space-x-4">
              <div className="bg-gray-800 p-3 rounded-lg">
                <h4 className="font-semibold text-sm mb-2">BAI</h4>
                <p className="text-xs text-gray-300">237770124.10.001</p>
              </div>
              <div className="bg-gray-800 p-3 rounded-lg">
                <h4 className="font-semibold text-sm mb-2">Atlântico</h4>
                <p className="text-xs text-gray-300">31390641610001</p>
              </div>
            </div>
          </div>

          {/* Links Rápidos */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Links Rápidos</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-gray-300 hover:text-green-400 transition-colors">
                  Início
                </Link>
              </li>
              <li>
                <Link to="/products" className="text-gray-300 hover:text-green-400 transition-colors">
                  Produtos
                </Link>
              </li>
              <li>
                <Link to="/cart" className="text-gray-300 hover:text-green-400 transition-colors">
                  Carrinho
                </Link>
              </li>
              <li>
                <Link to="/orders" className="text-gray-300 hover:text-green-400 transition-colors">
                  Meus Pedidos
                </Link>
              </li>
            </ul>
          </div>

          {/* Contacto */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contacto</h3>
            <ul className="space-y-3">
              <li className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-green-400" />
                <span className="text-gray-300">+244 900 000 000</span>
              </li>
              <li className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-green-400" />
                <span className="text-gray-300">info@lojaangola.ao</span>
              </li>
              <li className="flex items-start space-x-3">
                <MapPin className="h-5 w-5 text-green-400 mt-0.5" />
                <span className="text-gray-300">
                  Luanda, Angola<br />
                  Rua Principal, 123
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-300 text-sm">
              © 2025 LojaAngola. Todos os direitos reservados.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link to="/privacy" className="text-gray-300 hover:text-green-400 text-sm transition-colors">
                Política de Privacidade
              </Link>
              <Link to="/terms" className="text-gray-300 hover:text-green-400 text-sm transition-colors">
                Termos de Uso
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}