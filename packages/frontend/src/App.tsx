// src/App.tsx
import { HomePage } from "./pages/HomePage";
import { ResultsPage } from "./pages/ResultsPage";
import { ProcessingPage } from "./pages/ProcessingPage"; // <-- Importa a nova página
import {
	createBrowserRouter,
	RouterProvider,
	useNavigate,
} from "react-router-dom";
import { useEffect } from "react";

// Componente Wrapper para lidar com a lógica de redirecionamento
const AppWrapper = () => {
	const navigate = useNavigate();

	useEffect(() => {
		const jobId = localStorage.getItem("analysisJobId");
		if (jobId) {
			console.log(
				"Job ID encontrado no localStorage. Redirecionando para a página de processamento.",
			);
			navigate("/processing");
		}
	}, [navigate]);

	return <HomePage />;
};

const router = createBrowserRouter([
	{
		path: "/",
		// O wrapper agora é renderizado na rota principal
		element: <AppWrapper />,
	},
	{
		path: "/results",
		element: <ResultsPage />,
	},
	{
		path: "/processing", // <-- Adiciona a nova rota
		element: <ProcessingPage />,
	},
]);

function App() {
	return <RouterProvider router={router} />;
}

export default App;
