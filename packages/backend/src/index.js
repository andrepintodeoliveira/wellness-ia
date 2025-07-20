// backend/src/index.js
import express from "express";
import cors from "cors";
import "dotenv/config";
import analyzeRoutes from "./routes/analyzeRoute.js";
import processRoutes from "./routes/processRoutes.js";

const app = express();
const host = process.env.HOST || "localhost"; // Usa a variável do .env ou localhost como padrão
const port = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Rota de teste
app.get("/", (req, res) => {
	res.send("Backend TPhysio Analyzer está no ar! (Estrutura SRC)");
});

// Use as rotas importadas com um prefixo /api
// Agora nosso endpoint será http://localhost:3001/api/analyze
app.use("/api", analyzeRoutes);

// Use as rotas de processamento
app.use("/api/process", processRoutes);

// Inicie o servidor
app.listen(port, host, () => {
	console.log(`Servidor rodando em http://${host}:${port}`);
});
