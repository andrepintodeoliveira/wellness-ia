// packages/frontend/src/utils/dataProcessor.ts

import { TrainingData, UnifiedDataPoint } from "@/lib/types";
import { parseCSV } from "./parsers";
import { parseTCX } from "./parsers";
import { parseGPX } from "./parsers";

/**
 * Mescla de forma inteligente um objeto 'source' em um 'target',
 * priorizando valores válidos (não nulos, indefinidos ou NaN).
 */
const intelligentMerge = (
	target: Partial<UnifiedDataPoint>,
	source: Partial<UnifiedDataPoint>,
): Partial<UnifiedDataPoint> => {
	const merged = { ...target };
	for (const key in source) {
		if (Object.prototype.hasOwnProperty.call(source, key)) {
			const sourceValue = source[key as keyof UnifiedDataPoint];
			if (sourceValue !== null && sourceValue !== undefined) {
				if (typeof sourceValue === "number" && !isNaN(sourceValue)) {
					// Não sobrescrever um valor válido com zero.
					if (
						sourceValue !== 0 ||
						merged[key as keyof UnifiedDataPoint] === undefined
					) {
						merged[key as keyof UnifiedDataPoint] = sourceValue;
					}
				} else if (typeof sourceValue !== "number") {
					merged[key as keyof UnifiedDataPoint] = sourceValue;
				}
			}
		}
	}
	return merged;
};

/**
 * Itera sobre a série temporal para calcular métricas derivadas usando
 * uma janela de média móvel para suavizar os dados e obter valores realistas.
 * @param timeSeries - A série temporal unificada e ordenada.
 * @param windowSize - O tamanho da janela em segundos para a média móvel.
 * @returns A série temporal enriquecida.
 */
const calculateMovingAverageMetrics = (
	timeSeries: UnifiedDataPoint[],
	windowSize: number = 5, // Janela de 5 segundos
): UnifiedDataPoint[] => {
	console.log(
		`[DATA_PROCESSOR] Iniciando cálculo com Média Móvel (janela de ${windowSize}s)...`,
	);
	if (timeSeries.length < windowSize) return timeSeries;

	return timeSeries.map((currentPoint, index, arr) => {
		const start = Math.max(0, index - windowSize + 1);
		const end = index + 1;
		const windowArr = arr.slice(start, end);

		const firstPointInWindow = windowArr[0];
		const lastPointInWindow = windowArr[windowArr.length - 1];

		const deltaTime =
			(lastPointInWindow.timestamp - firstPointInWindow.timestamp) / 1000;
		const deltaDistance =
			(lastPointInWindow.distance || 0) - (firstPointInWindow.distance || 0);
		const deltaAltitude =
			(lastPointInWindow.altitude || 0) - (firstPointInWindow.altitude || 0);

		const smoothedSpeed = deltaTime > 0 ? deltaDistance / deltaTime : 0;
		const smoothedGrade =
			deltaDistance > 0 ? (deltaAltitude / deltaDistance) * 100 : 0;
		const cadence = currentPoint.cadence;

		return {
			...currentPoint,
			speed: parseFloat(Math.max(0, smoothedSpeed).toFixed(2)),
			grade: parseFloat(smoothedGrade.toFixed(2)),
			cadence: cadence,
		};
	});
};

/**
 * Processa os arquivos de treino brutos, unifica-os, e enriquece a série temporal.
 * @param files - Um array de arquivos (CSV, TCX, GPX).
 * @returns Uma Promise que resolve com o objeto TrainingData completo e enriquecido.
 */
export const processAndUnifyFiles = async (
	files: File[],
): Promise<TrainingData> => {
	console.log(
		"[DATA_PROCESSOR] Iniciando processamento e unificação de arquivos...",
	);

	const csvFile = files.find((f) => f.name.toLowerCase().endsWith(".csv"));
	const tcxFile = files.find((f) => f.name.toLowerCase().endsWith(".tcx"));
	const gpxFile = files.find((f) => f.name.toLowerCase().endsWith(".gpx"));

	if (!csvFile && !tcxFile && !gpxFile) {
		throw new Error(
			"É necessário fornecer pelo menos um arquivo (.csv, .tcx, ou .gpx).",
		);
	}

	console.log("[DATA_PROCESSOR] Arquivos encontrados:", {
		csv: !!csvFile,
		tcx: !!tcxFile,
		gpx: !!gpxFile,
	});

	try {
		const [csvData, tcxData, gpxData] = await Promise.all([
			csvFile ? parseCSV(csvFile) : Promise.resolve(undefined),
			tcxFile ? parseTCX(tcxFile) : Promise.resolve(undefined),
			gpxFile ? parseGPX(gpxFile) : Promise.resolve(undefined),
		]);

		const dataMap = new Map<number, Partial<UnifiedDataPoint>>();

		const processSeries = (series: UnifiedDataPoint[] | undefined) => {
			if (!series) return;
			series.forEach((point) => {
				const key = Math.round(point.timestamp / 1000);
				const existingPoint = dataMap.get(key) || {
					timestamp: point.timestamp,
				};
				dataMap.set(key, intelligentMerge(existingPoint, point));
			});
		};

		processSeries(tcxData?.timeSeries);
		processSeries(csvData?.timeSeries);
		processSeries(gpxData?.timeSeries);

		console.log(
			`[DATA_PROCESSOR] Unificação concluída. ${dataMap.size} pontos de dados únicos encontrados.`,
		);

		const unifiedTimeSeries = Array.from(dataMap.values())
			.filter(
				(p): p is UnifiedDataPoint =>
					!!(
						p.timestamp &&
						p.latitude &&
						p.longitude &&
						p.distance !== undefined
					),
			)
			.sort((a, b) => a.timestamp! - b.timestamp!);

		console.log(
			`--- [DEBUG] SÉRIE TEMPORAL UNIFICADA (ANTES DO ENRIQUECIMENTO) ---`,
		);
		console.log(` -> Total de Pontos Unificados: ${unifiedTimeSeries.length}`);
		if (unifiedTimeSeries.length > 0) {
			console.log(
				" -> Exemplo do PRIMEIRO ponto unificado:",
				unifiedTimeSeries[0],
			);
			console.log(
				" -> Exemplo do ÚLTIMO ponto unificado:",
				unifiedTimeSeries[unifiedTimeSeries.length - 1],
			);
		}
		console.log("---------------------------------------------------------");

		const finalEnrichedTimeSeries =
			calculateMovingAverageMetrics(unifiedTimeSeries);

		const unifiedSummary: TrainingData["summary"] = {
			...gpxData?.summary,
			...tcxData?.summary,
			...csvData?.summary,
		};

		console.log(
			`[DATA_PROCESSOR] Processamento finalizado. Exemplo do primeiro ponto final:`,
			finalEnrichedTimeSeries.length > 0 ? finalEnrichedTimeSeries[0] : "N/A",
		);
		console.log(
			`[DATA_PROCESSOR] finalEnrichedTimeSeries:`,
			finalEnrichedTimeSeries.length > 0 ? finalEnrichedTimeSeries : "N/A",
		);

		return { summary: unifiedSummary, timeSeries: finalEnrichedTimeSeries };
	} catch (error) {
		console.error(
			"[DATA_PROCESSOR] Erro fatal durante o processamento de arquivos:",
			error,
		);
		throw error;
	}
};
