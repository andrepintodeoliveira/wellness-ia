// src/components/ui/custom-slider.tsx
"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";

const CustomSlider = React.forwardRef<
	React.ElementRef<typeof SliderPrimitive.Root>,
	React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
	<SliderPrimitive.Root
		ref={ref}
		className={cn(
			"relative flex w-full touch-none select-none items-center",
			// Para o slider vertical, ajustamos a largura do container para acomodar o ponteiro
			props.orientation === "vertical" && "h-full w-6",
			props.orientation !== "vertical" && "h-6 w-full",
			className,
		)}
		{...props}
	>
		{/* A trilha agora fica posicionada no centro do novo container */}
		<SliderPrimitive.Track className="relative h-full w-2 grow overflow-hidden rounded-full bg-secondary">
			<SliderPrimitive.Range className="absolute h-full bg-primary" />
		</SliderPrimitive.Track>

		{/* CORREÇÃO: Usamos asChild e envolvemos nosso estilo em um `div`.
        Isso nos dá controle total sobre o alinhamento do ponteiro. */}
		<SliderPrimitive.Thumb asChild>
			<div
				className={cn(
					"flex h-6 w-6 items-center justify-center rounded-full border-2 border-primary/50 bg-background shadow-lg",
					"ring-offset-background transition-transform duration-150 ease-in-out",
					"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
					"hover:scale-110",
					"disabled:pointer-events-none disabled:opacity-50",
				)}
			>
				{/* Este é o ponteiro base que será usado. As opções abaixo podem adicionar elementos aqui. */}
			</div>
		</SliderPrimitive.Thumb>
	</SliderPrimitive.Root>
));
CustomSlider.displayName = SliderPrimitive.Root.displayName;

export { CustomSlider };
