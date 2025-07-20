// src/components/forms/AthleteDataForm.tsx
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
import { AthleteProfile } from "@/lib/types";

interface AthleteDataFormProps {
	profileData: AthleteProfile;
	onFieldChange: (field: keyof AthleteProfile, value: string | null) => void;
}

export function AthleteDataForm({
	profileData,
	onFieldChange,
}: AthleteDataFormProps) {
	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		onFieldChange(e.target.id as keyof AthleteProfile, e.target.value);
	};

	// CORREÇÃO DE TIPO: A função agora aceita 'string', como esperado pelo componente <Select>.
	// A conversão de tipo (assertion) acontece na chamada para onFieldChange.
	const handleSelectChange = (value: string) => {
		onFieldChange("sex", value as "male" | "female");
	};

	const formatNumericValue = (value: number | null) => {
		return value === null ? "" : value;
	};

	return (
		<Card className="w-full">
			<CardHeader>
				<CardTitle>Dados do Atleta</CardTitle>
				<CardDescription>
					Preencha suas informações para uma análise fisiológica precisa.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form>
					<div className="grid w-full items-center gap-4">
						<div className="flex flex-col space-y-1.5">
							<Label htmlFor="birthDate">Data de Nascimento</Label>
							<Input
								id="birthDate"
								type="date"
								value={profileData.birthDate || ""}
								onChange={handleChange}
							/>
						</div>
						<div className="flex flex-col space-y-1.5">
							<Label htmlFor="sex">Sexo</Label>
							<Select
								name="sex"
								onValueChange={handleSelectChange}
								value={profileData.sex || ""}
							>
								<SelectTrigger id="sex">
									<SelectValue placeholder="Selecione o sexo" />
								</SelectTrigger>
								<SelectContent position="popper">
									<SelectItem value="male">Masculino</SelectItem>
									<SelectItem value="female">Feminino</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="flex flex-row gap-4">
							<div className="flex flex-col space-y-1.5 w-1/2">
								<Label htmlFor="height">Altura (cm)</Label>
								<Input
									id="height"
									type="number"
									placeholder="Ex: 177"
									value={formatNumericValue(profileData.height)}
									onChange={handleChange}
								/>
							</div>
							<div className="flex flex-col space-y-1.5 w-1/2">
								<Label htmlFor="weight">Peso (kg)</Label>
								<Input
									id="weight"
									type="number"
									placeholder="Ex: 95"
									value={formatNumericValue(profileData.weight)}
									onChange={handleChange}
								/>
							</div>
						</div>
						<div className="flex flex-row gap-4">
							<div className="flex flex-col space-y-1.5 w-1/2">
								<Label htmlFor="hrRest">FC de Repouso (bpm)</Label>
								<Input
									id="hrRest"
									type="number"
									placeholder="Ex: 55"
									value={formatNumericValue(profileData.hrRest)}
									onChange={handleChange}
								/>
							</div>
							<div className="flex flex-col space-y-1.5 w-1/2">
								<Label htmlFor="hrMax">FC Máxima (bpm)</Label>
								<Input
									id="hrMax"
									type="number"
									placeholder="Ex: 187"
									value={formatNumericValue(profileData.hrMax)}
									onChange={handleChange}
								/>
							</div>
						</div>
					</div>
				</form>
			</CardContent>
		</Card>
	);
}
