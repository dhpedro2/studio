# **App Name**: Conta Digital Simples

## Core Features:

- Autenticação de Usuário: Página inicial com formulários de login e cadastro.
- Dashboard do Usuário: Painel do usuário exibindo o saldo atual.
- Transferências: Página para realizar transferências entre contas de usuários.
- Histórico de Transações: Página exibindo o histórico de transações do usuário.

## Style Guidelines:

- Cor primária: Azul (#007BFF) para transmitir confiança e modernidade.
- Cor secundária: Cinza claro (#F8F9FA) para um fundo limpo e profissional.
- Cor de destaque: Verde (#28A745) para indicar sucesso em transações e operações.
- Cor de acento: Laranja (#FFA500) para botões de ação importantes e alertas.
- Design responsivo para funcionar perfeitamente em dispositivos móveis e desktops.
- Ícones claros e modernos para representar diferentes tipos de transações e funcionalidades.

## Original User Request:
Crie um site completo de banco digital com as seguintes funcionalidades:

Páginas:

index.html: Página inicial com login e cadastro.

register.html: Formulário de cadastro de novos usuários.

dashboard.html: Painel do usuário exibindo saldo atual e opções disponíveis.

transfer.html: Página para realizar transferências entre contas.

history.html: Página exibindo o histórico de transações do usuário.

admin.html: Painel administrativo para visualizar usuários, saldos e histórico, além de adicionar ou remover saldo de qualquer conta.

Funcionalidades:

Autenticação: Utilize o Firebase Authentication para login e registro de usuários.

Banco de Dados: Use o Cloud Firestore para armazenar:

Informações dos usuários: nome, e-mail, senha (de forma segura), saldo.

Histórico de transferências: remetente, destinatário, valor, data/hora.

Transferências: Implemente lógica para transferir valores entre contas, atualizando os saldos correspondentes e registrando a transação no histórico.

Administração: Permita que administradores visualizem todos os usuários, seus saldos e históricos, com a capacidade de ajustar saldos conforme necessário.

Design:

Desenvolva um dashboard moderno e responsivo, inspirado nos layouts de bancos digitais contemporâneos.

Utilize componentes visuais elegantes para uma experiência de usuário agradável.

Segurança:

Implemente regras de segurança no Firestore para garantir que os usuários só possam acessar e modificar seus próprios dados.

Proteja as rotas administrativas para que apenas usuários com privilégios de administrador possam acessá-las.

Observações:

O foco é em funcionalidades reais e operacionais, evitando dados fictícios.

Mantenha a complexidade gerenciável, utilizando operações básicas de adição e subtração para manipulação de saldos.

Certifique-se de que todas as interações com o banco de dados sejam seguras e eficientes.

minhs credenciais da firebase: apiKey: "AIzaSyBNjKB65JN5GoHvG75rG9zaeKAtkDJilxA", authDomain: "bank-dh.firebaseapp.com", projectId: "bank-dh", storageBucket: "bank-dh.firebasestorage.app", messagingSenderId: "370634468884", appId: "1:370634468884:web:4a00ea2f9757051cda4101", measurementId: "G-JPFXDJBSGM"

quero o site totalmente em portugues, e faça QUE GERE NO FIRESTORE
  