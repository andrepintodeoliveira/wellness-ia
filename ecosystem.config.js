// ecosystem.config.js
// Configuração do PM2 para o backend e frontend do projeto Wellness IA
// Certifique-se de que o PM2 esteja instalado globalmente: npm install -g pm2
// Para iniciar o PM2 com esta configuração, use: pm2 start ecosystem.config.js
// pm2 list: Mostra o status de todas as aplicações.
// pm2 logs: Exibe os logs em tempo real.
// pm2 restart all: Reinicia todas as aplicações.
// pm2 stop all: Para todas as aplicações.
// Para ver os logs, use: pm2 logs
// Para parar todos os processos, use: pm2 stop all
// pm2 start ecosystem.config.js
// Para reiniciar todos os processos, use: pm2 restart all
// Para deletar todos os processos, use: pm2 delete all
// Para verificar o status dos processos, use: pm2 status
// Para monitorar os processos, use: pm2 monit
// Para salvar a configuração atual, use: pm2 save
// Para carregar a configuração salva após reiniciar o servidor, use: pm2 resurrect
// Para ver a documentação do PM2, acesse: https://pm2.keymetrics.io/docs/usage/quick-start/

module.exports = {
	apps: [
		{
			name: "wellness-ia-backend",
			script: "./backend/index.js", // Altere para o arquivo de entrada do seu backend se for diferente
			watch: true, // Opcional: reinicia automaticamente em caso de mudanças nos arquivos
			env: {
				NODE_ENV: "production",
			},
		},
		{
			name: "wellness-ia-frontend",
			script: "serve", // Usaremos o pacote 'serve' para o frontend
			env: {
				PM2_SERVE_PATH: "./frontend/build", // Pasta onde a versão de produção do React fica
				PM2_SERVE_PORT: 3000,
				PM2_SERVE_SPA: "true", // Essencial para apps React (Single Page Application)
				PM2_SERVE_HOMEPAGE: "/index.html",
			},
		},
	],
};
