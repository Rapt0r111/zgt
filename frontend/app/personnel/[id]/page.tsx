"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ArrowLeft, Save, ShieldAlert, User, Briefcase, FileText, Activity } from "lucide-react";
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

const STATUS_VARIANTS = {
	"В строю": "default",
	"В командировке": "secondary",
	"В госпитале": "destructive",
	"В отпуске": "outline",
} as const;

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

    const getClearanceBadge = (level?: number) => {
		if (!level) return <Badge variant="outline" className="border-white/10 opacity-50">Нет допуска</Badge>;
		const labels: Record<number, string> = { 1: "Форма 1", 2: "Форма 2", 3: "Форма 3" };
		return (
            <Badge className={level === 1 ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-primary/10 text-primary border-primary/20"}>
                <ShieldAlert className="mr-1 h-3 w-3" />
                {labels[level]}
            </Badge>
        );
	};

	if (isLoading) {
		return (
			<div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center text-muted-foreground">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <p className="animate-pulse">Загрузка данных...</p>
			</div>
		);
	}

	if (!personnel) {
		return (
			<div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
				<p className="text-destructive">Военнослужащий не найден</p>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
			<div className="max-w-4xl mx-auto">
				<Button variant="ghost" asChild className="mb-6 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors">
					<Link href="/personnel">
						<ArrowLeft className="mr-2 h-4 w-4" />
						Назад к списку
					</Link>
				</Button>

				<div className="flex justify-between items-end mb-8">
					<div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                                <User className="h-6 w-6 text-primary" />
                            </div>
                            <div>
						        <h1 className="text-3xl font-bold tracking-tight text-foreground">{personnel.full_name}</h1>
                                <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className="border-white/10 text-muted-foreground bg-white/5">
                                        {personnel.rank || "Без звания"}
                                    </Badge>
                                    <span className="text-white/20">•</span>
                                    <span className="text-sm text-muted-foreground">{personnel.position || "Должность не указана"}</span>
                                </div>
                            </div>
                        </div>
					</div>
					<Button 
                        variant={isEditing ? "outline" : "secondary"} 
                        onClick={() => setIsEditing(!isEditing)}
                        className={isEditing ? "border-white/10 hover:bg-white/10" : "bg-white/10 hover:bg-white/20 text-white border-0"}
                    >
						{isEditing ? "Отменить" : "Редактировать"}
					</Button>
				</div>

				{clearanceCheck?.is_expired && (
					<Alert variant="destructive" className="mb-6 bg-destructive/10 border-destructive/20 text-destructive-foreground">
						<AlertCircle className="h-4 w-4" />
						<AlertDescription>
							Внимание: Допуск к ГТ истёк {clearanceCheck.expiry_date}!
						</AlertDescription>
					</Alert>
				)}

				<form onSubmit={handleSubmit(onSubmit)}>
					<div className="grid gap-6">
						<Card className="glass-elevated border-white/10 shadow-xl overflow-hidden">
							<CardHeader className="bg-white/5 border-b border-white/10">
								<CardTitle className="text-lg font-semibold flex items-center gap-2">
                                    <Briefcase className="h-4 w-4 text-primary" />
                                    Основная информация
                                </CardTitle>
							</CardHeader>
							<CardContent className="space-y-6 pt-6">
								{error && (
									<Alert variant="destructive" className="bg-destructive/10 border-destructive/20">
										<AlertDescription>{error}</AlertDescription>
									</Alert>
								)}

								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div className="space-y-2">
										<Label htmlFor="full_name" className="text-muted-foreground">ФИО *</Label>
										<Input
											id="full_name"
											{...register("full_name")}
											disabled={!isEditing}
                                            className="bg-background/50 border-white/10 focus:border-primary/50 transition-all disabled:opacity-80"
										/>
										{errors.full_name && (
											<p className="text-sm text-destructive">
												{errors.full_name.message}
											</p>
										)}
									</div>

									<div className="space-y-2">
										<Label className="text-muted-foreground">Звание</Label>
										{isEditing ? (
											<Select
												value={currentRank || ""}
												onValueChange={(val) => {
													setValue("rank", val);
													const rank = RANKS.find((r) => r.value === val);
													setValue("rank_priority", rank?.priority);
												}}
											>
												<SelectTrigger className="bg-background/50 border-white/10">
													<SelectValue placeholder="Выберите звание" />
												</SelectTrigger>
												<SelectContent className="bg-slate-900 border-white/10 text-foreground">
													{RANKS.map((rank) => (
														<SelectItem key={rank.value} value={rank.value}>
															{rank.value}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										) : (
											<div className="h-10 flex items-center px-3 bg-white/5 rounded-md border border-white/5 text-sm">
                                                {personnel.rank || "–"}
                                            </div>
										)}
									</div>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div className="space-y-2">
										<Label htmlFor="position" className="text-muted-foreground">Должность</Label>
										<Input
											id="position"
											{...register("position")}
											disabled={!isEditing}
                                            className="bg-background/50 border-white/10 focus:border-primary/50 disabled:opacity-80"
										/>
									</div>

									<div className="space-y-2">
										<Label className="text-muted-foreground">Взвод</Label>
										{isEditing ? (
											<Select
												value={currentPlatoon || ""}
												onValueChange={(val) => setValue("platoon", val)}
												disabled={isCompanyCommander}
											>
												<SelectTrigger
													className={`bg-background/50 border-white/10 ${
														isCompanyCommander ? "opacity-50 cursor-not-allowed" : ""
													}`}
												>
													<SelectValue
														placeholder={
															isCompanyCommander ? "Не применимо" : "Выберите взвод"
														}
													/>
												</SelectTrigger>
												<SelectContent className="bg-slate-900 border-white/10">
													<SelectItem value="1 взвод">1 взвод</SelectItem>
													<SelectItem value="2 взвод">2 взвод</SelectItem>
												</SelectContent>
											</Select>
										) : (
											<div className="h-10 flex items-center px-3 bg-white/5 rounded-md border border-white/5 text-sm font-mono text-primary/70">
                                                {personnel.platoon || "–"}
                                            </div>
										)}
									</div>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div className="space-y-2">
										<Label htmlFor="personal_number" className="text-muted-foreground">Личный номер</Label>
										<Input
											id="personal_number"
											{...register("personal_number")}
											disabled={!isEditing}
                                            className="bg-background/50 border-white/10 focus:border-primary/50 disabled:opacity-80 font-mono"
										/>
									</div>

									<div className="space-y-2">
										<Label htmlFor="service_number" className="text-muted-foreground">Табельный номер</Label>
										<Input
											id="service_number"
											{...register("service_number")}
											disabled={!isEditing}
                                            className="bg-background/50 border-white/10 focus:border-primary/50 disabled:opacity-80 font-mono"
										/>
									</div>
								</div>
							</CardContent>
						</Card>

						<Card className="glass-elevated border-white/10 shadow-xl overflow-hidden">
							<CardHeader className="bg-white/5 border-b border-white/10">
								<CardTitle className="text-lg font-semibold flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-primary" />
                                    Допуск к государственной тайне
                                </CardTitle>
							</CardHeader>
							<CardContent className="space-y-6 pt-6">
								<div className="space-y-2">
									<Label htmlFor="security_clearance_level" className="text-muted-foreground">Форма допуска</Label>
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
											<SelectTrigger className="bg-background/50 border-white/10">
												<SelectValue placeholder="Выберите форму" />
											</SelectTrigger>
											<SelectContent className="bg-slate-900 border-white/10">
												<SelectItem value="1">Форма 1</SelectItem>
												<SelectItem value="2">Форма 2</SelectItem>
												<SelectItem value="3">Форма 3</SelectItem>
											</SelectContent>
										</Select>
									) : (
										<div className="pt-1">
											{getClearanceBadge(personnel.security_clearance_level)}
										</div>
									)}
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div className="space-y-2">
										<Label htmlFor="clearance_order_number" className="text-muted-foreground">Номер приказа</Label>
										<Input
											id="clearance_order_number"
											{...register("clearance_order_number")}
											disabled={!isEditing}
                                            className="bg-background/50 border-white/10 focus:border-primary/50 disabled:opacity-80"
										/>
									</div>

									<div className="space-y-2">
										<Label htmlFor="clearance_expiry_date" className="text-muted-foreground">Дата окончания</Label>
										<Input
											id="clearance_expiry_date"
											type="date"
											{...register("clearance_expiry_date")}
											disabled={!isEditing}
                                            className="bg-background/50 border-white/10 focus:border-primary/50 disabled:opacity-80 [color-scheme:dark]"
										/>
									</div>
								</div>

								{clearanceCheck && !isEditing && (
									<div className="pt-4 border-t border-white/5">
										<div className="flex items-center justify-between text-sm">
											<span className="text-muted-foreground">Проверка статуса:</span>
											<div>
												{clearanceCheck.is_valid ? (
													<Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Действителен</Badge>
												) : clearanceCheck.is_expired ? (
													<Badge variant="destructive" className="animate-pulse">Истёк</Badge>
												) : (
													<Badge variant="outline" className="opacity-50">Не оформлен</Badge>
												)}
											</div>
										</div>
									</div>
								)}
							</CardContent>
						</Card>

						<Card className="glass-elevated border-white/10 shadow-xl overflow-hidden">
							<CardHeader className="bg-white/5 border-b border-white/10">
								<CardTitle className="text-lg font-semibold flex items-center gap-2">
                                    <Activity className="h-4 w-4 text-primary" />
                                    Текущий статус
                                </CardTitle>
							</CardHeader>
							<CardContent className="pt-6">
								<div className="space-y-2">
									<Label htmlFor="status" className="text-muted-foreground">Статус нахождения</Label>
									{isEditing ? (
										<Select
											defaultValue={personnel.status}
											onValueChange={(value) => setValue("status", value)}
										>
											<SelectTrigger className="bg-background/50 border-white/10">
												<SelectValue />
											</SelectTrigger>
											<SelectContent className="bg-slate-900 border-white/10">
												<SelectItem value="В строю">В строю</SelectItem>
												<SelectItem value="В командировке">В командировке</SelectItem>
												<SelectItem value="В госпитале">В госпитале</SelectItem>
												<SelectItem value="В отпуске">В отпуске</SelectItem>
											</SelectContent>
										</Select>
									) : (
										<div className="pt-1">
											<Badge
                                                variant={STATUS_VARIANTS[personnel.status as keyof typeof STATUS_VARIANTS] || "default"}
                                                className="px-4 py-1"
                                            >
                                                {personnel.status}
                                            </Badge>
										</div>
									)}
								</div>
							</CardContent>
						</Card>
					</div>

					{isEditing && (
						<div className="mt-8 flex justify-end">
							<Button type="submit" disabled={updateMutation.isPending} className="gradient-primary border-0 shadow-lg px-3 py-2 h-auto font-bold">
								<Save className="mr-2 h-5 w-5" />
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