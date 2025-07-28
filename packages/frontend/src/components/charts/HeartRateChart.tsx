// packages/frontend/src/components/charts/HeartRateChart.tsx

import React, { useMemo } from "react";
import {
	AreaChart,
	Area,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	ReferenceArea,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AthleteProfile, UnifiedDataPoint } from "@/lib/types";
import { useThemeColor } from "@/hooks/useThemeColor";

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
		{ min: 0.5, max: 0.6, color: "hsla(197, 88%, 56%, 0.2)" }, // Z1 - sky-500
		{ min: 0.6, max: 0.7, color: "hsla(142, 71%, 45%, 0.2)" }, // Z2 - green-500
		{ min: 0.7, max: 0.8, color: "hsla(48, 96%, 53%, 0.2)" }, // Z3 - yellow-500
		{ min: 0.8, max: 0.9, color: "hsla(25, 95%, 53%, 0.2)" }, // Z4 - orange-500
		{ min: 0.9, max: 1.01, color: "hsla(0, 84%, 60%, 0.2)" }, // Z5 - red-500
	];
	return zones.map((zone, index) => ({
		label: `Z${index + 1}`,
		y1: Math.round(profile.hrRest! + hrReserve * zone.min),
		y2: Math.round(profile.hrRest! + hrReserve * zone.max),
		color: zone.color,
	}));
};

interface HeartRateChartProps {
	timeSeries: UnifiedDataPoint[];
	profile: AthleteProfile;
}

export function HeartRateChart({ timeSeries, profile }: HeartRateChartProps) {
	const primaryColor = useThemeColor("--color-primary");
	const mutedFgColor = useThemeColor("--color-muted-foreground");

	const chartData = useMemo(
		() =>
			timeSeries.map((point) => ({
				timestamp: point.timestamp,
				heartRate: point.heartRate || null,
			})),
		[timeSeries],
	);

	const hrZones = useMemo(() => calculateHrZones(profile), [profile]);

	const CustomTooltip = ({ active, payload, label }: any) => {
		if (active && payload && payload.length) {
			return (
				<div className="p-2 bg-background/80 border rounded-md shadow-lg backdrop-blur-sm">
					<p className="font-bold">{`Hora: ${formatTimestampToLocalTime(label)}`}</p>
					<p style={{ color: primaryColor }}>{`FC: ${payload[0].value} bpm`}</p>
				</div>
			);
		}
		return null;
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>Frequência Cardíaca (bpm)</CardTitle>
			</CardHeader>
			<CardContent>
				<ResponsiveContainer width="100%" height={250}>
					<AreaChart
						data={chartData}
						margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
						syncId="trainingSync"
					>
						<defs>
							<linearGradient id="colorHr" x1="0" y1="0" x2="0" y2="1">
								<stop offset="5%" stopColor={primaryColor} stopOpacity={0.8} />
								<stop offset="95%" stopColor={primaryColor} stopOpacity={0.1} />
							</linearGradient>
						</defs>

						{hrZones.map((zone) => (
							<ReferenceArea
								key={zone.label}
								y1={zone.y1}
								y2={zone.y2}
								strokeOpacity={0.2}
								fill={zone.color}
							/>
						))}

						<CartesianGrid
							strokeDasharray="3 3"
							vertical={false}
							opacity={0.3}
						/>
						<XAxis
							dataKey="timestamp"
							type="number"
							domain={["dataMin", "dataMax"]}
							tickFormatter={formatTimestampToLocalTime}
							stroke={mutedFgColor}
							fontSize={12}
						/>
						<YAxis
							stroke={mutedFgColor}
							fontSize={12}
							domain={["dataMin - 10", "dataMax + 10"]}
						/>
						<Tooltip content={<CustomTooltip />} />
						<Area
							type="monotone"
							dataKey="heartRate"
							stroke={primaryColor}
							fillOpacity={1}
							fill="url(#colorHr)"
							strokeWidth={2}
							connectNulls
						/>
					</AreaChart>
				</ResponsiveContainer>
			</CardContent>
		</Card>
	);
}
