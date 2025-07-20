// backend/src/services/geminiService.js
import { GoogleGenerativeAI } from "@google/generative-ai";

// --- Funções Auxiliares ---
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
		return "00:00";
	const m = Math.floor(seconds / 60);
	const s = Math.floor(seconds % 60);
	return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
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

const generateAdvancedMetrics = (timeSeries) => {
	const defaultMetrics = {
		pacingStrategy: "Dados insuficientes",
		overallDecoupling: "Dados insuficientes",
		cadenceDrop: "Dados insuficientes",
		decouplingFactorsForChart: [],
	};

	if (!timeSeries || timeSeries.length < 20) {
		return defaultMetrics;
	}

	const midPointIndex = Math.floor(timeSeries.length / 2);
	const firstHalf = timeSeries.slice(0, midPointIndex);
	const secondHalf = timeSeries.slice(midPointIndex);

	const avgSpeedFirstHalf =
		firstHalf.reduce((sum, p) => sum + (p.speed || 0), 0) / firstHalf.length;
	const avgSpeedSecondHalf =
		secondHalf.reduce((sum, p) => sum + (p.speed || 0), 0) / secondHalf.length;
	let pacingStrategy = "Split Uniforme";
	if (avgSpeedSecondHalf > avgSpeedFirstHalf * 1.02) {
		pacingStrategy = "Split Negativo (acelerou)";
	} else if (avgSpeedSecondHalf < avgSpeedFirstHalf * 0.98) {
		pacingStrategy = "Split Positivo (desacelerou)";
	}

	const quintileSize = Math.floor(timeSeries.length / 5);
	const decouplingFactors = [];
	const getEfficiencyFactor = (series) => {
		const validPoints = series.filter((p) => p.speed > 0.5 && p.heartRate);
		if (validPoints.length < 10) return 0;
		const avgSpeed =
			validPoints.reduce((sum, p) => sum + p.speed, 0) / validPoints.length;
		const avgHr =
			validPoints.reduce((sum, p) => sum + p.heartRate, 0) / validPoints.length;
		return (avgSpeed * 3.6) / avgHr;
	};

	for (let i = 0; i < 5; i++) {
		const segment = timeSeries.slice(i * quintileSize, (i + 1) * quintileSize);
		decouplingFactors.push({
			name: `${i * 20}%-${(i + 1) * 20}%`,
			"Fator de Eficiência": getEfficiencyFactor(segment).toFixed(3),
		});
	}

	const firstFactor = getEfficiencyFactor(timeSeries.slice(0, quintileSize));
	const lastFactor = getEfficiencyFactor(timeSeries.slice(4 * quintileSize));
	let overallDecoupling = "N/A";
	if (firstFactor > 0) {
		const decoupling = ((firstFactor - lastFactor) / firstFactor) * 100;
		overallDecoupling = `${decoupling.toFixed(1)}% de queda na eficiência`;
	}

	const last20PercentIndex = Math.floor(timeSeries.length * 0.8);
	const lastPortion = timeSeries.slice(last20PercentIndex);
	const avgCadenceFirstHalf =
		firstHalf.reduce((sum, p) => sum + (p.cadence || 0), 0) / firstHalf.length;
	const avgCadenceLastPortion =
		lastPortion.reduce((sum, p) => sum + (p.cadence || 0), 0) /
		lastPortion.length;
	let cadenceDrop = "N/A";
	if (avgCadenceFirstHalf > 0) {
		const drop =
			((avgCadenceFirstHalf - avgCadenceLastPortion) / avgCadenceFirstHalf) *
			100;
		cadenceDrop = `${drop.toFixed(1)}% de queda`;
	}

	return {
		pacingStrategy,
		cadenceDrop,
		decouplingFactorsForChart: decouplingFactors,
		overallDecoupling: overallDecoupling,
	};
};

export const getTrainingAnalysis = async (formData, trainingData) => {
	const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
	const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

	const { profile, context } = formData;
	const { summary } = trainingData;

	const advancedMetrics = generateAdvancedMetrics(trainingData.timeSeries);

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
		? `${formData.context.weatherInfo.temperature}°C, ${formData.context.weatherInfo.humidity}% de umidade`
		: "Não informado";

	const prompt = `
    SYSTEM PROMPT:
    Você é WELLNESS-IA, um Doutor em fisiologia do exercício, especialista em avaliação.
	Sua tarefa é realizar uma análise técnica e de fácil compreensão de uma sessão de treino.
	A resposta DEVE ser em formato Markdown. Analise ESTRITAMENTE os dados fornecidos. NÃO peça informações que já estão no prompt.
	Se uma informação contextual estiver como "Não informado", apenas mencione que essa informação enriqueceria a análise.

    **DADOS DO ATLETA:**
    - Idade: ${calculateAge(profile.birthDate)} anos
    - Sexo: ${profile.sex === "male" ? "Masculino" : "Feminino"}
    - Nível Declarado: ${friendlyLevel}
    - FC de Repouso (FCR): ${profile.hrRest || "N/A"} bpm
    - FC Máxima Teórica (FCMax): ${profile.hrMax || "N/A"} bpm

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
    - Pace Médio: ${formatTime(summary.totalTimeSeconds / (summary.totalDistanceMeters / 1000))} min/km
    - FC Média: ${summary.avgHeartRate || "N/A"} bpm
    - FC Máxima Atingida no Treino: ${summary.maxHeartRate || "N/A"} bpm

    **MÉTRICAS AVANÇADAS DE DESEMPENHO (CALCULADAS):**
    - Estratégia de Ritmo: ${advancedMetrics.pacingStrategy || "N/A"}
    - Desacoplamento Cardiovascular (Eficiência): ${advancedMetrics.overallDecoupling || "N/A"}
    - Queda de Cadência (Fadiga Biomecânica): ${advancedMetrics.cadenceDrop || "N/A"}

    **SUA ANÁLISE (siga esta estrutura):**

    ### 1. Resumo e Estratégia de Ritmo
    Analise o sumário do treino e a "Estratégia de Ritmo". Isso foi apropriado para o "Objetivo do Treino" declarado?

    ### 2. Análise da Carga Cardiovascular e Fadiga
    Com base no "Desacoplamento Cardiovascular", avalie a resistência aeróbica. Uma queda alta na eficiência sugere fadiga ou um ritmo inicial muito forte. A FC Média e Máxima Atingida foram consistentes com esta análise?

    ### 3. Análise Biomecânica e Consistência
    Use a "Queda de Cadência" para inferir sobre a fadiga muscular e a manutenção da forma de corrida.

    ### 4. Avaliação Geral e Recomendações
    Faça uma avaliação geral da carga de treino. Conecte o contexto (sono, percepção de esforço) com as métricas avançadas e forneça 1 ou 2 recomendações acionáveis.
  `;

	try {
		const result = await model.generateContent(prompt);
		const text = result.response.text();
		return {
			analysisText: text,
			decouplingChartData: advancedMetrics.decouplingFactorsForChart,
		};
	} catch (error) {
		console.error("Erro ao chamar a API do Gemini:", error);
		throw new Error("Não foi possível gerar a análise do treino.");
	}
};
