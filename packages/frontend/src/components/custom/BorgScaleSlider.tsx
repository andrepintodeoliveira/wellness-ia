// src/components/custom/BorgScaleSlider.tsx
import * as React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
// CORREÇÃO: Importa nosso novo componente de slider customizado
import { CustomSlider } from "@/components/ui/custom-slider";

const borgLevels = [
	{ value: 1, label: "Muito fácil", color: "bg-sky-400", hsl: "206 90% 55%" },
	{ value: 2, label: "Fácil", color: "bg-teal-400", hsl: "162 65% 52%" },
	{ value: 3, label: "Moderado", color: "bg-green-400", hsl: "142 76% 36%" },
	{
		value: 4,
		label: "Ligeiramente intensa",
		color: "bg-lime-400",
		hsl: "84 78% 50%",
	},
	{ value: 5, label: "Intensa", color: "bg-yellow-400", hsl: "48 96% 53%" },
	{
		value: 6,
		label: "Bastante intensa",
		color: "bg-amber-400",
		hsl: "39 96% 54%",
	},
	{
		value: 7,
		label: "Muito intensa",
		color: "bg-orange-400",
		hsl: "25 95% 53%",
	},
	{
		value: 8,
		label: "Extremamente intensa",
		color: "bg-orange-500",
		hsl: "25 95% 53%",
	},
	{ value: 9, label: "Quase máxima", color: "bg-red-500", hsl: "0 84% 60%" },
	{ value: 10, label: "Máxima", color: "bg-rose-500", hsl: "346 84% 60%" },
];

export interface BorgScaleProps {
	value?: number | null;
	onValueChange?: (value: number) => void;
}

export function BorgScaleSlider({ value = 1, onValueChange }: BorgScaleProps) {
	const displayValue = value || 1;
	const currentLevel =
		borgLevels.find((l) => l.value === displayValue) || borgLevels[0];

	const handleSliderChange = (sliderValue: number[]) => {
		const selectedValue = sliderValue[0];
		if (onValueChange) {
			onValueChange(selectedValue);
		}
	};

	const hiddenInputId = "borg-scale-hidden-input";

	return (
		<div className="flex flex-col space-y-4 rounded-lg border p-4 h-full">
			<div
				className={cn(
					"w-full p-3 rounded-md text-center text-white font-bold text-lg shadow-md",
					currentLevel.color,
				)}
			>
				{currentLevel.value}. {currentLevel.label}
			</div>

			<div className="flex-grow flex items-center justify-center gap-6 pt-2">
				<Label htmlFor={hiddenInputId} className="sr-only">
					Nível de Esforço Percebido
				</Label>
				<input
					id={hiddenInputId}
					type="range"
					min={1}
					max={10}
					value={displayValue}
					onChange={() => {}}
					className="sr-only"
				/>

				{/* CORREÇÃO: Usando o componente importado */}
				<CustomSlider
					value={[displayValue]}
					min={1}
					max={10}
					step={1}
					orientation="vertical"
					className="h-full"
					style={{ "--primary": currentLevel.hsl } as React.CSSProperties}
					onValueChange={handleSliderChange}
				/>
			</div>
		</div>
	);
}
