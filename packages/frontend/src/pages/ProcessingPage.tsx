// src/pages/ProcessingPage.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

interface JobStatus {
	status: "iniciando" | "processando" | "concluido" | "falhou" | "cancelado";
	progress: number;
	message: string;
	result?: any;
	error?: string;
}

export function ProcessingPage() {
	const navigate = useNavigate();
	const [jobId, setJobId] = useState<string | null>(
		localStorage.getItem("analysisJobId"),
	);
	const [status, setStatus] = useState<JobStatus>({
		status: "iniciando",
		progress: 0,
		message: "Conectando ao servidor...",
	});

	useEffect(() => {
		// Se não houver jobId, volta para a home
		if (!jobId) {
			navigate("/");
			return;
		}

		// Função de polling para verificar o status
		const pollStatus = async () => {
			try {
				const response = await fetch(
					`http://localhost:3001/api/process/status/${jobId}`,
				);
				if (!response.ok) {
					// Se o job não for encontrado (ex: servidor reiniciou), limpa e volta
					if (response.status === 404) {
						console.error("Job não encontrado no servidor. Limpando...");
						localStorage.removeItem("analysisJobId");
						navigate("/");
					}
					throw new Error(`Erro ao verificar status: ${response.statusText}`);
				}

				const data: JobStatus = await response.json();
				setStatus(data);

				if (data.status === "concluido") {
					console.log("Processo concluído! Navegando para os resultados.");
					localStorage.removeItem("analysisJobId");
					// Passa o resultado completo e o perfil que já estava no state
					navigate("/results", {
						state: {
							analysisResult: data.result,
							profile: JSON.parse(localStorage.getItem("analysisProfile")!),
						},
					});
					localStorage.removeItem("analysisProfile"); // Limpa o perfil
				} else if (data.status === "falhou") {
					console.error("O job falhou no backend:", data.error);
					localStorage.removeItem("analysisJobId");
					localStorage.removeItem("analysisProfile");
				}
			} catch (error) {
				console.error(error);
				setStatus((prev) => ({
					...prev,
					status: "falhou",
					message: "Erro de conexão com o servidor.",
				}));
			}
		};

		// Inicia o polling
		const intervalId = setInterval(pollStatus, 5000); // Verifica a cada 5 segundos

		// Limpa o intervalo quando o componente é desmontado ou o job termina
		return () => {
			clearInterval(intervalId);
		};
	}, [jobId, navigate, status.status]); // Adicionado status.status para parar o polling quando concluído

	const handleCancel = async () => {
		// Pede confirmação ao usuário
		const isConfirmed = window.confirm(
			"Você tem certeza que deseja cancelar a análise?\n\nTodo o progresso será perdido e você voltará para a página inicial.",
		);

		if (isConfirmed && jobId) {
			try {
				await fetch("http://localhost:3001/api/process/cancel", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ jobId }),
				});
			} finally {
				// Independentemente do sucesso da chamada, limpa tudo no frontend
				localStorage.removeItem("analysisJobId");
				localStorage.removeItem("analysisProfile");
				navigate("/");
			}
		}
	};

	return (
		<div className="flex flex-col items-center justify-center h-screen bg-background text-foreground p-4">
			<div className="w-full max-w-md text-center">
				<Loader2 className="h-12 w-12 mx-auto animate-spin text-primary mb-6" />
				<h1 className="text-2xl font-bold mb-2">Análise em Andamento</h1>
				<p className="text-muted-foreground mb-6">{status.message}</p>
				<Progress value={status.progress} className="w-full mb-8" />

				{status.status !== "concluido" && status.status !== "falhou" && (
					<Button variant="outline" onClick={handleCancel}>
						Cancelar Análise
					</Button>
				)}
				{status.status === "falhou" && (
					<div className="text-destructive">
						<p>Ocorreu um erro. Por favor, tente novamente.</p>
						<Button
							variant="destructive"
							onClick={() => navigate("/")}
							className="mt-4"
						>
							Voltar para a Home
						</Button>
					</div>
				)}
			</div>
		</div>
	);
}
