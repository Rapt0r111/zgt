import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "./providers";

export const metadata: Metadata = {
	title: "Система учёта ЗГТ",
	description: "Система учёта защиты государственной тайны",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="ru">
			{/*
			  Шрифт Inter загружается из системы (большинство современных ОС содержат его)
			  или подтягивается из CSS font-stack без обращения к Google Fonts.
			  Это позволяет собирать проект полностью офлайн.
			*/}
			<body>
				<Providers>
					{children}
					<Toaster />
				</Providers>
			</body>
		</html>
	);
}
