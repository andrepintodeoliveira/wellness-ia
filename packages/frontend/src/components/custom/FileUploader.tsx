// src/components/custom/FileUploader.tsx
import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { processAndUnifyFiles } from "@/utils/dataProcessor";
import { TrainingData } from "@/lib/types";

// A CORREÇÃO ESTÁ AQUI: A estrutura do objeto foi ajustada.
const acceptedFileTypes = {
	"text/csv": [".csv"],
	"application/vnd.garmin.tcx+xml": [".tcx"],
	"application/gpx+xml": [".gpx"],
	"text/xml": [".tcx", ".gpx"], // Chave separada para o fallback de XML genérico
};

interface FileUploaderProps {
	onDataProcessed: (data: TrainingData) => void;
	onProcessingError: (error: string) => void;
}

export function FileUploader({
	onDataProcessed,
	onProcessingError,
}: FileUploaderProps) {
	const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
	const [isProcessing, setIsProcessing] = useState(false);

	const onDrop = useCallback(
		async (acceptedFiles: File[]) => {
			// Limpa o estado visual para novos uploads
			setUploadedFiles([]);
			onProcessingError("");

			if (acceptedFiles.length === 0) {
				// Se o dropzone rejeitou os arquivos, a lista estará vazia.
				// O próprio dropzone já fornece feedback visual (borda vermelha)
				console.log("Nenhum arquivo válido foi aceito.");
				return;
			}

			setUploadedFiles(acceptedFiles);
			setIsProcessing(true);

			try {
				const unifiedData = await processAndUnifyFiles(acceptedFiles);
				onDataProcessed(unifiedData);
			} catch (error) {
				console.error("Erro no processamento dos arquivos:", error);
				if (error instanceof Error) {
					onProcessingError(error.message);
				} else {
					onProcessingError("Ocorreu um erro desconhecido.");
				}
				// Limpa a lista de arquivos em caso de erro no processamento
				setUploadedFiles([]);
			} finally {
				setIsProcessing(false);
			}
		},
		[onDataProcessed, onProcessingError],
	);

	const {
		getRootProps,
		getInputProps,
		isDragActive,
		isDragAccept,
		isDragReject,
	} = useDropzone({
		onDrop,
		accept: acceptedFileTypes,
		disabled: isProcessing,
	});

	const fileList = uploadedFiles.map((file) => (
		<li key={file.name} className="text-sm text-muted-foreground">
			{file.name} - {(file.size / 1024).toFixed(2)} KB
		</li>
	));

	return (
		<Card className="w-full">
			<CardHeader>
				<CardTitle>Upload dos Arquivos</CardTitle>
				<CardDescription>
					Envie os arquivos .TCX, .GPX e .CSV do seu treino.
				</CardDescription>
			</CardHeader>
			<CardContent className="grid gap-4">
				<div
					{...getRootProps()}
					className={cn(
						"border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors duration-200 ease-in-out",
						isProcessing && "bg-secondary/50 cursor-not-allowed",
						isDragAccept && "border-green-500 bg-green-100/50",
						isDragReject && "border-red-500 bg-red-100/50",
						isDragActive && !isDragReject && !isDragAccept && "border-primary",
					)}
				>
					<input {...getInputProps()} />
					{isProcessing ? (
						<p>Processando dados...</p>
					) : isDragActive ? (
						<p>Solte os arquivos aqui...</p>
					) : (
						<p>Arraste e solte os arquivos aqui, ou clique para selecionar</p>
					)}
					<p className="text-xs text-muted-foreground mt-2">
						Tipos suportados: .csv, .gpx, .tcx
					</p>
				</div>
				{uploadedFiles.length > 0 && !isProcessing && (
					<div>
						<h4 className="font-semibold">Arquivos para Análise:</h4>
						<ul className="list-disc pl-5 mt-2">{fileList}</ul>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
