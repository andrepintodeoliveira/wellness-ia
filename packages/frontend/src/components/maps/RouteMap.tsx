// packages/frontend/src/pages/ResultsPage.tsx

import React, { useRef, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { Button, buttonVariants } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useReactToPrint } from "react-to-print";
import { cn } from "@/lib/utils";

import { ZoneDistribution } from "@/components/data/ZoneDistribution";
import { KeyMetricsDisplay } from "@/components/data/KeyMetricsDisplay";
import { HeartRateChart } from "@/components/charts/HeartRateChart";
import { PaceChart } from "@/components/charts/PaceChart";
// import { RouteMap } from "@/components/maps/RouteMap"; // <-- TEMPORARIAMENTE REMOVIDO
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ResultsPage() {
	const location = useLocation();
	const analysisContentRef = useRef(null);

	const { analysisResult, profile } = location.state || {};
	const { analysisText, enrichedTimeSeries, keyMetrics } = analysisResult || {};

	useEffect(() => {
		if (analysisResult) {
			console.log("--- [DEBUG] OBJETO COMPLETO RECEBIDO NA ResultsPage ---");
			console.log(JSON.stringify(analysisResult, null, 2));
			console.log("---------------------------------------------------------");
		}
	}, [analysisResult]);

	const handlePrint = useReactToPrint({
		content: () => analysisContentRef.current,
		documentTitle: `Analise-Treino-${new Date().toISOString().split("T")[0]}`,
	});

	if (!analysisResult || !profile) {
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
				<header className="mb-8 flex justify-between items-center print:hidden">
					<Link to="/" className={cn(buttonVariants({ variant: "outline" }))}>
						<ArrowLeft className="mr-2 h-4 w-4" />
						Analisar Outro Treino
					</Link>
					<Button variant="secondary" onClick={handlePrint}>
						<Printer className="mr-2 h-4 w-4" />
						Imprimir Análise
					</Button>
				</header>

				<div ref={analysisContentRef} className="p-2 space-y-6">
					<h1 className="text-4xl font-bold tracking-tight text-primary mt-4 mb-8">
						Dashboard da Análise
					</h1>

					<main className="grid grid-cols-1 lg:grid-cols-5 gap-6">
						<div className="lg:col-span-3 flex flex-col gap-6">
							{/* <RouteMap timeSeries={enrichedTimeSeries} /> */}{" "}
							{/* <-- TEMPORARIAMENTE REMOVIDO */}
							<HeartRateChart
								timeSeries={enrichedTimeSeries}
								profile={profile}
							/>
							<PaceChart timeSeries={enrichedTimeSeries} />
						</div>

						<div className="lg:col-span-2 flex flex-col gap-6">
							<ZoneDistribution
								zoneData={keyMetrics.zoneDistribution}
								title="Zonas de Frequência Cardíaca"
							/>
							<KeyMetricsDisplay metrics={keyMetrics} />
						</div>
					</main>

					<footer className="col-span-1 lg:col-span-5">
						<Card>
							<CardHeader>
								<CardTitle>Análise do Dr. Fit (IA)</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="prose prose-sm dark:prose-invert max-w-none">
									<ReactMarkdown>{analysisText}</ReactMarkdown>
								</div>
							</CardContent>
						</Card>
					</footer>
				</div>
			</div>
		</div>
	);
}
