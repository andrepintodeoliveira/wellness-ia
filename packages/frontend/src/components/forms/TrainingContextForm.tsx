// src/components/forms/TrainingContextForm.tsx
import * as React from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { TrainingContext } from "@/lib/types";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

const sleepQualityLevels = [
	{ value: 1, emoji: "😴", label: "Péssima" },
	{ value: 2, emoji: "😟", label: "Ruim" },
	{ value: 3, emoji: "😐", label: "Ok" },
	{ value: 4, emoji: "😊", label: "Boa" },
	{ value: 5, emoji: "🤩", label: "Ótima" },
];

interface TrainingContextFormProps {
	contextData: TrainingContext;
	onFieldChange: (field: keyof TrainingContext, value: any) => void;
}

export function TrainingContextForm({
	contextData,
	onFieldChange,
}: TrainingContextFormProps) {
	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		onFieldChange(e.target.id as keyof TrainingContext, e.target.value);
	};

	const handleSelectChange =
		(field: keyof TrainingContext) => (value: string) => {
			onFieldChange(field, value);
		};

	const handleRadioChange = (valueStr: string) => {
		onFieldChange("sleepQuality", Number(valueStr));
	};

	const formatNumericValue = (value: number | null) => {
		return value === null ? "" : value;
	};

	return (
		<Card className="w-full">
			<CardHeader>
				<CardTitle>Contexto do Treino</CardTitle>
				<CardDescription>
					Informações sobre o objetivo e as condições do seu treino.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form className="grid gap-6">
					<div className="flex flex-col space-y-1.5">
						<Label htmlFor="trainingObjective">Objetivo do Treino</Label>
						<Select
							name="trainingObjective"
							onValueChange={handleSelectChange("trainingObjective")}
							value={contextData.trainingObjective || ""}
						>
							<SelectTrigger id="trainingObjective">
								<SelectValue placeholder="Selecione o objetivo" />
							</SelectTrigger>
							<SelectContent position="popper">
								<SelectItem value="recovery">Recuperação</SelectItem>
								<SelectItem value="tempo_run">Tempo Run</SelectItem>
								<SelectItem value="interval">Intervalado</SelectItem>
								<SelectItem value="long_slow">Longo Lento</SelectItem>
								<SelectItem value="race">Prova</SelectItem>
								<SelectItem value="tc6m">
									Teste de Caminhada 6 Min (TC6M)
								</SelectItem>
								<SelectItem value="cooper_test">
									Teste de Corrida 12 Min (Cooper)
								</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="flex flex-col space-y-1.5">
						<Label htmlFor="fitnessLevel">Nível de Condicionamento</Label>
						<Select
							name="fitnessLevel"
							onValueChange={handleSelectChange("fitnessLevel")}
							value={contextData.fitnessLevel || ""}
						>
							<SelectTrigger id="fitnessLevel">
								<SelectValue placeholder="Selecione seu nível" />
							</SelectTrigger>
							<SelectContent position="popper">
								<SelectItem value="beginner">Iniciante</SelectItem>
								<SelectItem value="intermediate">Intermediário</SelectItem>
								<SelectItem value="advanced">Avançado</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{/* CORREÇÃO DE ACESSIBILIDADE: Usando fieldset e legend */}
					<fieldset className="flex flex-col space-y-3">
						<legend className="text-sm font-medium leading-none">
							Qualidade e Duração do Sono
						</legend>
						<div className="flex items-end gap-4 rounded-lg border p-4">
							<div className="w-3/4">
								<RadioGroup
									onValueChange={handleRadioChange}
									value={String(contextData.sleepQuality || "")}
									className="flex justify-around items-end pt-2"
									aria-label="Qualidade do sono" // Adiciona um rótulo acessível ao grupo
								>
									{sleepQualityLevels.map((level) => (
										<div
											key={level.value}
											className="flex flex-col items-center space-y-2"
										>
											<RadioGroupItem
												value={String(level.value)}
												id={`sleep-${level.value}`}
												className="sr-only"
											/>
											<Label
												htmlFor={`sleep-${level.value}`}
												className={cn(
													"text-3xl p-2 rounded-full cursor-pointer transition-all duration-200 ease-in-out",
													contextData.sleepQuality === level.value
														? "transform scale-125 bg-accent"
														: "grayscale opacity-60 hover:opacity-100 hover:grayscale-0",
												)}
											>
												{level.emoji}
											</Label>
											<span className="text-xs text-muted-foreground">
												{level.label}
											</span>
										</div>
									))}
								</RadioGroup>
							</div>
							<div className="flex-grow flex flex-col space-y-1.5">
								<Label htmlFor="sleepHours" className="text-sm">
									Horas
								</Label>
								<Input
									id="sleepHours"
									type="number"
									placeholder="Ex: 8"
									value={formatNumericValue(contextData.sleepHours)}
									onChange={handleChange}
								/>
							</div>
						</div>
					</fieldset>

					<div className="flex flex-row gap-4">
						<div className="flex flex-col space-y-1.5 w-1/2">
							<Label htmlFor="weatherTemperature">Temperatura (°C)</Label>
							<Input
								id="weatherTemperature"
								type="number"
								placeholder="Opcional"
								value={formatNumericValue(contextData.weatherTemperature)}
								onChange={handleChange}
							/>
						</div>
						<div className="flex flex-col space-y-1.5 w-1/2">
							<Label htmlFor="weatherHumidity">Umidade (%)</Label>
							<Input
								id="weatherHumidity"
								type="number"
								placeholder="Opcional"
								value={formatNumericValue(contextData.weatherHumidity)}
								onChange={handleChange}
							/>
						</div>
					</div>
				</form>
			</CardContent>
		</Card>
	);
}
