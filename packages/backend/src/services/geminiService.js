// packages/backend/src/services/geminiService.js

import { GoogleGenerativeAI } from "@google/generative-ai";
import { generateAdvancedMetrics } from "./metricsService.js";

// --- Funções Auxiliares de Formatação ---
const calculateAge = (birthDateString) => {
	if (!birthDateString) return "N/A";
	const birthDate = new Date(birthDateString);
	const today = new Date();
	let age = today.getFullYear() - birthDate.getFullYear();
	const m = today.getMonth() - birthDate.getMonth();
	if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
	return age;
};

const formatTime = (seconds) => {
	if (seconds === null || seconds === undefined || isNaN(seconds))
		return "00:00:00";
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const s = Math.floor(seconds % 60);
	return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
};

const formatZoneDistributionForPrompt = (zoneData) => {
	if (!zoneData)
		return "Não foi possível calcular a distribuição de zonas de FC.";
	return zoneData
		.map((z) => `- ${z.zone}: ${z.percentage}% (${z.time} min)`)
		.join("\n\t\t");
};

const formatTrendForPrompt = (trendName, trendData) => {
	if (
		trendData.overall.includes("indisponíveis") ||
		trendData.overall.includes("Estimado")
	) {
		const trendString = trendData.trend.join(" -> ");
		return `- ${trendName}: ${trendData.overall} (Tendência: ${trendString})`;
	}
	const trendString = trendData.trend.join(" -> ");
	return `- ${trendName}: ${trendData.overall} (Tendência: ${trendString})`;
};

const friendlyTextMap = {
	long_slow: "Longo Lento",
	tempo_run: "Tempo Run",
	interval: "Intervalado",
	race: "Prova",
	recovery: "Recuperação",
	tc6m: "Teste de Caminhada de 6 Minutos",
	cooper_test: "Teste de Corrida de 12 Minutos (Cooper)",
	beginner: "Iniciante",
	intermediate: "Intermediário",
	advanced: "Avançado",
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// --- NOVA LÓGICA DE RESILIÊNCIA ---
const callGenerativeAIWithResilience = async (prompt, job) => {
	const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
	const models = [
		{
			name: "gemini-1.5-flash-latest",
			model: genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" }),
		},
		{
			name: "gemini-1.5-pro-latest",
			model: genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" }),
		},
	];

	let lastError = null;

	for (const { name, model } of models) {
		const MAX_ATTEMPTS = 3;
		for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
			try {
				job.message = `Enviando para a IA (${name}, Tentativa ${attempt}/${MAX_ATTEMPTS})...`;
				console.log(
					`[GEMINI_SERVICE] Chamando modelo ${name}, tentativa ${attempt}...`,
				);

				const result = await model.generateContent(prompt);
				return result.response.text(); // Sucesso, retorna o texto imediatamente
			} catch (error) {
				lastError = error;
				// Verifica se o erro é de sobrecarga (503)
				if (error.message && error.message.includes("503")) {
					console.warn(
						`[GEMINI_SERVICE] Modelo ${name} sobrecarregado (503). Tentativa ${attempt} falhou.`,
					);
					if (attempt < MAX_ATTEMPTS) {
						const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
						job.message = `Servidor de IA ocupado. Tentando novamente em ${delay / 1000}s...`;
						await sleep(delay);
					}
				} else {
					// Se for outro tipo de erro (ex: 400 - prompt inválido), não adianta tentar de novo.
					console.error(
						`[GEMINI_SERVICE] Erro não recuperável com o modelo ${name}:`,
						error,
					);
					// Pula para o próximo modelo.
					break;
				}
			}
		}
	}

	// Se todos os modelos e tentativas falharem
	console.error(
		"[GEMINI_SERVICE] Todas as tentativas e modelos de fallback falharam.",
		lastError,
	);
	throw new Error(
		"Os servidores de IA estão enfrentando alta demanda no momento. Por favor, tente novamente mais tarde.",
	);
};

// --- Função Principal de Análise ---
export const getTrainingAnalysis = async (formData, trainingData, job) => {
	const { profile, context } = formData;
	const { summary } = trainingData;

	job.progress = 60;
	job.message = "Calculando métricas avançadas de desempenho...";

	const advancedMetrics = generateAdvancedMetrics(
		trainingData.timeSeries,
		profile,
		job,
	);

	let estimationDisclaimerInstruction = "";
	if (advancedMetrics.isCadenceEstimated) {
		estimationDisclaimerInstruction = `
    **Instrução Adicional Importante:** Na seção 3, ao analisar a técnica, informe ao usuário que os dados de "Cadência" e "Comprimento da Passada" foram **estimados** usando um modelo híbrido (baseado na altura e velocidade do atleta), pois não foram encontrados nos arquivos de treino. Explique que esta é uma estimativa educada que permite uma análise técnica que de outra forma seria impossível, mas que para maior precisão, o ideal é gravar os dados de cadência nativamente no dispositivo.`;
	}

	const friendlyObjective =
		friendlyTextMap[context.trainingObjective] ||
		context.trainingObjective ||
		"Não informado";
	const friendlyLevel =
		friendlyTextMap[context.fitnessLevel] ||
		context.fitnessLevel ||
		"Não informado";
	const sleepQualityText = context.sleepQuality
		? `${context.sleepQuality} de 5`
		: "Não informado";
	const sleepHoursText = context.sleepHours
		? `${context.sleepHours} horas`
		: "Não informado";
	const perceivedEffortText = context.perceivedEffort || "Não informado";
	const satisfactionText = context.satisfaction
		? `${context.satisfaction} de 5`
		: "Não informado";
	const weatherContext = formData.context.weatherInfo
		? `${formData.context.weatherInfo.temperature}°C, ${formData.context.weatherInfo.humidity}% umidade`
		: "Não informado";

	const zoneDistributionText = formatZoneDistributionForPrompt(
		advancedMetrics.zoneDistribution,
	);
	const decouplingText = formatTrendForPrompt(
		"Desacoplamento Cardíaco (Eficiência)",
		advancedMetrics.decoupling,
	);
	const cadenceText = formatTrendForPrompt(
		"Cadência Média (ppm)",
		advancedMetrics.cadence,
	);
	const strideLengthText = formatTrendForPrompt(
		"Comprimento da Passada (m)",
		advancedMetrics.strideLength,
	);

	job.progress = 80;
	// A mensagem de progresso agora é gerenciada pela função de resiliência

	const prompt = `
SYSTEM PROMPT:
Você é WELLNESS-IA, um Doutor em fisiologia do exercício, especialista em avaliação. Seja técnico, mas claro. Use uma linguagem de especialista, mas com vigor, esperança e bom humor. A resposta DEVE ser em formato Markdown e seguir a estrutura solicitada. Analise ESTRITAMENTE os dados fornecidos.

**DADOS DO ATLETA:**
- Idade: ${calculateAge(profile.birthDate)} anos
- Sexo: ${profile.sex === "male" ? "Masculino" : "Feminino"}
- Nível Declarado: ${friendlyLevel}
- FC de Repouso (FCR): ${profile.hrRest || "N/A"} bpm
- FC Máxima de Referência (FCMax): ${profile.hrMax || "N/A"} bpm

**CONTEXTO DA SESSÃO:**
- Objetivo do Treino: ${friendlyObjective}
- Percepção de Esforço (Borg 1-10): ${perceivedEffortText}
- Qualidade do Sono: ${sleepQualityText}
- Duração do Sono: ${sleepHoursText}
- Satisfação com o Treino (1-5): ${satisfactionText}
- Condições Climáticas (Automático): ${weatherContext}

**SUMÁRIO DO TREINO:**
- Duração Total: ${formatTime(summary.totalTimeSeconds)}
- Distância Total: ${(summary.totalDistanceMeters / 1000).toFixed(2)} km
- Pace Médio: ${summary.totalDistanceMeters > 0 ? formatTime(summary.totalTimeSeconds / (summary.totalDistanceMeters / 1000)) : "00:00:00"} min/km
- FC Média: ${summary.avgHeartRate || "N/A"} bpm
- FC Máxima Atingida no Treino: ${summary.maxHeartRate || "N/A"} bpm

**MÉTRICAS AVANÇADAS E KPIs DA SESSÃO:**
*   **Distribuição de Zonas de FC:**
		${zoneDistributionText}
*   **Indicadores de Performance e Fadiga:**
    - Estratégia de Ritmo: ${advancedMetrics.pacingStrategy}
    ${decouplingText}
    ${cadenceText}
    ${strideLengthText}

**SUA ANÁLISE (siga esta estrutura rigorosamente):**

### 1. Análise da Carga e Intensidade
Com base na **Distribuição de Zonas de FC**, avalie se a intensidade foi compatível com o **Objetivo do Treino** declarado.

### 2. Análise da Resistência e Eficiência
Utilize o **Desacoplamento Cardiovascular** para dar um parecer sobre a resistência aeróbica. Use a **Estratégia de Ritmo** para elogiar ou corrigir o gerenciamento de energia.

### 3. Análise da Técnica e Fadiga Muscular
Correlacione a **Cadência** e o **Comprimento da Passada**. Uma cadência estável com queda na passada sugere fadiga dos músculos de impulsão. ${estimationDisclaimerInstruction}

### 4. Conclusão do "Doutor" e Recomendações
Forneça uma avaliação geral com vigor. Entregue 2 dicas práticas e acionáveis baseadas DIRETAMENTE nas métricas analisadas.
`;

	try {
		// A chamada agora usa nossa nova função resiliente
		const text = await callGenerativeAIWithResilience(prompt, job);

		job.progress = 95;
		job.message = "Análise da IA recebida. Finalizando o processo...";

		return {
			analysisText: text,
			advancedMetrics,
		};
	} catch (error) {
		// O erro agora já vem com a mensagem amigável para o usuário
		console.error("Erro final após todas as tentativas:", error);
		throw error;
	}
};
