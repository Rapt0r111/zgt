"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Search } from "lucide-react";
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

const RANK_PRIORITY: Record<string, number> = {
	"Маршал Российской Федерации": 1,
	"Генерал армии": 2,
	"Генерал-полковник": 3,
	"Генерал-лейтенант": 4,
	"Генерал-майор": 5,
	Полковник: 6,
	Подполковник: 7,
	Майор: 8,
	Капитан: 9,
	"Старший лейтенант": 10,
	Лейтенант: 11,
	"Младший лейтенант": 12,
	"Старший прапорщик": 13,
	Прапорщик: 14,
	Старшина: 15,
	"Старший сержант": 16,
	Сержант: 17,
	"Младший сержант": 18,
	Ефрейтор: 19,
	Рядовой: 20,
	Курсант: 21,
};

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
			const rankA = RANK_PRIORITY[a.rank?.trim() || ""] || 1000;
			const rankB = RANK_PRIORITY[b.rank?.trim() || ""] || 1000;

			if (rankA !== rankB) return rankA - rankB;

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
		if (!level) return <Badge variant="outline">Нет</Badge>;
		const labels: Record<number, string> = {
			1: "Форма 1",
			2: "Форма 2",
			3: "Форма 3",
		};
		return <Badge>{labels[level]}</Badge>;
	};

	return (
		<div className="min-h-screen bg-slate-50 p-8">
			<div className="max-w-7xl mx-auto">
				<div className="mb-6">
					<Button variant="ghost" asChild className="mb-4">
						<Link href="/dashboard">
							<ArrowLeft className="mr-2 h-4 w-4" />
							Назад к панели
						</Link>
					</Button>

					<div className="flex justify-between items-center">
						<h1 className="text-3xl font-bold">Личный состав</h1>
						<Button asChild>
							<Link href="/personnel/create">
								<Plus className="mr-2 h-4 w-4" />
								Добавить
							</Link>
						</Button>
					</div>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>Поиск</CardTitle>
						<div className="flex gap-2">
							<div className="relative flex-1">
								<Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
								<Input
									placeholder="Поиск по ФИО, званию, должности..."
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									className="pl-9"
								/>
							</div>
						</div>
					</CardHeader>

					<CardContent>
						{isLoading ? (
							<div className="text-center py-8">Загрузка...</div>
						) : (
							<>
								<div className="mb-4 text-sm text-muted-foreground">
									Всего: {data?.total || 0}
								</div>

								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>ФИО</TableHead>
											<TableHead>Звание</TableHead>
											<TableHead>Должность</TableHead>
											<TableHead>Подразделение</TableHead>
											<TableHead>Допуск</TableHead>
											<TableHead>Статус</TableHead>
											<TableHead className="text-right">Действия</TableHead>
										</TableRow>
									</TableHeader>

									<TableBody>
										{sortedPersonnel.map((person) => (
											<TableRow key={person.id}>
												<TableCell className="font-medium">
													{person.full_name}
												</TableCell>
												<TableCell>{person.rank || "—"}</TableCell>
												<TableCell>{person.position || "—"}</TableCell>
												<TableCell>{person.unit || "—"}</TableCell>
												<TableCell>
													{getClearanceBadge(person.security_clearance_level)}
												</TableCell>
												<TableCell>
													<Badge
														variant={
															STATUS_VARIANTS[
																person.status as keyof typeof STATUS_VARIANTS
															] || "default"
														}
													>
														{person.status}
													</Badge>
												</TableCell>
												<TableCell className="text-right">
													<div className="flex justify-end gap-2">
														<Button size="sm" variant="outline" asChild>
															<Link href={`/personnel/${person.id}`}>
																Открыть
															</Link>
														</Button>
														<Button
															size="sm"
															variant="destructive"
															disabled={deleteMutation.isPending}
															onClick={() => {
																if (confirm(`Удалить ${person.full_name}?`)) {
																	deleteMutation.mutate(person.id);
																}
															}}
														>
															{deleteMutation.isPending
																? "Удаление..."
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
													className="text-center py-8 text-muted-foreground"
												>
													Нет данных. Создайте первую запись.
												</TableCell>
											</TableRow>
										)}
									</TableBody>
								</Table>
							</>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
