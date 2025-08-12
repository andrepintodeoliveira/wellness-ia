// packages/frontend/src/lib/types.ts

/**
 * Perfil do atleta. Campos que podem estar vazios são tipados como `| null`.
 */
export interface AthleteProfile {
	birthDate: string | null;
	sex: "male" | "female" | null;
	height: number | null;
	weight: number | null;
	hrRest: number | null;
	hrMax: number | null;
}

/**
 * Contexto do treino. Campos que podem estar vazios são tipados como `| null`.
 */
export interface TrainingContext {
	trainingObjective: string | null;
	fitnessLevel: string | null;
	weatherTemperature: number | null;
	weatherHumidity: number | null;
	sleepQuality: number | null;
	perceivedEffort: number | null;
	satisfaction: number | null;
	sleepHours: number | null;
}

/**
 * Representa um único ponto de dados no tempo, após a unificação.
 * Todas as unidades são padronizadas para o S.I. (metros, segundos).
 */
export interface UnifiedDataPoint {
	timestamp: number;
	latitude?: number;
	longitude?: number;
	distance?: number;
	heartRate?: number;
	speed?: number;
	cadence?: number;
	power?: number;
	altitude?: number;
	grade?: number;
}

/**
 * Estrutura para os dados de sumário de um treino.
 */
export type TrainingSummary = {
	totalTimeSeconds: number;
	totalDistanceMeters: number;
	calories: number;
	avgSpeed?: number;
	maxSpeed?: number;
	avgHeartRate?: number;
	maxHeartRate?: number;
	vo2max?: number;
};

/**
 * Estrutura de dados que armazena todos os dados de um treino.
 */
export interface TrainingData {
	summary: TrainingSummary;
	timeSeries: UnifiedDataPoint[];
}

/**
 * Representa o objeto de métricas chave calculado pelo backend.
 */
export interface AnalysisKeyMetrics {
	pacingStrategy: string;
	decoupling: {
		trend: { name: string; "Fator de Eficiência": number }[];
		overall: string;
	};
	strideLength: {
		trend: string[];
		overall: string;
	};
	cadence: {
		trend: string[];
		overall: string;
	};
	zoneDistribution:
		| {
				zone: string;
				percentage: string;
				time: string;
				minBpm: number; // NOVO CAMPO
				maxBpm: number; // NOVO CAMPO
		  }[]
		| null;
	isCadenceEstimated: boolean;
	elevation: {
		gain: number;
		loss: number;
	} | null;
	trainingLoad: number | null;
}
