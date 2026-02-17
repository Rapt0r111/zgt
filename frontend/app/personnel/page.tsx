"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Search, User, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { personnelApi } from "@/lib/api/personnel";

const STATUS_VARIANTS = {
	"В строю": "default",
	"В командировке": "secondary",
	"В госпитале": "destructive",
	"В отпуске": "outline",
} as const;

export default function PersonnelPage() {
	const queryClient = useQueryClient();
	const [search, setSearch] = useState("");

	const { data, isLoading } = useQuery({
		queryKey: ["personnel", search],
		queryFn: () => personnelApi.getList({ search: search || undefined }),
	});

	const sortedPersonnel = useMemo(() => {
		if (!data?.items.length) return [];

		return [...data.items].sort((a, b) => {
			const priorityA = a.rank_priority ?? 1000;
			const priorityB = b.rank_priority ?? 1000;

			if (priorityA !== priorityB) return priorityA - priorityB;

			const posA = a.position?.toLowerCase() || "";
			const posB = b.position?.toLowerCase() || "";

			const isAsenior = posA.includes("старший");
			const isBsenior = posB.includes("старший");

			if (isAsenior !== isBsenior) return isAsenior ? -1 : 1;
			if (posA !== posB) return posA.localeCompare(posB, "ru");

			return (a.full_name || "").localeCompare(b.full_name || "", "ru");
		});
	}, [data]);

	const deleteMutation = useMutation({
		mutationFn: personnelApi.delete,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["personnel"] });
		},
	});

	const getClearanceBadge = (level?: number) => {
		if (!level) return <Badge variant="outline" className="border-white/10 opacity-50">Нет</Badge>;
		const labels: Record<number, string> = {
			1: "Форма 1",
			2: "Форма 2",
			3: "Форма 3",
		};
        // Особый стиль для высокой формы допуска
		return (
            <Badge className={level === 1 ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-primary/10 text-primary border-primary/20"}>
                <ShieldAlert className="mr-1 h-3 w-3" />
                {labels[level]}
            </Badge>
        );
	};

	return (
        /* Фон страницы в соответствии с темной темой */
		<div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
			<div className="mx-auto">
				<div className="mb-6">
					<Button variant="ghost" asChild className="mb-4 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors">
						<Link href="/dashboard">
							<ArrowLeft className="mr-2 h-4 w-4" />
							Назад к панели
						</Link>
					</Button>

					<div className="flex justify-between items-center">
						<h1 className="text-3xl font-bold tracking-tight">Личный состав</h1>
						<Button asChild className="gradient-primary border-0 shadow-lg">
							<Link href="/personnel/create">
								<Plus className="mr-2 h-4 w-4" />
								Добавить
							</Link>
						</Button>
					</div>
				</div>

				<Card className="glass-elevated border-white/10 shadow-2xl overflow-hidden">
					<CardHeader className="bg-white/5 border-b pt-6 border-white/10 pb-6">
						<div className="flex items-center justify-between mb-4">
                            <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                <Search className="h-4 w-4 text-muted-foreground" />
                                Поиск по базе
                            </CardTitle>
                            <Badge variant="outline" className="bg-white/5 border-white/10 text-muted-foreground">
                                Всего записей: {data?.total || 0}
                            </Badge>
                        </div>
						<div className="flex gap-2">
							<div className="relative flex-1">
								<Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
								<Input
									placeholder="Поиск по ФИО, званию, должности..."
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									className="pl-9 bg-background/50 border-white/10 focus:border-primary/50 transition-all"
								/>
							</div>
						</div>
					</CardHeader>

					<CardContent className="p-0">
						{isLoading ? (
							<div className="text-center py-20 text-muted-foreground">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                                Загрузка базы данных...
                            </div>
						) : (
							<div className="overflow-x-auto">
								<Table>
									<TableHeader>
										<TableRow className="bg-white/5 hover:bg-white/5 border-white/10">
											<TableHead className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground px-6 py-4">ФИО</TableHead>
											<TableHead className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground px-6 py-4">Звание</TableHead>
											<TableHead className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground px-6 py-4">Должность</TableHead>
											<TableHead className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground px-6 py-4">Взвод</TableHead>
											<TableHead className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground px-6 py-4">Допуск</TableHead>
											<TableHead className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground px-6 py-4 text-center">Статус</TableHead>
											<TableHead className="text-right text-[10px] uppercase tracking-widest font-bold text-muted-foreground px-6 py-4">Действия</TableHead>
										</TableRow>
									</TableHeader>

									<TableBody>
										{sortedPersonnel.map((person) => (
											<TableRow 
                                                key={person.id} 
                                                className="hover:bg-white/6 border-white/5 transition-colors group"
                                            >
												<TableCell className="px-6 py-4 font-medium text-foreground group-hover:text-primary transition-colors">
													<div className="flex items-center gap-2">
                                                        <User className="h-3.5 w-3.5 opacity-40" />
                                                        {person.full_name}
                                                    </div>
												</TableCell>
												<TableCell className="px-6 py-4 text-muted-foreground">{person.rank || "—"}</TableCell>
												<TableCell className="px-6 py-4 text-muted-foreground leading-snug">{person.position || "—"}</TableCell>
												<TableCell className="px-6 py-4 font-mono text-[11px] text-primary/70">{person.platoon || "—"}</TableCell>
												<TableCell className="px-6 py-4">
													{getClearanceBadge(person.security_clearance_level)}
												</TableCell>
												<TableCell className="px-6 py-4 text-center">
													<Badge
														variant={
															STATUS_VARIANTS[
																person.status as keyof typeof STATUS_VARIANTS
															] || "default"
														}
                                                        className="whitespace-nowrap px-2 py-0.5 shadow-sm"
													>
														{person.status}
													</Badge>
												</TableCell>
												<TableCell className="px-6 py-4 text-right">
													<div className="flex justify-end gap-2">
														<Button 
                                                            size="sm" 
                                                            variant="ghost" 
                                                            asChild
                                                            className="h-8 hover:bg-white/10 hover:text-primary transition-colors"
                                                        >
															<Link href={`/personnel/${person.id}`}>
																Открыть
															</Link>
														</Button>
														<Button
															size="sm"
															variant="ghost"
                                                            className="h-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors"
															disabled={deleteMutation.isPending}
															onClick={() => {
																if (confirm(`Удалить ${person.full_name}?`)) {
																	deleteMutation.mutate(person.id);
																}
															}}
														>
															{deleteMutation.isPending
																? "..."
																: "Удалить"}
														</Button>
													</div>
												</TableCell>
											</TableRow>
										))}

										{sortedPersonnel.length === 0 && (
											<TableRow>
												<TableCell
													colSpan={7}
													className="text-center py-20 text-muted-foreground"
												>
													Нет данных. Создайте первую запись.
												</TableCell>
											</TableRow>
										)}
									</TableBody>
								</Table>
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}