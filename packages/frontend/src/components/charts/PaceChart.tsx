// packages/frontend/src/components/charts/PaceChart.tsx

import React, { useMemo } from "react";
import {
	AreaChart,
	Area,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UnifiedDataPoint } from "@/lib/types";
import { useThemeColor } from "@/hooks/useThemeColor";

const formatTimestampToLocalTime = (timestamp: number) => {
	if (isNaN(timestamp)) return "00:00";
	return new Date(timestamp).toLocaleTimeString(navigator.language, {
		hour: "2-digit",
		minute: "2-digit",
	});
};

const formatPaceToTime = (paceInMinutes: number) => {
	if (!paceInMinutes || paceInMinutes === Infinity || isNaN(paceInMinutes))
		return "00:00";
	const minutes = Math.floor(paceInMinutes);
	const seconds = Math.round((paceInMinutes - minutes) * 60);
	return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
		2,
		"0",
	)}`;
};

interface PaceChartProps {
	timeSeries: UnifiedDataPoint[];
}

export function PaceChart({ timeSeries }: PaceChartProps) {
	const destructiveColor = useThemeColor("--color-destructive");
	const mutedFgColor = useThemeColor("--color-muted-foreground");

	const chartData = useMemo(
		() =>
			timeSeries.map((point) => ({
				timestamp: point.timestamp,
				pace: point.speed > 0.5 ? 1000 / (point.speed * 60) : null,
			})),
		[timeSeries],
	);

	const CustomTooltip = ({ active, payload, label }: any) => {
		if (active && payload && payload.length) {
			const paceValue = payload[0].value;
			return (
				<div className="p-2 bg-background/80 border rounded-md shadow-lg backdrop-blur-sm">
					<p className="font-bold">{`Hora: ${formatTimestampToLocalTime(
						label,
					)}`}</p>
					<p style={{ color: destructiveColor }}>
						{`Pace: ${formatPaceToTime(paceValue)} min/km`}
					</p>
				</div>
			);
		}
		return null;
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>Ritmo (min/km)</CardTitle>
			</CardHeader>
			<CardContent>
				<ResponsiveContainer width="100%" height={250}>
					<AreaChart
						data={chartData}
						margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
						syncId="trainingSync"
					>
						<defs>
							<linearGradient id="colorPace" x1="0" y1="0" x2="0" y2="1">
								<stop
									offset="5%"
									stopColor={destructiveColor}
									stopOpacity={0.8}
								/>
								<stop
									offset="95%"
									stopColor={destructiveColor}
									stopOpacity={0.1}
								/>
							</linearGradient>
						</defs>

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
							reversed
							domain={["dataMin - 1", "dataMax + 1"]}
							tickFormatter={formatPaceToTime}
						/>
						<Tooltip content={<CustomTooltip />} />
						<Area
							type="monotone"
							dataKey="pace"
							stroke={destructiveColor}
							fillOpacity={1}
							fill="url(#colorPace)"
							strokeWidth={2}
							connectNulls
						/>
					</AreaChart>
				</ResponsiveContainer>
			</CardContent>
		</Card>
	);
}
