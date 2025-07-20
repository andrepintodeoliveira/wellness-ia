// TPhysio-Analyzer-Backend/src/routes/analyzeRoute.js
import { Router } from "express";
import { getTrainingAnalysis } from "../services/geminiService.js";
import { enrichTrainingData } from "../services/enrichmentService.js";

const router = Router();

router.post("/analyze", async (req, res) => {
	console.log("\n--- Nova Solicitação de Análise Recebida ---");
	try {
		let { formData, trainingData } = req.body;

		if (!formData || !trainingData) {
			console.error(
				"[ERRO] Dados do formulário ou do treino estão faltando na requisição.",
			);
			return res
				.status(400)
				.json({ error: "Dados do formulário ou do treino estão faltando." });
		}
		console.log("[ETAPA 1/4] Dados recebidos do frontend com sucesso.");

		console.log(
			"[ETAPA 2/4] Iniciando enriquecimento de dados (clima e elevação)...",
		);
		const { enrichedTimeSeries, weatherInfo } = await enrichTrainingData(
			trainingData.timeSeries,
		);
		console.log("[ETAPA 2/4] Enriquecimento de dados concluído.");

		trainingData.timeSeries = enrichedTimeSeries;
		formData.context.weatherInfo = weatherInfo;

		console.log("[ETAPA 3/4] Solicitando análise ao serviço Gemini...");
		const analysisResult = await getTrainingAnalysis(formData, trainingData);
		console.log("[ETAPA 3/4] Análise do Gemini recebida com sucesso.");

		const finalResponse = {
			analysisText: analysisResult.analysisText,
			decouplingChartData: analysisResult.decouplingChartData,
			enrichedTimeSeries: trainingData.timeSeries,
			weatherInfo: weatherInfo,
		};

		console.log("[ETAPA 4/4] Enviando resposta completa para o frontend.");
		res.json(finalResponse);
		console.log("--- Solicitação Concluída com Sucesso ---\n");
	} catch (error) {
		console.error("[ERRO FATAL] Ocorreu um erro no endpoint /analyze:", error);
		res
			.status(500)
			.json({ error: error.message || "Ocorreu um erro interno no servidor." });
		console.log("--- Solicitação Finalizada com Erro ---\n");
	}
});

export default router;
