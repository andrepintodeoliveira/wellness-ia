// packages/frontend/src/components/data/KeyMetricsDisplay.tsx

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnalysisKeyMetrics, TrainingSummary } from "@/lib/types";

// Helper para renderizar cada linha de métrica
const MetricRow = ({
	label,
	value,
	isEstimated,
}: {
	label: string;
	value: string | number;
	isEstimated?: boolean;
}) => (
	<div className="flex justify-between items-center text-sm py-2 border-b border-border/50 last:border-none">
		<span className="text-muted-foreground">{label}</span>
		<div className="flex items-center">
			<span className="font-semibold text-right">
				{value}
				{isEstimated && <sup className="text-primary font-bold ml-1">*</sup>}
			</span>
		</div>
	</div>
);

interface KeyMetricsDisplayProps {
	metrics: AnalysisKeyMetrics | null;
	summary: TrainingSummary | null;
}

export function KeyMetricsDisplay({
	metrics,
	summary,
}: KeyMetricsDisplayProps) {
	if (!metrics || !summary) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Métricas Chave</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground">
						Não foi possível calcular as métricas de performance.
					</p>
				</CardContent>
			</Card>
		);
	}

	const {
		pacingStrategy,
		decoupling,
		cadence,
		strideLength,
		isCadenceEstimated,
		elevation,
		trainingLoad,
	} = metrics;

	const formatTime = (seconds: number = 0) =>
		new Date(seconds * 1000).toISOString().substring(11, 19);
	const formatPace = (seconds: number = 0, distance: number = 1) => {
		if (distance === 0) return "00:00";
		const pace = seconds / (distance / 1000);
		return new Date(pace * 1000).toISOString().substring(14, 19);
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>Métricas Chave</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div>
					<h3 className="text-sm font-semibold mb-2 text-muted-foreground">
						Resumo da Sessão
					</h3>
					<div className="space-y-1">
						<MetricRow
							label="Distância"
							value={`${(summary.totalDistanceMeters / 1000).toFixed(2)} km`}
						/>
						<MetricRow
							label="Duração"
							value={formatTime(summary.totalTimeSeconds)}
						/>
						<MetricRow
							label="Pace Médio"
							value={`${formatPace(summary.totalTimeSeconds, summary.totalDistanceMeters)} min/km`}
						/>
						<MetricRow label="Calorias" value={`${summary.calories} kcal`} />
					</div>
				</div>

				<div>
					<h3 className="text-sm font-semibold mb-2 text-muted-foreground">
						Indicadores de Performance
					</h3>
					<div className="space-y-1">
						<MetricRow label="Estratégia de Ritmo" value={pacingStrategy} />
						<MetricRow
							label="Desacoplamento Cardíaco"
							value={decoupling.overall}
						/>
						<MetricRow
							label="Variação de Cadência"
							value={cadence.overall}
							isEstimated={isCadenceEstimated}
						/>
						<MetricRow
							label="Variação da Passada"
							value={strideLength.overall}
							isEstimated={isCadenceEstimated}
						/>
					</div>
				</div>

				<div>
					<h3 className="text-sm font-semibold mb-2 text-muted-foreground">
						Carga e Terreno
					</h3>
					<div className="space-y-1">
						{trainingLoad && (
							<MetricRow label="Carga de Treino (TRIMP)" value={trainingLoad} />
						)}
						{elevation && (
							<>
								<MetricRow
									label="Ganho de Elevação"
									value={`${elevation.gain} m`}
								/>
								<MetricRow
									label="Perda de Elevação"
									value={`${elevation.loss} m`}
								/>
							</>
						)}
					</div>
				</div>

				{isCadenceEstimated && (
					<div className="mt-4 text-xs text-muted-foreground border-t border-border/50 pt-2">
						<sup className="text-primary font-bold">*</sup>
						<strong>Nota:</strong> Os dados de cadência e passada foram
						estimados com base na sua altura e velocidade.
					</div>
				)}
			</CardContent>
		</Card>
	);
}
