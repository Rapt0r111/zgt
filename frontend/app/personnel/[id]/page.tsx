"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
	position: z.string().optional(),
	platoon: z.string().optional(),
	personal_number: z.string().optional(),
	service_number: z.string().optional(),
	security_clearance_level: z.number().min(1).max(3).optional(),
	clearance_order_number: z.string().optional(),
	clearance_expiry_date: z.string().optional(),
	status: z.string(),
});

type PersonnelFormData = z.infer<typeof personnelSchema>;

export default function PersonnelDetailPage() {
	const _router = useRouter();
	const params = useParams();
	const queryClient = useQueryClient();
	const [error, setError] = useState("");
	const [isEditing, setIsEditing] = useState(false);

	const personnelId = parseInt(params.id as string, 10);

	const { data: personnel, isLoading } = useQuery({
		queryKey: ["personnel", personnelId],
		queryFn: () => personnelApi.getById(personnelId),
	});

	const { data: clearanceCheck } = useQuery({
		queryKey: ["personnel", personnelId, "clearance"],
		queryFn: () => personnelApi.checkClearance(personnelId),
		enabled: !!personnel,
	});

	const {
		register,
		handleSubmit,
		setValue,
		watch,
		reset,
		formState: { errors },
	} = useForm<PersonnelFormData>({
		resolver: zodResolver(personnelSchema),
	});

	useEffect(() => {
		if (personnel) {
			reset({
				full_name: personnel.full_name,
				rank: personnel.rank || "",
				rank_priority: personnel.rank_priority,
				position: personnel.position || "",
				platoon: personnel.platoon || "",
				personal_number: personnel.personal_number || "",
				service_number: personnel.service_number || "",
				security_clearance_level: personnel.security_clearance_level,
				clearance_order_number: personnel.clearance_order_number || "",
				clearance_expiry_date: personnel.clearance_expiry_date || "",
				status: personnel.status,
			});
		}
	}, [personnel, reset]);

	const updateMutation = useMutation({
		mutationFn: (data: PersonnelFormData) =>
			personnelApi.update(personnelId, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["personnel", personnelId] });
			setIsEditing(false);
			setError("");
		},
		onError: (err: unknown) => {
			const error = err as { response?: { data?: { detail?: string } } };
			setError(error.response?.data?.detail || "Ошибка при обновлении");
		},
	});

	const onSubmit = (data: PersonnelFormData) => {
		setError("");
		const submitData = { ...data };
		if (data.position === "Командир роты") {
			submitData.platoon = undefined;
		}
		updateMutation.mutate(submitData);
	};

	const currentRank = watch("rank");
	const currentPosition = watch("position");
	const currentPlatoon = watch("platoon");

	const isCompanyCommander = currentPosition === "Командир роты";

	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<p>Загрузка...</p>
			</div>
		);
	}

	if (!personnel) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<p>Военнослужащий не найден</p>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-slate-50 p-8">
			<div className="max-w-4xl mx-auto">
				<Button variant="ghost" asChild className="mb-4">
					<Link href="/personnel">
						<ArrowLeft className="mr-2 h-4 w-4" />
						Назад к списку
					</Link>
				</Button>

				<div className="flex justify-between items-start mb-6">
					<div>
						<h1 className="text-3xl font-bold">{personnel.full_name}</h1>
						<p className="text-muted-foreground mt-1">
							{personnel.rank} • {personnel.position}
						</p>
					</div>
					<Button onClick={() => setIsEditing(!isEditing)}>
						{isEditing ? "Отменить" : "Редактировать"}
					</Button>
				</div>

				{clearanceCheck?.is_expired && (
					<Alert variant="destructive" className="mb-6">
						<AlertCircle className="h-4 w-4" />
						<AlertDescription>
							Допуск к ГТ истёк {clearanceCheck.expiry_date}!
						</AlertDescription>
					</Alert>
				)}

				<form onSubmit={handleSubmit(onSubmit)}>
					<div className="grid gap-6">
						<Card>
							<CardHeader>
								<CardTitle>Основная информация</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								{error && (
									<Alert variant="destructive">
										<AlertDescription>{error}</AlertDescription>
									</Alert>
								)}

								<div className="grid grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label htmlFor="full_name">ФИО *</Label>
										<Input
											id="full_name"
											{...register("full_name")}
											disabled={!isEditing}
										/>
										{errors.full_name && (
											<p className="text-sm text-destructive">
												{errors.full_name.message}
											</p>
										)}
									</div>

									<div className="space-y-2">
										<Label>Звание</Label>
										{isEditing ? (
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
										) : (
											<div className="text-sm">{personnel.rank || "—"}</div>
										)}
									</div>
								</div>

								<div className="grid grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label htmlFor="position">Должность</Label>
										<Input
											id="position"
											{...register("position")}
											disabled={!isEditing}
										/>
									</div>

									<div className="space-y-2">
										<Label>Взвод</Label>
										{isEditing ? (
											<Select
												value={currentPlatoon || ""}
												onValueChange={(val) => setValue("platoon", val)}
												disabled={isCompanyCommander}
											>
												<SelectTrigger
													className={
														isCompanyCommander
															? "opacity-50 cursor-not-allowed"
															: ""
													}
												>
													<SelectValue
														placeholder={
															isCompanyCommander
																? "Не применимо"
																: "Выберите взвод"
														}
													/>
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="1 взвод">1 взвод</SelectItem>
													<SelectItem value="2 взвод">2 взвод</SelectItem>
												</SelectContent>
											</Select>
										) : (
											<div className="text-sm">{personnel.platoon || "—"}</div>
										)}
									</div>
								</div>

								<div className="grid grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label htmlFor="personal_number">Личный номер</Label>
										<Input
											id="personal_number"
											{...register("personal_number")}
											disabled={!isEditing}
										/>
									</div>

									<div className="space-y-2">
										<Label htmlFor="service_number">Табельный номер</Label>
										<Input
											id="service_number"
											{...register("service_number")}
											disabled={!isEditing}
										/>
									</div>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Допуск к государственной тайне</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="space-y-2">
									<Label htmlFor="security_clearance_level">
										Форма допуска
									</Label>
									{isEditing ? (
										<Select
											defaultValue={personnel.security_clearance_level?.toString()}
											onValueChange={(value) =>
												setValue(
													"security_clearance_level",
													value ? parseInt(value, 10) : undefined,
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
									) : (
										<div className="flex items-center gap-2">
											{personnel.security_clearance_level ? (
												<Badge>
													Форма {personnel.security_clearance_level}
												</Badge>
											) : (
												<Badge variant="outline">Нет допуска</Badge>
											)}
										</div>
									)}
								</div>

								<div className="grid grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label htmlFor="clearance_order_number">
											Номер приказа
										</Label>
										<Input
											id="clearance_order_number"
											{...register("clearance_order_number")}
											disabled={!isEditing}
										/>
									</div>

									<div className="space-y-2">
										<Label htmlFor="clearance_expiry_date">
											Дата окончания
										</Label>
										<Input
											id="clearance_expiry_date"
											type="date"
											{...register("clearance_expiry_date")}
											disabled={!isEditing}
										/>
									</div>
								</div>

								{clearanceCheck && (
									<div className="pt-4 border-t">
										<div className="grid grid-cols-2 gap-4 text-sm">
											<div>
												<span className="text-muted-foreground">
													Статус допуска:
												</span>
												<div className="mt-1">
													{clearanceCheck.is_valid ? (
														<Badge variant="default">Действителен</Badge>
													) : clearanceCheck.is_expired ? (
														<Badge variant="destructive">Истёк</Badge>
													) : (
														<Badge variant="outline">Не оформлен</Badge>
													)}
												</div>
											</div>
										</div>
									</div>
								)}
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Текущий статус</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="space-y-2">
									<Label htmlFor="status">Статус</Label>
									{isEditing ? (
										<Select
											defaultValue={personnel.status}
											onValueChange={(value) => setValue("status", value)}
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
									) : (
										<div>
											<Badge>{personnel.status}</Badge>
										</div>
									)}
								</div>
							</CardContent>
						</Card>
					</div>

					{isEditing && (
						<div className="mt-6 flex justify-end">
							<Button type="submit" disabled={updateMutation.isPending}>
								<Save className="mr-2 h-4 w-4" />
								{updateMutation.isPending
									? "Сохранение..."
									: "Сохранить изменения"}
							</Button>
						</div>
					)}
				</form>
			</div>
		</div>
	);
}