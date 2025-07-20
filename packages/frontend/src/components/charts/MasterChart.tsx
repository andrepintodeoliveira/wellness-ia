// src/components/charts/MasterChart.tsx
import React, { useMemo } from "react";
import {
	ComposedChart,
	Line,
	Area,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Legend,
	ResponsiveContainer,
	ReferenceArea,
} from "recharts";
import { AthleteProfile, UnifiedDataPoint } from "@/lib/types";

const formatPaceToTime = (pace: number) => {
	if (!pace || pace === Infinity || isNaN(pace)) return "00:00";
	const minutes = Math.floor(pace);
	const seconds = Math.round((pace - minutes) * 60);
	return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const formatTimestampToLocalTime = (timestamp: number) => {
	if (isNaN(timestamp)) return "00:00";
	return new Date(timestamp).toLocaleTimeString(navigator.language, {
		hour: "2-digit",
		minute: "2-digit",
	});
};

const calculateHrZones = (profile: AthleteProfile) => {
	if (!profile || !profile.hrMax || !profile.hrRest) return [];
	const hrReserve = profile.hrMax - profile.hrRest;
	const zones = [
		{
			z: 1,
			min: 0.5,
			max: 0.6,
			label: "Z1",
			color: "hsl(var(--primary) / 0.05)",
		},
		{
			z: 2,
			min: 0.6,
			max: 0.7,
			label: "Z2",
			color: "hsl(var(--primary) / 0.1)",
		},
		{
			z: 3,
			min: 0.7,
			max: 0.8,
			label: "Z3",
			color: "hsl(var(--primary) / 0.15)",
		},
		{
			z: 4,
			min: 0.8,
			max: 0.9,
			label: "Z4",
			color: "hsl(var(--destructive) / 0.15)",
		},
		{
			z: 5,
			min: 0.9,
			max: 1.0,
			label: "Z5",
			color: "hsl(var(--destructive) / 0.2)",
		},
	];
	return zones.map((zone) => ({
		...zone,
		y1: Math.round(profile.hrRest! + hrReserve * zone.min),
		y2: Math.round(profile.hrRest! + hrReserve * zone.max),
	}));
};

interface MasterChartProps {
	timeSeries: UnifiedDataPoint[];
	profile: AthleteProfile;
}

export const MasterChart: React.FC<MasterChartProps> = ({
	timeSeries,
	profile,
}) => {
	const chartData = useMemo(() => {
		if (!timeSeries || timeSeries.length === 0) return [];
		return timeSeries.map((point) => ({
			timestamp: point.timestamp,
			"Frequência Cardíaca": point.heartRate || null,
			"Pace (min/km)": point.speed > 0.5 ? 1000 / (point.speed * 60) : null,
			"Elevação (m)": point.altitude || null,
		}));
	}, [timeSeries]);

	const hrZones = useMemo(() => calculateHrZones(profile), [profile]);

	const CustomTooltip = ({ active, payload }: any) => {
		if (active && payload && payload.length) {
			const data = payload[0].payload;
			return (
				<div className="p-2 bg-background/80 border rounded-md shadow-lg backdrop-blur-sm">
					<p className="font-bold">{`Hora: ${formatTimestampToLocalTime(data.timestamp)}`}</p>
					{data["Frequência Cardíaca"] && (
						<p
							style={{ color: "hsl(var(--primary))" }}
						>{`FC: ${data["Frequência Cardíaca"]} bpm`}</p>
					)}
					{data["Pace (min/km)"] && (
						<p
							style={{ color: "hsl(var(--destructive))" }}
						>{`Pace: ${formatPaceToTime(data["Pace (min/km)"])} min/km`}</p>
					)}
					{data["Elevação (m)"] && (
						<p
							style={{ color: "hsl(var(--secondary-foreground))" }}
						>{`Elevação: ${data["Elevação (m)"].toFixed(1)} m`}</p>
					)}
				</div>
			);
		}
		return null;
	};

	return (
		<ResponsiveContainer width="100%" height={400}>
			<ComposedChart
				data={chartData}
				margin={{ top: 5, right: 5, left: -15, bottom: 5 }}
			>
				{hrZones.map((zone) => (
					// CORREÇÃO: Especificar o yAxisId para a área de referência
					<ReferenceArea
						key={zone.label}
						yAxisId="hr"
						y1={zone.y1}
						y2={zone.y2}
						strokeOpacity={0.1}
						fill={zone.color}
					/>
				))}

				<CartesianGrid strokeDasharray="3 3" opacity={0.3} />
				<XAxis
					dataKey="timestamp"
					type="number"
					domain={["dataMin", "dataMax"]}
					tickFormatter={formatTimestampToLocalTime}
					stroke="hsl(var(--muted-foreground))"
					fontSize={12}
				/>
				<YAxis
					yAxisId="hr"
					orientation="left"
					stroke="hsl(var(--primary))"
					fontSize={12}
					domain={["dataMin - 10", "dataMax + 10"]}
				/>
				<YAxis
					yAxisId="pace"
					orientation="right"
					stroke="hsl(var(--destructive))"
					fontSize={12}
					reversed
					tickFormatter={formatPaceToTime}
					domain={["dataMin - 1", "dataMax + 1"]}
				/>
				<Tooltip content={<CustomTooltip />} />
				<Legend />

				<Area
					yAxisId="hr"
					type="monotone"
					dataKey="Elevação (m)"
					fill="hsl(var(--secondary))"
					stroke="hsl(var(--secondary-foreground))"
					strokeWidth={1}
					name="Elevação"
					connectNulls
				/>
				<Line
					yAxisId="hr"
					type="monotone"
					dataKey="Frequência Cardíaca"
					stroke="hsl(var(--primary))"
					strokeWidth={2}
					dot={false}
					connectNulls
				/>
				<Line
					yAxisId="pace"
					type="monotone"
					dataKey="Pace (min/km)"
					stroke="hsl(var(--destructive))"
					strokeWidth={2}
					dot={false}
					connectNulls
				/>
			</ComposedChart>
		</ResponsiveContainer>
	);
};
