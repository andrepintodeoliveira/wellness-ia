// src/components/custom/EmojiSatisfaction.tsx
import * as React from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

export interface EmojiSatisfactionProps {
	onValueChange?: (value: number) => void;
}

const satisfactionLevels = [
	{ value: 1, emoji: "😞", label: "Péssimo" },
	{ value: 2, emoji: "😐", label: "Ruim" },
	{ value: 3, emoji: "🙂", label: "Ok" },
	{ value: 4, emoji: "😊", label: "Bom" },
	{ value: 5, emoji: "😍", label: "Ótimo" },
];

export function EmojiSatisfaction({ onValueChange }: EmojiSatisfactionProps) {
	const [selectedValue, setSelectedValue] = React.useState<number | null>(null);

	const handleValueChange = (value: string) => {
		const numericValue = Number(value);
		setSelectedValue(numericValue);
		if (onValueChange) {
			onValueChange(numericValue);
		}
	};

	return (
		// CORREÇÃO: O contêiner agora é um <fieldset> sem bordas padrão
		<fieldset className="flex flex-col items-center justify-center space-y-2 rounded-lg border p-6 h-full">
			{/* CORREÇÃO: A Label principal foi trocada por uma <legend> com estilos de label */}
			<legend className="text-center font-semibold mb-4 px-1">
				Nível de Satisfação com o Treino
			</legend>
			<RadioGroup
				onValueChange={handleValueChange}
				className="flex justify-around w-full pt-2"
				// O 'aria-labelledby' não é mais necessário aqui
			>
				{satisfactionLevels.map((level) => (
					<div
						key={level.value}
						className="flex flex-col items-center space-y-2"
					>
						<RadioGroupItem
							value={String(level.value)}
							id={`satisfaction-${level.value}`}
							className="sr-only"
						/>
						{/* O componente Label do shadcn renderiza uma <label>, o que é correto aqui */}
						<Label
							htmlFor={`satisfaction-${level.value}`}
							className={cn(
								"text-4xl p-2 rounded-full cursor-pointer transition-all duration-200 ease-in-out",
								selectedValue === level.value
									? "transform scale-125 bg-accent"
									: "grayscale opacity-60 hover:opacity-100 hover:grayscale-0",
							)}
						>
							{level.emoji}
						</Label>
						<span className="text-xs text-muted-foreground text-center w-16">
							{level.label}
						</span>
					</div>
				))}
			</RadioGroup>
		</fieldset>
	);
}
