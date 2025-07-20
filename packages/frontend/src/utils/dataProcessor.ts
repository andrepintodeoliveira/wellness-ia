// src/utils/dataProcessor.ts
import { TrainingData, UnifiedDataPoint } from "@/lib/types";
import { parseCSV, parseCSVStartTime } from "./parsers";
import { parseTCX } from "./parsers";
import { parseGPX } from "./parsers";

/**
 * Mescla de forma inteligente um objeto 'source' em um 'target'.
 * Apenas adiciona/sobrescreve propriedades do 'source' se elas não forem nulas ou indefinidas e não forem NaN.
 * @param {object} target - O objeto base.
 * @param {object} source - O objeto com os novos dados.
 * @returns {object} O objeto mesclado.
 */
const intelligentMerge = (
	target: Partial<UnifiedDataPoint>,
	source: Partial<UnifiedDataPoint>,
): Partial<UnifiedDataPoint> => {
	const merged = { ...target };

	for (const key in source) {
		if (Object.prototype.hasOwnProperty.call(source, key)) {
			const sourceValue = source[key as keyof UnifiedDataPoint];

			// A condição crucial: só adiciona se o valor for útil.
			// Para números, também checa se não é NaN.
			if (sourceValue !== null && sourceValue !== undefined) {
				if (typeof sourceValue === "number" && !isNaN(sourceValue)) {
					merged[key as keyof UnifiedDataPoint] = sourceValue;
				} else if (typeof sourceValue !== "number") {
					merged[key as keyof UnifiedDataPoint] = sourceValue;
				}
			}
		}
	}
	return merged;
};

export const processAndUnifyFiles = async (
	files: File[],
): Promise<TrainingData> => {
	const csvFile = files.find((f) => f.name.toLowerCase().endsWith(".csv"));
	const tcxFile = files.find((f) => f.name.toLowerCase().endsWith(".tcx"));
	const gpxFile = files.find((f) => f.name.toLowerCase().endsWith(".gpx"));

	if (!csvFile && !tcxFile) {
		throw new Error(
			"É necessário fornecer um arquivo .csv ou .tcx como base para os dados.",
		);
	}

	const csvData = csvFile ? await parseCSV(csvFile) : undefined;
	const tcxData = tcxFile ? await parseTCX(tcxFile) : undefined;
	const gpxData = gpxFile ? await parseGPX(gpxFile) : undefined;

	const unifiedSummary: TrainingData["summary"] = {
		...gpxData?.summary,
		...tcxData?.summary,
		...csvData?.summary,
	};

	const dataMap = new Map<number, Partial<UnifiedDataPoint>>();

	const processSeries = (series: UnifiedDataPoint[] | undefined) => {
		if (!series) return;
		series.forEach((point) => {
			const key = Math.round(point.timestamp / 1000);
			const existingPoint = dataMap.get(key) || { timestamp: point.timestamp };
			const mergedPoint = intelligentMerge(existingPoint, point);
			dataMap.set(key, mergedPoint);
		});
	};

	// Processa todas as séries de dados. A ordem não importa mais.
	processSeries(gpxData?.timeSeries);
	processSeries(tcxData?.timeSeries);
	processSeries(csvData?.timeSeries);

	const unifiedTimeSeries = Array.from(dataMap.values())
		.filter((p) => p.timestamp && p.latitude && p.longitude) // Garante que temos os dados essenciais
		.sort((a, b) => a.timestamp! - b.timestamp!) as UnifiedDataPoint[];

	return { summary: unifiedSummary, timeSeries: unifiedTimeSeries };
};
