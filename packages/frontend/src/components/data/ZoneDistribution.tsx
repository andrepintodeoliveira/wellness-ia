// packages/frontend/src/components/data/ZoneDistribution.tsx

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const zoneColors = [
	"bg-sky-500",
	"bg-green-500",
	"bg-yellow-500",
	"bg-orange-500",
	"bg-red-500",
];

interface ZoneData {
	zone: string;
	percentage: string;
	time: string;
}

interface ZoneDistributionProps {
	zoneData: ZoneData[] | null;
	title: string;
}

export function ZoneDistribution({ zoneData, title }: ZoneDistributionProps) {
	if (!zoneData || zoneData.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>{title}</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground">
						Dados insuficientes para exibir a distribuição de zonas.
					</p>
				</CardContent>
			</Card>
		);
	}

	const reversedZoneData = [...zoneData].reverse();

	return (
		<Card>
			<CardHeader>
				<CardTitle>{title}</CardTitle>
			</CardHeader>
			<CardContent className="space-y-2">
				{reversedZoneData.map((zone, index) => {
					const originalIndex = 4 - index;
					return (
						<div key={zone.zone} className="flex items-center text-sm">
							<div className="w-1/4 flex items-center">
								<div
									className={cn(
										"w-2 h-4 rounded-sm mr-2",
										zoneColors[originalIndex],
									)}
								/>
								<span className="font-semibold">{`Z${originalIndex + 1}`}</span>
							</div>
							<div className="w-1/2 bg-secondary rounded-full h-4 mr-2">
								<div
									className={cn("h-4 rounded-full", zoneColors[originalIndex])}
									style={{ width: `${zone.percentage}%` }}
								/>
							</div>
							<div className="w-1/4 text-right text-muted-foreground">
								<span className="font-mono">{`${zone.percentage}%`}</span>
								<span className="ml-2 font-mono">({zone.time})</span>
							</div>
						</div>
					);
				})}
			</CardContent>
		</Card>
	);
}
