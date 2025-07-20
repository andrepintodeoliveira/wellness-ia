// packages/frontend/src/hooks/useThemeColor.ts

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

/**
 * Hook customizado para obter o valor computado de uma variável de cor CSS
 * e reagir a mudanças de tema.
 * @param {string} variableName - O nome da variável CSS (ex: "--primary").
 * @returns {string} O valor da cor computada como uma string.
 */
export const useThemeColor = (variableName: string): string => {
	const { theme } = useTheme();
	const [color, setColor] = useState("");

	useEffect(() => {
		// O `requestAnimationFrame` garante que a leitura aconteça após
		// o DOM ser totalmente pintado com o novo tema.
		requestAnimationFrame(() => {
			const colorValue = getComputedStyle(
				document.documentElement,
			).getPropertyValue(variableName);
			setColor(colorValue.trim());
		});
		// Roda este efeito toda vez que o tema do next-themes mudar.
	}, [theme, variableName]);

	return color;
};
