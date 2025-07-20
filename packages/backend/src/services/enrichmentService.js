// TPhysio-Analyzer-Backend/src/services/enrichmentService.js
import fetch from "node-fetch";
import { URLSearchParams } from "url";

// --- Funções Auxiliares ---
const getWeatherIcon = (code) => {
	if ([0, 1].includes(code)) return "sunny";
	if ([2].includes(code)) return "partly_cloudy";
	if ([3].includes(code)) return "cloudy";
	if ([45, 48].includes(code)) return "fog";
	if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code))
		return "rain";
	if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow";
	if ([95, 96, 99].includes(code)) return "thunderstorm";
	return "unknown";
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchOpenElevation = async (batch) => {
	const url = "https://api.open-elevation.com/api/v1/lookup";
	const body = {
		locations: batch.map((p) => ({
			latitude: p.latitude,
			longitude: p.longitude,
		})),
	};
	const response = await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
	if (!response.ok)
		throw new Error(
			`Open-Elevation API respondeu com status ${response.status}`,
		);
	const data = await response.json();
	return data.results.map((r) => r.elevation);
};

const fetchOpenMeteo = async (batch) => {
	const url = "https://api.open-meteo.com/v1/elevation";
	const body = new URLSearchParams();
	batch.forEach((p) => {
		body.append("latitude", p.latitude.toString());
		body.append("longitude", p.longitude.toString());
	});
	const response = await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: body,
	});
	if (!response.ok)
		throw new Error(`Open-Meteo API respondeu com status ${response.status}`);
	const data = await response.json();
	return data.elevation;
};

const fetchElevationWithRetry = async (batch, apiFunction, apiName, job) => {
	let attempts = 0;
	const MAX_ATTEMPTS = 3;
	while (attempts < MAX_ATTEMPTS) {
		if (job.isCancelled) throw new Error("Job cancelado pelo usuário.");
		try {
			return await apiFunction(batch);
		} catch (error) {
			attempts++;
			console.warn(
				`[ENRICHMENT] Tentativa ${attempts}/${MAX_ATTEMPTS} para ${apiName} falhou:`,
				error.message,
			);
			if (attempts >= MAX_ATTEMPTS) throw error;
			const delay = Math.pow(2, attempts) * 1000;
			console.log(
				`[ENRICHMENT] Aguardando ${delay}ms para tentar novamente...`,
			);
			await sleep(delay);
		}
	}
	return [];
};

// --- Função Principal ---
export const enrichTrainingData = async (timeSeries, job) => {
	console.log("--- [ENRICHMENT] Iniciando Serviço de Enriquecimento ---");
	if (!timeSeries || timeSeries.length === 0)
		return { enrichedTimeSeries: [], weatherInfo: null };

	const firstPoint = timeSeries[0];
	const { latitude, longitude, timestamp } = firstPoint;
	if (latitude == null || longitude == null || timestamp == null)
		return { enrichedTimeSeries: timeSeries, weatherInfo: null };

	let enrichedTimeSeries = [...timeSeries];
	let weatherInfo = null;

	// --- LÓGICA DE CLIMA CORRIGIDA ---
	console.log("\n--- [DEBUG] Verificação do Clima ---");
	try {
		const trainingDate = new Date(timestamp);
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		trainingDate.setHours(0, 0, 0, 0);

		const dayDifference =
			(today.getTime() - trainingDate.getTime()) / (1000 * 60 * 60 * 24);
		const dateString = new Date(timestamp).toISOString().split("T")[0];

		let weatherUrl;
		let isCurrent = today.getTime() === trainingDate.getTime();

		// Define qual API usar com base na data
		if (isCurrent) {
			console.log(
				"[DEBUG] Data do treino é hoje. Usando API de 'forecast' para dados atuais.",
			);
			weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude.toFixed(4)}&longitude=${longitude.toFixed(4)}¤t=temperature_2m,relative_humidity_2m,weather_code&timezone=auto`;
		} else {
			const apiEndpoint =
				dayDifference > 7
					? "https://archive-api.open-meteo.com/v1/archive"
					: "https://api.open-meteo.com/v1/forecast";
			console.log(
				`[DEBUG] Data do treino (${dateString}) é passada. Usando API '${apiEndpoint.split("/").pop()}'.`,
			);
			weatherUrl = `${apiEndpoint}?latitude=${latitude.toFixed(4)}&longitude=${longitude.toFixed(4)}&start_date=${dateString}&end_date=${dateString}&hourly=temperature_2m,relative_humidity_2m,weather_code&timezone=auto`;
		}

		const weatherResponse = await fetch(weatherUrl);
		const weatherData = await weatherResponse.json();

		if (weatherResponse.ok) {
			if (isCurrent && weatherData.current) {
				weatherInfo = {
					temperature: Math.round(weatherData.current.temperature_2m),
					humidity: Math.round(weatherData.current.relative_humidity_2m),
					iconCode: getWeatherIcon(weatherData.current.weather_code),
				};
			} else if (!isCurrent && weatherData.hourly) {
				const hour = new Date(timestamp).getHours();
				weatherInfo = {
					temperature: Math.round(weatherData.hourly.temperature_2m[hour]),
					humidity: Math.round(weatherData.hourly.relative_humidity_2m[hour]),
					iconCode: getWeatherIcon(weatherData.hourly.weather_code[hour]),
				};
			}
			console.log("[ENRICHMENT] Clima obtido com sucesso:", weatherInfo);
		} else {
			console.warn(
				"[DEBUG] A resposta da API de clima não foi bem-sucedida.",
				weatherData,
			);
		}
	} catch (error) {
		console.error(
			"[ENRICHMENT] Falha ao buscar dados climáticos:",
			error.message,
		);
	}

	// --- LÓGICA DE ELEVAÇÃO COM FALLBACK E RETRY ---
	console.log("\n--- [DEBUG] Verificação da Elevação ---");
	const hasInitialElevation = timeSeries.some((p) => p.altitude != null);
	const isElevationInvalid =
		hasInitialElevation &&
		timeSeries.filter((p) => p.altitude !== 0).length < timeSeries.length * 0.1;

	if (!hasInitialElevation || isElevationInvalid) {
		try {
			const pointsWithCoords = timeSeries.filter(
				(p) => p.latitude != null && p.longitude != null,
			);
			if (pointsWithCoords.length === 0)
				throw new Error("Nenhum ponto com coordenadas para buscar elevação.");

			const CHUNK_SIZE = 100;
			const CONCURRENCY_LIMIT = 3; // Limite mais conservador
			let allElevations = [];

			const chunks = [];
			for (let i = 0; i < pointsWithCoords.length; i += CHUNK_SIZE) {
				chunks.push(pointsWithCoords.slice(i, i + CHUNK_SIZE));
			}

			console.log(
				`[DEBUG] Total de pontos: ${pointsWithCoords.length}. Dividido em ${chunks.length} lotes de até ${CHUNK_SIZE} pontos.`,
			);

			for (let i = 0; i < chunks.length; i += CONCURRENCY_LIMIT) {
				const batchGroupPromises = chunks
					.slice(i, i + CONCURRENCY_LIMIT)
					.map((chunk) =>
						fetchElevationWithRetry(
							chunk,
							fetchOpenElevation,
							"Open-Elevation",
							job,
						),
					);

				const results = await Promise.all(batchGroupPromises);
				results.forEach((elevationArray) =>
					allElevations.push(...elevationArray),
				);
			}

			if (allElevations.length === pointsWithCoords.length) {
				const elevationMap = new Map();
				pointsWithCoords.forEach((point, index) => {
					if (allElevations[index] != null)
						elevationMap.set(point.timestamp, allElevations[index]);
				});

				enrichedTimeSeries = enrichedTimeSeries.map((point) => {
					if (elevationMap.has(point.timestamp)) {
						return { ...point, altitude: elevationMap.get(point.timestamp) };
					}
					return point;
				});
				console.log("[DEBUG] SUCESSO: Dados de elevação mapeados.");
			} else {
				console.error(
					`[DEBUG] FALHA NO MAPEAMENTO: O número total de elevações não corresponde aos pontos enviados.`,
				);
			}
		} catch (error) {
			if (error.message !== "Job cancelado pelo usuário.") {
				console.error(
					"[DEBUG] ERRO GERAL na busca de elevação:",
					error.message,
				);
			}
			throw error;
		}
	}

	console.log("--- [ENRICHMENT] Serviço de Enriquecimento Concluído ---\n");
	return { enrichedTimeSeries, weatherInfo };
};
