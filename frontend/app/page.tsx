"use client";

import Link from "next/link";
import { ShieldCheck, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export default function Home() {
	return (
		/* Глубокий темный фон с градиентом */
		<main className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 p-4 text-foreground">
			{/* Эффект свечения на заднем плане (опционально) */}
			<div className="absolute w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -z-10" />

			<Card className="w-full max-w-md glass-elevated border-white/10 shadow-2xl relative overflow-hidden">
				{/* Декоративная полоса сверху */}
				<div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-primary/50 to-transparent" />
				
				<CardHeader className="text-center pt-10 pb-8">
					<div className="mx-auto w-20 h-20 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-center mb-6 shadow-inner group transition-all">
						<ShieldCheck className="h-12 w-12 text-primary group-hover:scale-110 transition-transform duration-500" />
					</div>
					
					<CardTitle className="text-3xl font-extrabold tracking-tight mb-3">
						Система учёта ЗГТ
					</CardTitle>
					<CardDescription className="text-muted-foreground px-6 leading-relaxed">
						Автоматизированное рабочее место сотрудника <br /> 
						по защите государственной тайны
					</CardDescription>
				</CardHeader>

				<CardContent className="px-8 pb-10 space-y-6">
					<Button 
						className="w-full h-12 text-base font-bold gradient-primary border-0 shadow-lg hover:opacity-90 transition-all active:scale-[0.98] group" 
						asChild
					>
						<Link href="/login">
							<Lock className="mr-2 h-4 w-4 opacity-70 group-hover:opacity-100 transition-opacity" />
							Войти в систему
						</Link>
					</Button>

					<div className="flex flex-col items-center gap-4">
						<div className="h-px w-12 bg-white/10" />
						<div className="text-center">
							<p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60 font-mono">
								Сектор обеспечения режима
							</p>
							<p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/40 font-mono mt-1">
								v1.0.0
							</p>
						</div>
					</div>
				</CardContent>
			</Card>
		</main>
	);
}