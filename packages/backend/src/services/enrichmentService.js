// packages/backend/src/services/enrichmentService.js

import fetch from "node-fetch";

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
			await sleep(delay);
		}
	}
	return [];
};

export const enrichTrainingData = async (timeSeries, job) => {
	console.log("--- [ENRICHMENT] Iniciando Serviço de Enriquecimento ---");
	if (!timeSeries || timeSeries.length === 0)
		return { enrichedTimeSeries: [], weatherInfo: null };

	job.progress = 15;
	job.message = "Buscando dados climáticos...";

	const firstPoint = timeSeries[0];
	const { latitude, longitude, timestamp } = firstPoint;
	let enrichedTimeSeries = [...timeSeries];
	let weatherInfo = null;

	if (latitude != null && longitude != null && timestamp != null) {
		try {
			const trainingDate = new Date(timestamp);
			const dateString = trainingDate.toISOString().split("T")[0];
			const weatherUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude.toFixed(4)}&longitude=${longitude.toFixed(4)}&start_date=${dateString}&end_date=${dateString}&hourly=temperature_2m,relative_humidity_2m,weather_code&timezone=auto`;
			const weatherResponse = await fetch(weatherUrl);
			if (weatherResponse.ok) {
				const weatherData = await weatherResponse.json();
				if (weatherData.hourly) {
					const hour = new Date(timestamp).getHours();
					weatherInfo = {
						temperature: Math.round(weatherData.hourly.temperature_2m[hour]),
						humidity: Math.round(weatherData.hourly.relative_humidity_2m[hour]),
						iconCode: getWeatherIcon(weatherData.hourly.weather_code[hour]),
					};
				}
			}
		} catch (error) {
			console.error(
				"[ENRICHMENT] Falha ao buscar dados climáticos:",
				error.message,
			);
		}
	}

	job.progress = 30;
	job.message = "Buscando e aplicando dados de elevação...";

	const hasInitialElevation = timeSeries.some((p) => p.altitude != null);
	if (!hasInitialElevation) {
		try {
			const pointsWithCoords = timeSeries.filter(
				(p) => p.latitude != null && p.longitude != null,
			);
			if (pointsWithCoords.length > 0) {
				const CHUNK_SIZE = 100;
				let allElevations = [];
				for (let i = 0; i < pointsWithCoords.length; i += CHUNK_SIZE) {
					const chunk = pointsWithCoords.slice(i, i + CHUNK_SIZE);
					const elevations = await fetchElevationWithRetry(
						chunk,
						fetchOpenElevation,
						"Open-Elevation",
						job,
					);
					allElevations.push(...elevations);
				}
				if (allElevations.length === pointsWithCoords.length) {
					const elevationMap = new Map(
						pointsWithCoords.map((point, index) => [
							point.timestamp,
							allElevations[index],
						]),
					);
					enrichedTimeSeries = enrichedTimeSeries.map((point) =>
						elevationMap.has(point.timestamp)
							? { ...point, altitude: elevationMap.get(point.timestamp) }
							: point,
					);
				}
			}
		} catch (error) {
			if (error.message !== "Job cancelado pelo usuário.") {
				console.error(
					"[ENRICHMENT] ERRO GERAL na busca de elevação:",
					error.message,
				);
			}
			throw error;
		}
	}

	job.progress = 50;
	job.message = "Dados de enriquecimento aplicados com sucesso.";
	console.log("--- [ENRICHMENT] Serviço de Enriquecimento Concluído ---\n");
	return { enrichedTimeSeries, weatherInfo };
};
