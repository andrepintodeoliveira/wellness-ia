 # Estrutura do Projeto WELLNESS-IA

 Este documento descreve a estrutura de pastas e a localização dos principais arquivos do projeto. Ele será atualizado continuamente à medida que o projeto evolui.

 ```
 wellness-ia/
 ├── .gitignore
 ├── ecosystem.config.js       # Configuração do PM2 para produção
 ├── package.json              # Definições do workspace e dependências da raiz
 ├── package-lock.json
 ├── README.md                 # Documentação principal do projeto
 └── packages/                 # Contém os workspaces do monorepo
     ├── frontend/             # Workspace do Frontend (React)
     │   ├── public/
     │   ├── src/
     │   └── package.json
     │
     └── backend/              # Workspace do Backend (Node.js/Express)
         ├── src/              # (Estrutura a ser confirmada)
         └── package.json
 ```

 ## Descrição dos Diretórios

 - **`/` (raiz)**
   - **`ecosystem.config.js`**: Arquivo de configuração para o PM2, usado para gerenciar e orquestrar os processos do frontend e backend em um ambiente de produção.
   - **`package.json`**: Gerencia os workspaces (`frontend`, `backend`) e as dependências de desenvolvimento da raiz do projeto, como o Biome.

 - **`packages/`**: Diretório que aloja os diferentes projetos (pacotes) do monorepo.
   - **`frontend/`**: Contém todo o código da aplicação cliente, desenvolvida em React com Vite.
   - **`backend/`**: Contém a API e toda a lógica do servidor, desenvolvida em Node.js com Express.