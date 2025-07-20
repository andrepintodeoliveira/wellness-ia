// src/pages/HomePage.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AthleteDataForm } from "@/components/forms/AthleteDataForm";
import { TrainingContextForm } from "@/components/forms/TrainingContextForm";
import { BorgScaleSlider } from "@/components/custom/BorgScaleSlider";
import { EmojiSatisfaction } from "@/components/custom/EmojiSatisfaction";
import { FileUploader } from "@/components/custom/FileUploader";
import { ModeToggle } from "@/components/theme/ModeToggle";
import { Button } from "@/components/ui/button";
import { AthleteProfile, TrainingContext, TrainingData } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

export function HomePage() {
	const navigate = useNavigate();

	const [formData, setFormData] = useState<{
		profile: AthleteProfile;
		context: TrainingContext;
	}>({
		profile: {
			birthDate: null,
			sex: null,
			height: null,
			weight: null,
			hrRest: null,
			hrMax: null,
		},
		context: {
			trainingObjective: null,
			fitnessLevel: null,
			weatherTemperature: null,
			weatherHumidity: null,
			sleepQuality: null,
			perceivedEffort: 1,
			satisfaction: null,
			sleepHours: null,
		},
	});

	const [trainingData, setTrainingData] = useState<TrainingData | null>(null);
	const [processingError, setProcessingError] = useState<string>("");
	const [isLoading, setIsLoading] = useState(false);

	const handleFormChange = <T extends "profile" | "context">(
		section: T,
		field: keyof (T extends "profile" ? AthleteProfile : TrainingContext),
		value: any,
	) => {
		let finalValue = value;
		if (typeof value === "string") {
			if (value === "") {
				finalValue = null;
			} else {
				const numValue = Number(value);
				if (!isNaN(numValue)) {
					finalValue = numValue;
				}
			}
		}
		setFormData((prev) => ({
			...prev,
			[section]: { ...prev[section], [field]: finalValue },
		}));
	};

	const handleAnalyzeClick = async () => {
		if (
			!trainingData ||
			!formData.profile.birthDate ||
			!formData.profile.sex ||
			!formData.profile.hrMax
		) {
			setProcessingError(
				"Por favor, preencha todos os campos e envie os arquivos do treino.",
			);
			return;
		}

		setIsLoading(true);
		setProcessingError("");

		try {
			const response = await fetch("http://localhost:3001/api/process/start", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ formData, trainingData }),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Falha ao iniciar a análise.");
			}

			const { jobId } = await response.json();
			if (jobId) {
				// Armazena o ID do job e o perfil do atleta para uso posterior
				localStorage.setItem("analysisJobId", jobId);
				localStorage.setItem(
					"analysisProfile",
					JSON.stringify(formData.profile),
				);
				navigate("/processing");
			} else {
				throw new Error("Não foi possível obter o ID do job do servidor.");
			}
		} catch (error) {
			if (error instanceof Error) {
				setProcessingError(error.message);
			} else {
				setProcessingError("Ocorreu um erro desconhecido.");
			}
			setIsLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8">
			<div className="max-w-7xl mx-auto">
				<header className="mb-8 flex justify-between items-start">
					<div>
						<h1 className="text-4xl font-bold tracking-tight text-primary">
							TPhysio Analyzer
						</h1>
						<p className="text-muted-foreground mt-2">
							Sua análise fisiológica de treino potencializada por IA. Preencha
							os campos abaixo e envie seus arquivos.
						</p>
					</div>
					<ModeToggle />
				</header>

				{processingError && (
					<Alert
						variant="destructive"
						className="mb-4"
						onClick={() => setProcessingError("")}
					>
						<AlertTitle>Erro</AlertTitle>
						<AlertDescription>{processingError}</AlertDescription>
					</Alert>
				)}

				<main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<div className="lg:col-span-2 flex flex-col gap-6">
						<AthleteDataForm
							profileData={formData.profile}
							onFieldChange={(field, value) =>
								handleFormChange("profile", field, value)
							}
						/>
						<TrainingContextForm
							contextData={formData.context}
							onFieldChange={(field, value) =>
								handleFormChange("context", field, value)
							}
						/>
						<FileUploader
							onDataProcessed={setTrainingData}
							onProcessingError={setProcessingError}
						/>
					</div>
					<div className="lg:col-span-1 flex flex-col gap-6">
						<BorgScaleSlider
							value={formData.context.perceivedEffort}
							onValueChange={(value) =>
								handleFormChange("context", "perceivedEffort", value)
							}
						/>
						<EmojiSatisfaction
							value={formData.context.satisfaction}
							onValueChange={(value) =>
								handleFormChange("context", "satisfaction", value)
							}
						/>
					</div>
				</main>

				<footer className="mt-8 flex justify-end">
					<Button
						size="lg"
						className="px-8 py-6 text-lg"
						onClick={handleAnalyzeClick}
						disabled={isLoading}
					>
						{isLoading ? (
							<>
								{" "}
								<Loader2 className="mr-2 h-6 w-6 animate-spin" /> Iniciando
								Análise...{" "}
							</>
						) : (
							"Analisar Treino"
						)}
					</Button>
				</footer>
			</div>
		</div>
	);
}
