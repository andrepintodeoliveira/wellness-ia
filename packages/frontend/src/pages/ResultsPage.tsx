// src/pages/ResultsPage.tsx
import React, { useRef, useEffect } from "react"; // Importar useEffect
import { useLocation, Link } from "react-router-dom";
import { Button, buttonVariants } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";
import { MasterChart } from "@/components/charts/MasterChart";
import ReactMarkdown from "react-markdown";
import { useReactToPrint } from "react-to-print";
import { cn } from "@/lib/utils";

export function ResultsPage() {
	const location = useLocation();
	const analysisContentRef = useRef(null);

	const { analysisResult, profile } = location.state || {};
	const { analysisText, enrichedTimeSeries, weatherInfo, decouplingChartData } =
		analysisResult || {};

	// --- LOG DE DEPURAÇÃO ---
	// Este bloco será executado uma vez quando a página carregar
	useEffect(() => {
		console.log("--- [DEBUG] DADOS RECEBIDOS NA PÁGINA DE RESULTADOS ---");
		console.log("1. Objeto Completo (analysisResult):", analysisResult);
		console.log("2. Perfil do Atleta (profile):", profile);
		console.log(
			"3. Série Temporal para Gráficos (enrichedTimeSeries):",
			enrichedTimeSeries,
		);

		if (enrichedTimeSeries && enrichedTimeSeries.length > 0) {
			console.log(
				` -> A Série Temporal contém ${enrichedTimeSeries.length} pontos.`,
			);
			console.log(
				" -> Exemplo do PRIMEIRO ponto de dados:",
				enrichedTimeSeries[0],
			);
			console.log(
				" -> Exemplo do ÚLTIMO ponto de dados:",
				enrichedTimeSeries[enrichedTimeSeries.length - 1],
			);
		} else {
			console.warn(
				" -> AVISO: A Série Temporal está vazia ou não foi recebida.",
			);
		}
		console.log("---------------------------------------------------------");
	}, [analysisResult, profile]); // Dependências para o useEffect

	const handlePrint = useReactToPrint({
		content: () => analysisContentRef.current,
		documentTitle: `Analise-Treino-${new Date().toISOString().split("T")[0]}`,
	});

	if (!analysisResult) {
		return (
			<div className="flex flex-col items-center justify-center h-screen bg-background text-foreground">
				<h2 className="text-2xl font-bold mb-4">
					Nenhum dado de análise encontrado.
				</h2>
				<p className="text-muted-foreground mb-6">
					Por favor, volte para a página inicial e analise um treino primeiro.
				</p>
				<Link to="/" className={cn(buttonVariants({ variant: "outline" }))}>
					<ArrowLeft className="mr-2 h-4 w-4" />
					Voltar para a Home
				</Link>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8">
			<div className="max-w-7xl mx-auto">
				<header className="mb-8 flex justify-between items-center">
					<Link to="/" className={cn(buttonVariants({ variant: "outline" }))}>
						<ArrowLeft className="mr-2 h-4 w-4" />
						Analisar Outro Treino
					</Link>
					<Button variant="secondary" onClick={handlePrint}>
						<Printer className="mr-2 h-4 w-4" />
						Imprimir Análise
					</Button>
				</header>

				<div ref={analysisContentRef} className="p-2">
					<h1 className="text-4xl font-bold tracking-tight text-primary mt-4 mb-8">
						Dashboard da Análise
					</h1>
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
						<div className="lg:col-span-2 flex flex-col gap-6">
							<div className="p-4 sm:p-6 border rounded-lg">
								<h3 className="font-semibold mb-4 text-lg">
									Performance ao Longo do Tempo
								</h3>
								{enrichedTimeSeries && profile ? (
									<MasterChart
										timeSeries={enrichedTimeSeries}
										profile={profile}
									/>
								) : (
									<div className="h-96 bg-secondary rounded-md flex items-center justify-center">
										<p>Dados insuficientes para o gráfico.</p>
									</div>
								)}
							</div>
							<div className="p-6 border rounded-lg">
								<h3 className="font-semibold mb-4 text-lg">Mapa do Percurso</h3>
								<div className="h-96 bg-secondary rounded-md flex items-center justify-center">
									<p>Route Map Placeholder</p>
								</div>
							</div>
						</div>

						<div className="lg:col-span-1 flex flex-col gap-6">
							<div className="p-6 border rounded-lg">
								<h3 className="font-semibold mb-4 text-lg">
									Análise do Dr. Fit (IA)
								</h3>
								<div className="prose prose-sm dark:prose-invert max-h-[60vh] overflow-y-auto">
									<ReactMarkdown>
										{analysisText || "Nenhuma análise gerada."}
									</ReactMarkdown>
								</div>
							</div>
							<div className="p-6 border rounded-lg">
								<h3 className="font-semibold mb-4 text-lg">Métricas Chave</h3>
								<div className="h-64 bg-secondary rounded-md flex items-center justify-center">
									<p>Key Metrics Placeholder</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
