"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { personnelApi } from "@/lib/api/personnel";

const RANKS = [
	{ value: "Рядовой", priority: 20 },
	{ value: "Ефрейтор", priority: 19 },
	{ value: "Младший сержант", priority: 18 },
	{ value: "Сержант", priority: 17 },
	{ value: "Старший сержант", priority: 16 },
	{ value: "Старшина", priority: 15 },
	{ value: "Прапорщик", priority: 14 },
	{ value: "Старший прапорщик", priority: 13 },
	{ value: "Младший лейтенант", priority: 12 },
	{ value: "Лейтенант", priority: 11 },
	{ value: "Старший лейтенант", priority: 10 },
	{ value: "Капитан", priority: 9 },
	{ value: "Майор", priority: 8 },
	{ value: "Подполковник", priority: 7 },
	{ value: "Полковник", priority: 6 },
	{ value: "Генерал-майор", priority: 5 },
	{ value: "Генерал-лейтенант", priority: 4 },
	{ value: "Генерал-полковник", priority: 3 },
	{ value: "Генерал армии", priority: 2 },
	{ value: "Маршал Российской Федерации", priority: 1 },
];

const personnelSchema = z.object({
	full_name: z.string().min(1, "ФИО обязательно"),
	rank: z.string().optional(),
	rank_priority: z.number().optional(),
	position: z.string().default(""),
	platoon: z.string().optional(),
	personal_number: z.string().default(""),
	service_number: z.string().default(""),
	security_clearance_level: z.number().min(1).max(3).optional(),
	clearance_order_number: z.string().default(""),
	clearance_expiry_date: z.string().default(""),
	status: z.string().min(1, "Статус обязателен"),
});

type PersonnelFormData = z.input<typeof personnelSchema>;

export default function CreatePersonnelPage() {
	const router = useRouter();
	const [error, setError] = useState("");

	const {
		register,
		handleSubmit,
		setValue,
		watch,
		formState: { errors },
	} = useForm<PersonnelFormData>({
		resolver: zodResolver(personnelSchema),
		defaultValues: {
			status: "В строю",
		},
	});

	const createMutation = useMutation({
		mutationFn: (data: PersonnelFormData) => personnelApi.create(data),
		onSuccess: () => {
			toast.success("Военнослужащий добавлен");
			router.push("/personnel");
		},
		onError: (err: unknown) => {
			const error = err as { response?: { data?: { detail?: string } } };
			const detail = error.response?.data?.detail;
			setError(typeof detail === "string" ? detail : "Ошибка при создании");
			toast.error("Ошибка при создании");
		},
	});

	const onSubmit = (data: PersonnelFormData) => {
		setError("");
		const submitData = { ...data };
		if (data.position === "Командир роты") {
			submitData.platoon = undefined;
		}
		createMutation.mutate(submitData);
	};

	const currentStatus = watch("status");
	const currentClearance = watch("security_clearance_level");
	const currentRank = watch("rank");
	const currentPosition = watch("position");
	const currentPlatoon = watch("platoon");

	const isCompanyCommander = currentPosition === "Командир роты";

	return (
		<div className="min-h-screen bg-slate-50 p-8">
			<div className="max-w-3xl mx-auto">
				<Button variant="ghost" asChild className="mb-4">
					<Link href="/personnel">
						<ArrowLeft className="mr-2 h-4 w-4" />
						Назад к списку
					</Link>
				</Button>

				<Card>
					<CardHeader>
						<CardTitle>Добавить военнослужащего</CardTitle>
					</CardHeader>

					<form onSubmit={handleSubmit(onSubmit)}>
						<CardContent className="space-y-6">
							{error && (
								<Alert variant="destructive">
									<AlertDescription>{error}</AlertDescription>
								</Alert>
							)}

							<div className="space-y-4">
								<h3 className="font-semibold text-lg border-b pb-2">
									Основная информация
								</h3>

								<div className="space-y-2">
									<Label htmlFor="full_name">ФИО *</Label>
									<Input
										id="full_name"
										{...register("full_name")}
										placeholder="Иванов Иван Иванович"
										className={errors.full_name ? "border-destructive" : ""}
									/>
									{errors.full_name && (
										<p className="text-sm text-destructive">
											{errors.full_name.message}
										</p>
									)}
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label>Звание</Label>
										<Select
											value={currentRank || ""}
											onValueChange={(val) => {
												setValue("rank", val);
												const rank = RANKS.find((r) => r.value === val);
												setValue("rank_priority", rank?.priority);
											}}
										>
											<SelectTrigger>
												<SelectValue placeholder="Выберите звание" />
											</SelectTrigger>
											<SelectContent>
												{RANKS.map((rank) => (
													<SelectItem key={rank.value} value={rank.value}>
														{rank.value}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>

									<div className="space-y-2">
										<Label htmlFor="position">Должность</Label>
										<Input
											id="position"
											{...register("position")}
											placeholder="Командир отделения"
										/>
									</div>
								</div>

								<div className="space-y-2">
									<Label>Взвод</Label>
									<Select
										value={currentPlatoon || ""}
										onValueChange={(val) => setValue("platoon", val)}
										disabled={isCompanyCommander}
									>
										<SelectTrigger
											className={
												isCompanyCommander ? "opacity-50 cursor-not-allowed" : ""
											}
										>
											<SelectValue
												placeholder={
													isCompanyCommander
														? "Не применимо для командира роты"
														: "Выберите взвод"
												}
											/>
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="1 взвод">1 взвод</SelectItem>
											<SelectItem value="2 взвод">2 взвод</SelectItem>
										</SelectContent>
									</Select>
									{isCompanyCommander && (
										<p className="text-sm text-muted-foreground">
											Для командира роты взвод не указывается
										</p>
									)}
								</div>
							</div>

							<div className="space-y-4">
								<h3 className="font-semibold text-lg border-b pb-2">
									Служебные данные
								</h3>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label htmlFor="personal_number">
											Личный номер (жетон)
										</Label>
										<Input
											id="personal_number"
											{...register("personal_number")}
											placeholder="А-123456"
										/>
									</div>

									<div className="space-y-2">
										<Label htmlFor="service_number">Табельный номер</Label>
										<Input
											id="service_number"
											{...register("service_number")}
											placeholder="987654"
										/>
									</div>
								</div>
							</div>

							<div className="space-y-4">
								<h3 className="font-semibold text-lg border-b pb-2">
									Допуск к государственной тайне
								</h3>

								<div className="space-y-2">
									<Label>Форма допуска</Label>
									<Select
										value={currentClearance?.toString() || ""}
										onValueChange={(val) =>
											setValue(
												"security_clearance_level",
												val ? parseInt(val, 10) : undefined,
											)
										}
									>
										<SelectTrigger>
											<SelectValue placeholder="Выберите форму" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="1">Форма 1</SelectItem>
											<SelectItem value="2">Форма 2</SelectItem>
											<SelectItem value="3">Форма 3</SelectItem>
										</SelectContent>
									</Select>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label htmlFor="clearance_order_number">
											Номер приказа о допуске
										</Label>
										<Input
											id="clearance_order_number"
											{...register("clearance_order_number")}
											placeholder="№123 от 01.01.2024"
										/>
									</div>

									<div className="space-y-2">
										<Label htmlFor="clearance_expiry_date">
											Дата окончания допуска
										</Label>
										<Input
											id="clearance_expiry_date"
											type="date"
											{...register("clearance_expiry_date")}
										/>
									</div>
								</div>
							</div>

							<div className="space-y-4">
								<h3 className="font-semibold text-lg border-b pb-2">
									Текущий статус
								</h3>

								<div className="space-y-2">
									<Label>Статус</Label>
									<Select
										value={currentStatus}
										onValueChange={(val) => setValue("status", val)}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="В строю">В строю</SelectItem>
											<SelectItem value="В командировке">
												В командировке
											</SelectItem>
											<SelectItem value="В госпитале">В госпитале</SelectItem>
											<SelectItem value="В отпуске">В отпуске</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>
						</CardContent>

						<CardFooter className="flex justify-between border-t mt-6 pt-6">
							<Button type="button" variant="outline" asChild>
								<Link href="/personnel">Отмена</Link>
							</Button>
							<Button type="submit" disabled={createMutation.isPending}>
								{createMutation.isPending ? "Сохранение..." : "Создать запись"}
							</Button>
						</CardFooter>
					</form>
				</Card>
			</div>
		</div>
	);
}