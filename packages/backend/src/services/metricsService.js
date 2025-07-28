// packages/backend/src/services/metricsService.js

const filterValidPoints = (series, key) =>
	series.filter(
		(p) =>
			p[key] !== null && p[key] !== undefined && !isNaN(p[key]) && p[key] > 0,
	);

const formatSecondsToMMSS = (seconds) => {
	if (isNaN(seconds)) return "00:00";
	const m = Math.floor(seconds / 60);
	const s = Math.floor(seconds % 60);
	return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

const calculateZoneDistribution = (timeSeries, profile) => {
	if (!profile.hrMax || !profile.hrRest || timeSeries.length === 0) return null;
	const hrReserve = profile.hrMax - profile.hrRest;
	const zonesConfig = [
		{ name: "Z1 (Leve)", max: 0.6 },
		{ name: "Z2 (Moderada)", max: 0.7 },
		{ name: "Z3 (Intensa)", max: 0.8 },
		{ name: "Z4 (Muito Intensa)", max: 0.9 },
		{ name: "Z5 (Máxima)", max: 1.01 },
	];
	const zoneBoundaries = zonesConfig.map((z) =>
		Math.round(profile.hrRest + hrReserve * z.max),
	);
	const timeInZones = new Array(5).fill(0);
	const validHrPoints = filterValidPoints(timeSeries, "heartRate");
	for (const point of validHrPoints) {
		let zoneIndex = zoneBoundaries.findIndex((b) => point.heartRate <= b);
		if (zoneIndex === -1) zoneIndex = 4;
		timeInZones[zoneIndex]++;
	}
	const totalTime = validHrPoints.length;
	if (totalTime === 0) return null;
	return {
		distribution: zonesConfig.map((zone, i) => ({
			zone: zone.name,
			percentage: ((timeInZones[i] / totalTime) * 100).toFixed(1),
			time: formatSecondsToMMSS(timeInZones[i]),
		})),
		timeInZones,
	};
};

const calculateElevationMetrics = (timeSeries) => {
	let elevationGain = 0;
	let elevationLoss = 0;
	let flatDistance = 0;
	let uphillDistance = 0;
	let downhillDistance = 0;
	for (let i = 1; i < timeSeries.length; i++) {
		const prevPoint = timeSeries[i - 1];
		const currentPoint = timeSeries[i];
		const altitudeChange =
			(currentPoint.altitude || 0) - (prevPoint.altitude || 0);
		const distanceChange =
			(currentPoint.distance || 0) - (prevPoint.distance || 0);
		if (distanceChange > 0) {
			if (altitudeChange > 0.1) {
				elevationGain += altitudeChange;
				uphillDistance += distanceChange;
			} else if (altitudeChange < -0.1) {
				elevationLoss += Math.abs(altitudeChange);
				downhillDistance += distanceChange;
			} else {
				flatDistance += distanceChange;
			}
		}
	}
	const totalDistance = flatDistance + uphillDistance + downhillDistance;
	if (totalDistance === 0) return null;
	return {
		gain: Math.round(elevationGain),
		loss: Math.round(elevationLoss),
		terrainDistribution: {
			uphill: {
				distance: (uphillDistance / 1000).toFixed(2),
				percentage: ((uphillDistance / totalDistance) * 100).toFixed(0),
			},
			downhill: {
				distance: (downhillDistance / 1000).toFixed(2),
				percentage: ((downhillDistance / totalDistance) * 100).toFixed(0),
			},
			flat: {
				distance: (flatDistance / 1000).toFixed(2),
				percentage: ((flatDistance / totalDistance) * 100).toFixed(0),
			},
		},
	};
};

export const generateAdvancedMetrics = (timeSeries, profile, job) => {
	const defaultResult = {
		pacingStrategy: "Dados insuficientes",
		decoupling: { trend: [], overall: "N/A" },
		strideLength: { trend: [], overall: "N/A" },
		cadence: { trend: [], overall: "N/A" },
		zoneDistribution: null,
		isCadenceEstimated: false,
		elevation: null,
		trainingLoad: null,
	};

	if (!timeSeries || timeSeries.length < 100) return defaultResult;

	let isCadenceEstimated = false;
	let processedTimeSeries = [...timeSeries];

	const hasRealCadenceData = timeSeries.some(
		(p) => p.cadence !== undefined && p.cadence > 0,
	);

	if (!hasRealCadenceData && profile.height) {
		job.message = "Dados de cadência não encontrados. Estimando valores...";
		isCadenceEstimated = true;
		const heightInMeters = profile.height / 100;
		const baseStride = heightInMeters * 0.43;
		const speedFactor = 0.08;
		processedTimeSeries = timeSeries.map((point) => {
			if (point.speed > 0.5) {
				const dynamicStride = baseStride + point.speed * speedFactor;
				const estimatedCadence = (point.speed / dynamicStride) * 60;
				return { ...point, cadence: estimatedCadence * 2 };
			}
			return { ...point, cadence: undefined };
		});
	}

	const zoneResult = calculateZoneDistribution(processedTimeSeries, profile);
	const elevationMetrics = calculateElevationMetrics(processedTimeSeries);
	const trainingLoad = zoneResult
		? (zoneResult.timeInZones[0] * 1 +
				zoneResult.timeInZones[1] * 2 +
				zoneResult.timeInZones[2] * 3 +
				zoneResult.timeInZones[3] * 4 +
				zoneResult.timeInZones[4] * 5) /
			60
		: null;
	const quintileSize = Math.floor(processedTimeSeries.length / 5);
	const decouplingTrend = [];
	const strideLengthTrend = [];
	const cadenceTrend = [];

	const getEfficiencyFactor = (series) => {
		const validPoints = filterValidPoints(series, "heartRate").filter(
			(p) => p.speed > 0.5,
		);
		if (validPoints.length < 10) return 0;
		const avgSpeed =
			validPoints.reduce((sum, p) => sum + p.speed, 0) / validPoints.length;
		const avgHr =
			validPoints.reduce((sum, p) => sum + p.heartRate, 0) / validPoints.length;
		return (avgSpeed * 3.6) / avgHr;
	};

	const getAverageMetric = (series, key) => {
		const validPoints = filterValidPoints(series, key);
		if (validPoints.length === 0) return 0;
		return validPoints.reduce((sum, p) => sum + p[key], 0) / validPoints.length;
	};

	for (let i = 0; i < 5; i++) {
		const segment = processedTimeSeries.slice(
			i * quintileSize,
			(i + 1) * quintileSize,
		);
		decouplingTrend.push({
			name: `${i * 20}%`,
			"Fator de Eficiência": parseFloat(
				getEfficiencyFactor(segment).toFixed(3),
			),
		});
		const avgSpeed = getAverageMetric(segment, "speed");
		const avgCadence = getAverageMetric(segment, "cadence");
		const stride =
			avgSpeed > 0 && avgCadence > 0 ? avgSpeed / (avgCadence / 60) : 0;
		strideLengthTrend.push(stride.toFixed(2));
		cadenceTrend.push(avgCadence.toFixed(1));
	}

	const firstQuintileEF = decouplingTrend[0]["Fator de Eficiência"];
	const lastQuintileEF = decouplingTrend[4]["Fator de Eficiência"];
	const overallDecoupling =
		firstQuintileEF > 0
			? `${(((firstQuintileEF - lastQuintileEF) / firstQuintileEF) * 100).toFixed(1)}% de queda`
			: "N/A";

	const firstQuintileStride = parseFloat(strideLengthTrend[0]);
	const lastQuintileStride = parseFloat(strideLengthTrend[4]);
	const overallStride =
		firstQuintileStride > 0
			? `${(((firstQuintileStride - lastQuintileStride) / firstQuintileStride) * 100).toFixed(1)}% de queda`
			: "Dados indisponíveis";

	const firstQuintileCadence = parseFloat(cadenceTrend[0]);
	const lastQuintileCadence = parseFloat(cadenceTrend[4]);
	const overallCadence =
		firstQuintileCadence > 0
			? `${(((firstQuintileCadence - lastQuintileCadence) / firstQuintileCadence) * 100).toFixed(1)}% de queda`
			: "Dados indisponíveis";

	const midPointIndex = Math.floor(processedTimeSeries.length / 2);
	const avgSpeedFirstHalf = getAverageMetric(
		processedTimeSeries.slice(0, midPointIndex),
		"speed",
	);
	const avgSpeedSecondHalf = getAverageMetric(
		processedTimeSeries.slice(midPointIndex),
		"speed",
	);
	let pacingStrategy = "Split Uniforme";
	if (avgSpeedSecondHalf > avgSpeedFirstHalf * 1.02)
		pacingStrategy = "Split Negativo (acelerou)";
	else if (avgSpeedSecondHalf < avgSpeedFirstHalf * 0.98)
		pacingStrategy = "Split Positivo (desacelerou)";

	return {
		pacingStrategy,
		decoupling: { trend: decouplingTrend, overall: overallDecoupling },
		strideLength: {
			trend: strideLengthTrend,
			overall: isCadenceEstimated ? "Estimado" : overallStride,
		},
		cadence: {
			trend: cadenceTrend,
			overall: isCadenceEstimated ? "Estimado" : overallCadence,
		},
		zoneDistribution: zoneResult ? zoneResult.distribution : null,
		isCadenceEstimated,
		elevation: elevationMetrics,
		trainingLoad: trainingLoad ? Math.round(trainingLoad) : null,
	};
};
