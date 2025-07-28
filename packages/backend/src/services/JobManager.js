// packages/backend/src/services/JobManager.js

import { enrichTrainingData } from "./enrichmentService.js";
import { getTrainingAnalysis } from "./geminiService.js";

// Usaremos um Map para armazenar os jobs em memória.
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
			message: "Job criado. Preparando para iniciar a análise...",
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
		job.progress = 5;
		job.message = "Iniciando processo de análise...";

		// ETAPA 1: Enriquecimento de Dados
		const { enrichedTimeSeries, weatherInfo } = await enrichTrainingData(
			initialData.trainingData.timeSeries,
			job, // Passa o job para que ele possa ser atualizado internamente
		);
		if (job.isCancelled) return;

		initialData.trainingData.timeSeries = enrichedTimeSeries;
		initialData.formData.context.weatherInfo = weatherInfo;

		// ETAPA 2: Análise do Gemini
		const analysisResult = await getTrainingAnalysis(
			initialData.formData,
			initialData.trainingData,
			job, // Passa o job para a próxima etapa
		);
		if (job.isCancelled) return;

		// ETAPA 3: Salvar o resultado completo
		job.progress = 100;
		job.status = "concluido";
		job.message = "Análise concluída com sucesso!";

		job.result = {
			analysisText: analysisResult.analysisText,
			keyMetrics: analysisResult.advancedMetrics,
			enrichedTimeSeries: initialData.trainingData.timeSeries,
			weatherInfo: weatherInfo,
			summary: initialData.trainingData.summary,
		};

		console.log(`[JOB CONCLUÍDO] Job ${jobId} finalizado com sucesso.`);
	} catch (error) {
		console.error(`[ERRO NO JOB] Job ${jobId} falhou:`, error);
		job.status = "falhou";
		job.message = "Ocorreu um erro durante o processamento.";
		job.error = error.message;
	}
}
