// TPhysio-Analyzer-Backend/src/services/JobManager.js
import { getTrainingAnalysis } from "./geminiService.js";
import { enrichTrainingData } from "./enrichmentService.js";

// Usaremos um Map para armazenar os jobs em memória.
// Em uma aplicação de produção maior, isso seria substituído por um banco de dados como Redis.
const jobs = new Map();

export const jobManager = {
	/**
	 * Cria e inicia um novo job de análise.
	 * @param {string} jobId - O ID único para o novo job.
	 * @param {object} initialData - Contém formData e trainingData.
	 */
	createJob: (jobId, initialData) => {
		const job = {
			id: jobId,
			status: "iniciando",
			progress: 0,
			message: "Job iniciado. Aguardando processamento...",
			result: null,
			error: null,
			isCancelled: false, // Flag para controle de cancelamento
		};
		jobs.set(jobId, job);

		// Inicia o processamento em segundo plano (sem await)
		processJob(jobId, initialData);

		return job;
	},

	/**
	 * Obtém o status de um job existente.
	 * @param {string} jobId - O ID do job a ser verificado.
	 * @returns {object | undefined} O objeto do job ou undefined se não for encontrado.
	 */
	getJob: (jobId) => {
		return jobs.get(jobId);
	},

	/**
	 * Cancela um job em andamento.
	 * @param {string} jobId - O ID do job a ser cancelado.
	 */
	cancelJob: (jobId) => {
		const job = jobs.get(jobId);
		if (job && job.status !== "concluido" && job.status !== "falhou") {
			job.isCancelled = true;
			job.status = "cancelado";
			job.message = "Job cancelado pelo usuário.";
			console.log(`[JOB CANCELADO] Job ${jobId} foi cancelado.`);
			// Em uma implementação mais complexa, poderíamos usar AbortController aqui.
			// Por enquanto, o processo irá parar na próxima verificação do `isCancelled`.
		}
	},
};

/**
 * A função principal que executa as tarefas do job.
 * @param {string} jobId - O ID do job a ser processado.
 * @param {object} initialData - Os dados do treino.
 */
async function processJob(jobId, initialData) {
	const job = jobs.get(jobId);
	if (!job) return;

	try {
		// ETAPA 1: Enriquecimento de Dados
		job.status = "processando";
		job.progress = 10;
		job.message = "Iniciando enriquecimento de dados (clima e elevação)...";

		// Modificamos a chamada para passar o job, para que ele possa ser cancelado
		const { enrichedTimeSeries, weatherInfo } = await enrichTrainingData(
			initialData.trainingData.timeSeries,
			job,
		);
		if (job.isCancelled) return; // Verifica se foi cancelado durante o enriquecimento

		initialData.trainingData.timeSeries = enrichedTimeSeries;
		initialData.formData.context.weatherInfo = weatherInfo;

		job.progress = 60;
		job.message = "Dados enriquecidos. Solicitando análise da IA...";

		// ETAPA 2: Análise do Gemini
		const analysisResult = await getTrainingAnalysis(
			initialData.formData,
			initialData.trainingData,
		);
		if (job.isCancelled) return; // Verifica se foi cancelado

		job.progress = 100;
		job.status = "concluido";
		job.message = "Análise concluída com sucesso!";
		job.result = {
			// Armazena o payload final
			analysisText: analysisResult.analysisText,
			decouplingChartData: analysisResult.decouplingChartData,
			enrichedTimeSeries: initialData.trainingData.timeSeries,
			weatherInfo: weatherInfo,
		};

		console.log(`[JOB CONCLUÍDO] Job ${jobId} finalizado com sucesso.`);
	} catch (error) {
		console.error(`[ERRO NO JOB] Job ${jobId} falhou:`, error);
		job.status = "falhou";
		job.message = "Ocorreu um erro durante o processamento.";
		job.error = error.message;
	}
}
