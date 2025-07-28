 # WELLNESS-IA

 ## 🎯 Sobre o Projeto

 O **WELLNESS-IA** é uma ferramenta de ponta para análise e avaliação de dados de exercícios e testes físicos. Utilizando uma abordagem monorepo, o projeto integra um backend robusto para processamento de dados e um frontend moderno e reativo para visualização e interação.

 ---

 ## 🛠️ Tecnologias e Padrões

 Este projeto utiliza uma arquitetura monorepo gerenciada com [npm workspaces](https://docs.npmjs.com/cli/v7/using-npm/workspaces).

 ### Frontend (`/packages/frontend`)

 *   **Framework:** React
 *   **Build Tool:** Vite
 *   **Linguagem:** TypeScript
 *   **Estilização:** TailwindCSS
 *   **Componentes de UI:** Radix UI (para componentes acessíveis e sem estilo) e Lucide React (para ícones).
 *   **Roteamento:** React Router
 *   **Gráficos:** Recharts
 *   **Manipulação de Arquivos:** React Dropzone e Papaparse

 ### Backend (`/packages/backend`)

 *   **Framework:** Express.js
 *   **Linguagem:** JavaScript (Node.js)
 *   **IA Generativa:** Google AI SDK
 *   **Comunicação:** CORS para permissões de API.
 *   **Variáveis de Ambiente:** Dotenv

 ### Ferramentas de Desenvolvimento (Workspace)

 *   **Qualidade de Código:** Biome para formatação e linting.
 *   **Gerenciador de Processos:** PM2 (configurado em `ecosystem.config.js`).

 ---

 ## 🚀 Setup e Instalação

 1.  **Clonar o repositório:**
     ```bash
     git clone <URL_DO_REPOSITORIO>
     cd wellness-ia
     ```

 2.  **Instalar as dependências:**
     O projeto é um monorepo. Instale todas as dependências do `frontend` e `backend` a partir da raiz.
     ```bash
     npm install
     ```

 3.  **Configurar Variáveis de Ambiente:**
     - Crie um arquivo `.env` dentro de `/packages/backend`.
     - Adicione as variáveis necessárias, como a `API_KEY` para o Google AI.
     ```env
     # /packages/backend/.env
     API_KEY="SUA_API_KEY_AQUI"
     PORT=3001
     ```

 4.  **Executar em Modo de Desenvolvimento:**
     Para iniciar ambos os serviços (frontend e backend) simultaneamente, você pode configurar um script na raiz ou executá-los em terminais separados:

     *   **Terminal 1 (Backend):**
         ```bash
         npm run start --workspace=backend
         ```

     *   **Terminal 2 (Frontend):**
         ```bash
         npm run dev --workspace=frontend
         ```

 5.  **Build para Produção:**
     Para gerar as versões de produção, execute o seguinte comando na raiz do projeto:
     ```bash
     # Para o frontend (gerará a pasta /packages/frontend/dist)
     npm run build --workspace=frontend

     # O backend não necessita de um passo de build explícito neste setup.
     ```