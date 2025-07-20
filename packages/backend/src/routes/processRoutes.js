// TPhysio-Analyzer-Backend/src/routes/processRoutes.js
import { Router } from "express";
import crypto from "crypto";
import { jobManager } from "../services/JobManager.js";

const router = Router();

// Endpoint para iniciar um novo job
router.post("/start", (req, res) => {
	const { formData, trainingData } = req.body;
	if (!formData || !trainingData) {
		return res.status(400).json({ error: "Dados inválidos." });
	}

	const jobId = crypto.randomUUID();
	jobManager.createJob(jobId, { formData, trainingData });

	res.status(202).json({ jobId }); // 202 Accepted
});

// Endpoint para verificar o status de um job
router.get("/status/:jobId", (req, res) => {
	const { jobId } = req.params;
	const job = jobManager.getJob(jobId);

	if (!job) {
		return res.status(404).json({ error: "Job não encontrado." });
	}

	// Se o job estiver concluído, retorna o resultado completo
	if (job.status === "concluido") {
		res.json({
			status: job.status,
			progress: job.progress,
			message: job.message,
			result: job.result, // Contém os dados finais
		});
	} else {
		// Senão, retorna apenas o status e progresso
		res.json({
			status: job.status,
			progress: job.progress,
			message: job.message,
			error: job.error,
		});
	}
});

// Endpoint para cancelar um job
router.post("/cancel", (req, res) => {
	const { jobId } = req.body;
	if (!jobId) {
		return res.status(400).json({ error: "jobId não fornecido." });
	}
	jobManager.cancelJob(jobId);
	res.json({ success: true, message: "Solicitação de cancelamento recebida." });
});

export default router;
