// packages/frontend/src/utils/parsers.ts

import Papa from "papaparse";
import { TrainingData, UnifiedDataPoint } from "@/lib/types";

/**
 * Converte uma string de duração (HH:MM:SS) para o total de segundos.
 * @param timeStr A string de tempo.
 * @returns O número total de segundos.
 */
function durationToSeconds(timeStr: string): number {
	if (!timeStr) return 0;
	const parts = timeStr.split(":").map(Number);
	if (parts.length === 3) {
		return parts[0] * 3600 + parts[1] * 60 + parts[2];
	}
	if (parts.length === 2) {
		return parts[0] * 60 + parts[1];
	}
	return parts[0] || 0;
}

/**
 * Analisa um arquivo .csv da Polar e extrai APENAS a data/hora de início.
 * @param csvFile O arquivo .csv a ser analisado.
 * @returns Uma Promise que resolve com o timestamp de início em milissegundos.
 */
export const parseCSVStartTime = (csvFile: File): Promise<number> => {
	return new Promise((resolve, reject) => {
		Papa.parse<string[]>(csvFile, {
			preview: 2,
			complete: (results) => {
				try {
					const headers = results.data[0].map((h) => h.trim());
					const values = results.data[1];
					const dateIndex = headers.indexOf("Date");
					const timeIndex = headers.indexOf("Start time");

					if (dateIndex === -1 || timeIndex === -1) {
						throw new Error("Data ou hora de início não encontradas no CSV.");
					}

					const [day, month, year] = values[dateIndex].split("-");
					const localDateStr = `${year}-${month}-${day}T${values[timeIndex]}`;
					resolve(new Date(localDateStr).getTime());
				} catch (error) {
					reject(error);
				}
			},
			error: (error) => reject(error),
		});
	});
};

/**
 * Analisa um arquivo .csv da Polar e extrai os dados de sumário e de série temporal.
 * @param csvFile O arquivo .csv a ser analisado.
 * @returns Uma Promise que resolve com um objeto TrainingData.
 */
export const parseCSV = (csvFile: File): Promise<TrainingData> => {
	return new Promise((resolve, reject) => {
		Papa.parse<string[]>(csvFile, {
			complete: (results) => {
				try {
					const data = results.data;

					const summaryHeaders = data[0].map((h) => h.trim());
					const summaryValues = data[1];

					const getSummaryValue = (headerName: string) => {
						const index = summaryHeaders.indexOf(headerName);
						return index !== -1 ? summaryValues[index] : undefined;
					};

					const dateStr = getSummaryValue("Date");
					const startTimeStr = getSummaryValue("Start time");

					if (!dateStr || !startTimeStr) {
						throw new Error("Data ou hora de início não encontradas no CSV.");
					}

					const [day, month, year] = dateStr.split("-");
					const isoDateStr = `${year}-${month}-${day}T${startTimeStr}Z`;
					const startTime = new Date(isoDateStr).getTime();

					const summary: TrainingData["summary"] = {
						totalDistanceMeters:
							parseFloat(getSummaryValue("Total distance (km)") || "0") * 1000,
						totalTimeSeconds: durationToSeconds(
							getSummaryValue("Duration") || "0",
						),
						calories: parseInt(getSummaryValue("Calories") || "0"),
						avgHeartRate: parseInt(
							getSummaryValue("Average heart rate (bpm)") || "0",
						),
						avgSpeed:
							parseFloat(getSummaryValue("Average speed (km/h)") || "0") / 3.6,
						maxSpeed:
							parseFloat(getSummaryValue("Max speed (km/h)") || "0") / 3.6,
						vo2max: parseInt(getSummaryValue("VO2max") || "0"),
					};

					const timeSeriesHeaders = data[2].map((h) => h.trim());
					const timeSeriesRows = data.slice(3);

					const getSeriesValue = (
						row: string[],
						headerName: string,
					): string | undefined => {
						const index = timeSeriesHeaders.indexOf(headerName);
						return index !== -1 ? row[index] : undefined;
					};

					const timeSeries: UnifiedDataPoint[] = timeSeriesRows
						.map((row) => {
							if (row.length < timeSeriesHeaders.length) return null;

							const timeOffsetSeconds = durationToSeconds(
								getSeriesValue(row, "Time") || "0",
							);
							const timestamp = startTime + timeOffsetSeconds * 1000;

							const hrStr = getSeriesValue(row, "HR (bpm)");
							const speedStr = getSeriesValue(row, "Speed (km/h)");
							const distStr = getSeriesValue(row, "Distances (m)");
							const altStr = getSeriesValue(row, "Altitude (m)");
							const powerStr = getSeriesValue(row, "Power (W)");
							const cadenceStr = getSeriesValue(row, "Cadence");

							return {
								timestamp: timestamp,
								heartRate: hrStr ? parseInt(hrStr, 10) : undefined,
								speed: speedStr ? parseFloat(speedStr) / 3.6 : undefined,
								distance: distStr ? parseFloat(distStr) : undefined,
								altitude: altStr ? parseFloat(altStr) : undefined,
								power: powerStr ? parseFloat(powerStr) : undefined,
								cadence: cadenceStr ? parseInt(cadenceStr, 10) * 2 : undefined,
							};
						})
						.filter((point): point is UnifiedDataPoint => point !== null);

					resolve({ summary, timeSeries });
				} catch (error) {
					console.error("Erro ao processar o arquivo CSV:", error);
					reject(error);
				}
			},
			error: (error) => {
				reject(error);
			},
		});
	});
};

/**
 * Analisa um arquivo .tcx e extrai os dados da série temporal.
 * @param tcxFile O arquivo .tcx a ser analisado.
 * @returns Uma Promise que resolve com um objeto TrainingData (principalmente a série temporal).
 */
export const parseTCX = (tcxFile: File): Promise<Partial<TrainingData>> => {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();

		reader.onload = (event) => {
			try {
				const text = event.target?.result;
				if (typeof text !== "string") {
					return reject(new Error("Não foi possível ler o arquivo TCX."));
				}

				const parser = new DOMParser();
				const xmlDoc = parser.parseFromString(text, "text/xml");

				const parseError = xmlDoc.querySelector("parsererror");
				if (parseError) {
					console.error("Erro de parsing do XML:", parseError);
					return reject(new Error("Arquivo TCX malformado ou corrompido."));
				}

				const trackpoints = xmlDoc.querySelectorAll("Trackpoint");
				const timeSeries: UnifiedDataPoint[] = [];

				trackpoints.forEach((point) => {
					const timeEl = point.querySelector("Time");
					const latEl = point.querySelector("LatitudeDegrees");
					const lonEl = point.querySelector("LongitudeDegrees");
					const hrEl = point.querySelector("HeartRateBpm > Value");
					const distEl = point.querySelector("DistanceMeters");
					const speedEl = point.querySelector("Speed");
					const cadenceEl = point.querySelector("RunCadence");

					if (!timeEl) return;

					const dataPoint: UnifiedDataPoint = {
						timestamp: new Date(timeEl.textContent || "").getTime(),
					};

					if (latEl?.textContent)
						dataPoint.latitude = parseFloat(latEl.textContent);
					if (lonEl?.textContent)
						dataPoint.longitude = parseFloat(lonEl.textContent);
					if (hrEl?.textContent)
						dataPoint.heartRate = parseInt(hrEl.textContent, 10);
					if (distEl?.textContent)
						dataPoint.distance = parseFloat(distEl.textContent);
					if (speedEl?.textContent)
						dataPoint.speed = parseFloat(speedEl.textContent);
					// TCX RunCadence já é SPM (total), não precisa multiplicar
					if (cadenceEl?.textContent)
						dataPoint.cadence = parseInt(cadenceEl.textContent, 10);

					timeSeries.push(dataPoint);
				});

				const lap = xmlDoc.querySelector("Lap");
				const summary: Partial<TrainingData["summary"]> = {};
				if (lap) {
					const totalTime = lap.querySelector("TotalTimeSeconds");
					const distance = lap.querySelector("DistanceMeters");
					const calories = lap.querySelector("Calories");
					const avgHr = lap.querySelector("AverageHeartRateBpm > Value");
					const maxHr = lap.querySelector("MaximumHeartRateBpm > Value");
					const maxSpeed = lap.querySelector("MaximumSpeed");
					const avgSpeed = lap.querySelector("Extensions > LX > AvgSpeed");

					if (totalTime?.textContent)
						summary.totalTimeSeconds = parseFloat(totalTime.textContent);
					if (distance?.textContent)
						summary.totalDistanceMeters = parseFloat(distance.textContent);
					if (calories?.textContent)
						summary.calories = parseInt(calories.textContent, 10);
					if (avgHr?.textContent)
						summary.avgHeartRate = parseInt(avgHr.textContent, 10);
					if (maxHr?.textContent)
						summary.maxHeartRate = parseInt(maxHr.textContent, 10);
					if (maxSpeed?.textContent)
						summary.maxSpeed = parseFloat(maxSpeed.textContent);
					if (avgSpeed?.textContent)
						summary.avgSpeed = parseFloat(avgSpeed.textContent);
				}

				resolve({ summary, timeSeries });
			} catch (error) {
				console.error("Erro ao processar o arquivo TCX:", error);
				reject(error);
			}
		};

		reader.onerror = (error) => reject(error);
		reader.readAsText(tcxFile);
	});
};

/**
 * Analisa um arquivo .gpx e extrai a série temporal.
 */
export const parseGPX = (gpxFile: File): Promise<Partial<TrainingData>> => {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();

		reader.onload = (event) => {
			try {
				const text = event.target?.result;
				if (typeof text !== "string") {
					return reject(new Error("Não foi possível ler o arquivo GPX."));
				}

				const parser = new DOMParser();
				const xmlDoc = parser.parseFromString(text, "text/xml");

				const parseError = xmlDoc.querySelector("parsererror");
				if (parseError) {
					return reject(new Error("Arquivo GPX malformado ou corrompido."));
				}

				const trackpoints = xmlDoc.querySelectorAll("trkpt");
				const timeSeries: UnifiedDataPoint[] = [];

				trackpoints.forEach((point) => {
					const timeEl = point.querySelector("time");
					const eleEl = point.querySelector("ele");
					const lat = point.getAttribute("lat");
					const lon = point.getAttribute("lon");

					if (!timeEl || !lat || !lon) return;

					const dataPoint: UnifiedDataPoint = {
						timestamp: new Date(timeEl.textContent || "").getTime(),
						latitude: parseFloat(lat),
						longitude: parseFloat(lon),
					};

					if (eleEl?.textContent)
						dataPoint.altitude = parseFloat(eleEl.textContent);

					const hrEl = point.querySelector(
						"extensions hr, extensions heartrate",
					);
					if (hrEl?.textContent)
						dataPoint.heartRate = parseInt(hrEl.textContent, 10);

					timeSeries.push(dataPoint);
				});

				resolve({ timeSeries });
			} catch (error) {
				console.error("Erro ao processar o arquivo GPX:", error);
				reject(error);
			}
		};

		reader.onerror = (error) => reject(error);
		reader.readAsText(gpxFile);
	});
};
