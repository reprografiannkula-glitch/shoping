# 🛍️ LojaAngola - E-commerce para Angola

Uma plataforma de e-commerce moderna e otimizada para o mercado angolano, com foco em simplicidade, responsividade e compatibilidade com internet limitada.

## 🌟 Características Principais

### 🛒 Funcionalidades do Cliente
- **Catálogo de Produtos**: Navegação por categorias com filtros avançados
- **Busca Inteligente**: Pesquisa por nome e descrição de produtos
- **Carrinho Persistente**: Carrinho salvo entre sessões
- **Lista de Desejos**: Favoritação de produtos
- **Checkout Simplificado**: Processo otimizado em 3 etapas
- **Upload de Comprovativo**: Envio seguro de comprovativo bancário

### 💳 Sistema de Pagamento
- **Transferência Bancária**: Integração com BAI e Atlântico
- **Dados Bancários**:
  - BAI: 237770124.10.001 (IBAN: AO06 0040.0000.3777.0124.1012.6)
  - Atlântico: 31390641610001 (IBAN: AO06 0055.0000.1390.6416.1610.113)
- **Aprovação Manual**: Sistema de verificação de comprovativos

### 🔐 Autenticação e Segurança
- Registro por email com validação
- Login seguro com Supabase Auth
- Políticas RLS (Row Level Security)
- Upload de arquivos validado (máx. 5MB)

### 📱 Design Responsivo
- **Mobile-First**: Otimizado para smartphones
- **Conexão Lenta**: Funciona bem com 3G/4G
- **Interface Limpa**: Design minimalista e intuitivo
- **Acessibilidade**: Foco em usabilidade

## 🛠️ Tecnologias Utilizadas

### Frontend
- **React 18** com TypeScript
- **Tailwind CSS** para estilização
- **React Router** para navegação
- **React Hook Form** + Yup para formulários
- **Framer Motion** para animações
- **Lucide React** para ícones

### Backend
- **Supabase** (Database, Auth, Storage)
- **PostgreSQL** com RLS
- **File Upload** para comprovativos

### Deploy e Performance
- **Vite** para build otimizado
- **Lazy Loading** de imagens
- **Compressão de assets**
- **Cache Strategy** para performance

## 🚀 Instalação e Configuração

### Pré-requisitos
- Node.js 18+ 
- Conta Supabase

### 1. Clone o repositório
```bash
git clone https://github.com/seu-usuario/loja-angola.git
cd loja-angola
```

### 2. Instale dependências
```bash
npm install
```

### 3. Configure o Supabase
1. Acesse [Supabase](https://supabase.com) e crie um projeto
2. Clique no botão "Connect to Supabase" no topo direito da interface
3. As variáveis de ambiente serão configuradas automaticamente

### 4. Execute as migrações
As migrações do banco de dados estão em `supabase/migrations/` e serão executadas automaticamente quando você conectar ao Supabase.

### 5. Inicie o servidor de desenvolvimento
```bash
npm run dev
```

## 📊 Estrutura do Banco de Dados

### Tabelas Principais
- `categories` - Categorias de produtos
- `products` - Catálogo de produtos
- `cart_items` - Itens do carrinho
- `wishlist` - Lista de desejos
- `orders` - Pedidos dos clientes
- `order_items` - Itens dos pedidos
- `payment_proofs` - Comprovativos de pagamento
- `admin_users` - Usuários administradores

### Políticas de Segurança (RLS)
- Usuários só acessam seus próprios dados
- Produtos e categorias são públicos
- Administradores têm acesso total
- Uploads validados e seguros

## 🎯 Dados de Teste

O sistema inclui dados de exemplo:
- **4 Categorias**: Eletrônicos, Roupas, Casa e Jardim, Beleza
- **6 Produtos**: Smartphone, Laptop, Camisa, Vestido, Mesa, Perfume
- **Preços em AOA**: Valores adaptados ao mercado angolano

## 📱 Funcionalidades por Tela

### 🏠 Página Inicial
- Hero section com call-to-action
- Categorias em destaque
- Produtos mais recentes
- Informações bancárias

### 🛍️ Catálogo de Produtos
- Grid responsivo de produtos
- Filtros por categoria e preço
- Ordenação por diferentes critérios
- Busca em tempo real

### 🛒 Carrinho de Compras
- Lista de produtos selecionados
- Controles de quantidade
- Cálculo automático de totais
- Botões de ação (remover, atualizar)

### 💳 Checkout
- **Etapa 1**: Dados do cliente e entrega
- **Etapa 2**: Dados bancários e upload de comprovativo
- **Etapa 3**: Confirmação do pedido

### 🔐 Autenticação
- Login com email/senha
- Registro com validação
- Recuperação de senha
- Perfil do usuário

## 🌐 Compatibilidade e Performance

### Navegadores Suportados
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Navegadores móveis modernos

### Otimizações
- **Lazy Loading**: Imagens carregadas sob demanda
- **Code Splitting**: JavaScript otimizado
- **Compressão**: Assets minificados
- **Cache**: Estratégias de cache inteligente

### Performance
- **First Paint**: < 1.5s
- **Interactive**: < 3s
- **Bundle Size**: < 500KB (gzipped)
- **Suporte**: Até 1.000 usuários simultâneos

## 🛡️ Segurança

### Medidas Implementadas
- **RLS**: Row Level Security no Supabase
- **Validação**: Input validation em formulários
- **Sanitização**: XSS protection
- **Upload Seguro**: Validação de tipos e tamanhos
- **HTTPS**: Conexões criptografadas

### Upload de Arquivos
- **Tipos Aceitos**: PDF, JPG, PNG
- **Tamanho Máximo**: 5MB
- **Validação**: Client-side e server-side
- **Storage**: Supabase Storage com URLs assinadas

## 🚀 Deploy

### Netlify (Recomendado)
```bash
npm run build
```
Conecte seu repositório ao Netlify para deploy automático.

### Variáveis de Ambiente
Defina no painel do provedor:
```
VITE_SUPABASE_URL=sua-url-supabase
VITE_SUPABASE_ANON_KEY=sua-chave-anonima
```

## 📞 Suporte e Contato

### Informações de Contato
- **Email**: info@lojaangola.ao
- **Telefone**: +244 900 000 000
- **Endereço**: Luanda, Angola - Rua Principal, 123

### Bancos Parceiros
- **Banco BAI**: Transferências aceitas
- **Banco Atlântico**: Transferências aceitas

## 📄 Licença

Este projeto está licenciado sob a MIT License. Veja o arquivo `LICENSE` para mais detalhes.

## 🤝 Contribuições

Contribuições são bem-vindas! Por favor:
1. Faça um fork do projeto
2. Crie uma branch para sua feature
3. Faça commit das mudanças
4. Abra um Pull Request

## 📈 Roadmap Futuro

### Próximas Features
- [ ] Unitel Money integration
- [ ] Sistema de reviews
- [ ] Programa de fidelidade
- [ ] Chat de suporte
- [ ] Notificações push
- [ ] App móvel (React Native)

### Melhorias Planejadas
- [ ] Dashboard de analytics
- [ ] Sistema de cupons
- [ ] Integração com redes sociais
- [ ] Multi-idioma (português/inglês)
- [ ] Sistema de afiliados

---

**Desenvolvido com ❤️ para o mercado angolano**