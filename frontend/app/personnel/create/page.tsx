"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, UserPlus, ShieldCheck, Briefcase, Info, AlertCircle } from "lucide-react";
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
		<div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 p-8 text-foreground">
			<div className="max-w-3xl mx-auto">
				<Button variant="ghost" asChild className="mb-6 hover:bg-white/10 text-muted-foreground hover:text-foreground">
					<Link href="/personnel">
						<ArrowLeft className="mr-2 h-4 w-4" />
						Назад к списку
					</Link>
				</Button>

				<Card className="glass-elevated border-white/10 shadow-2xl overflow-hidden">
					<CardHeader className="bg-white/5 border-b py-6 border-white/10 pb-6">
						<div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <UserPlus className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="text-xl">Новая учетная карточка</CardTitle>
                                <p className="text-xs text-muted-foreground mt-1">Заполнение данных личного состава</p>
                            </div>
                        </div>
					</CardHeader>

					<form onSubmit={handleSubmit(onSubmit)}>
						<CardContent className="space-y-8 pt-6">
							{error && (
								<Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive-foreground">
									<AlertCircle className="h-4 w-4" />
                                    <AlertDescription>{error}</AlertDescription>
								</Alert>
							)}

							{/* Секция: Основная информация */}
							<div className="space-y-4">
								<h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-primary/80 border-b border-white/10 pb-2 mb-4 flex items-center gap-2">
									<Info className="h-3 w-3" />
                                    Основная информация
								</h3>

								<div className="space-y-2">
									<Label htmlFor="full_name" className="text-xs font-semibold text-muted-foreground">ФИО *</Label>
									<Input
										id="full_name"
										{...register("full_name")}
										placeholder="Фамилия Имя Отчество"
										className={`bg-background/50 border-white/10 focus:border-primary/50 h-11 ${errors.full_name ? "border-destructive/50" : ""}`}
									/>
									{errors.full_name && (
										<p className="text-[10px] text-destructive font-medium uppercase tracking-wider">
											{errors.full_name.message}
										</p>
									)}
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label className="text-xs font-semibold text-muted-foreground">Звание</Label>
										<Select
											value={currentRank || ""}
											onValueChange={(val) => {
												setValue("rank", val);
												const rank = RANKS.find((r) => r.value === val);
												setValue("rank_priority", rank?.priority);
											}}
										>
											<SelectTrigger className="bg-background/50 border-white/10 h-11">
												<SelectValue placeholder="Выберите звание" />
											</SelectTrigger>
											<SelectContent className="glass border-white/10">
												{RANKS.map((rank) => (
													<SelectItem key={rank.value} value={rank.value}>
														{rank.value}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>

									<div className="space-y-2">
										<Label htmlFor="position" className="text-xs font-semibold text-muted-foreground">Должность</Label>
										<Input
											id="position"
											{...register("position")}
											placeholder="Командир отделения"
                                            className="bg-background/50 border-white/10 focus:border-primary/50 h-11"
										/>
									</div>
								</div>

								<div className="space-y-2">
									<Label className="text-xs font-semibold text-muted-foreground">Взвод</Label>
									<Select
										value={currentPlatoon || ""}
										onValueChange={(val) => setValue("platoon", val)}
										disabled={isCompanyCommander}
									>
										<SelectTrigger
											className={`bg-background/50 border-white/10 h-11 ${
												isCompanyCommander ? "opacity-30 cursor-not-allowed" : ""
											}`}
										>
											<SelectValue
												placeholder={
													isCompanyCommander
														? "Не применимо для командира роты"
														: "Выберите взвод"
												}
											/>
										</SelectTrigger>
										<SelectContent className="glass border-white/10">
											<SelectItem value="1 взвод">1 взвод</SelectItem>
											<SelectItem value="2 взвод">2 взвод</SelectItem>
										</SelectContent>
									</Select>
									{isCompanyCommander && (
										<p className="text-[10px] text-amber-500/70 font-medium italic">
											Для командира роты взвод не указывается
										</p>
									)}
								</div>
							</div>

							{/* Секция: Служебные данные */}
							<div className="space-y-4">
								<h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-primary/80 border-b border-white/10 pb-2 mb-4 flex items-center gap-2">
									<Briefcase className="h-3 w-3" />
                                    Служебные данные
								</h3>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label htmlFor="personal_number" className="text-xs font-semibold text-muted-foreground">Личный номер</Label>
										<Input
											id="personal_number"
											{...register("personal_number")}
											placeholder="А-123456"
                                            className="bg-background/50 border-white/10 focus:border-primary/50 font-mono h-11"
										/>
									</div>

									<div className="space-y-2">
										<Label htmlFor="service_number" className="text-xs font-semibold text-muted-foreground">Табельный номер</Label>
										<Input
											id="service_number"
											{...register("service_number")}
											placeholder="987654"
                                            className="bg-background/50 border-white/10 focus:border-primary/50 font-mono h-11"
										/>
									</div>
								</div>
							</div>

							{/* Секция: Допуск */}
							<div className="space-y-4">
								<h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-primary/80 border-b border-white/10 pb-2 mb-4 flex items-center gap-2">
									<ShieldCheck className="h-3 w-3" />
                                    Допуск к государственной тайне
								</h3>

								<div className="space-y-2">
									<Label className="text-xs font-semibold text-muted-foreground">Форма допуска</Label>
									<Select
										value={currentClearance?.toString() || ""}
										onValueChange={(val) =>
											setValue(
												"security_clearance_level",
												val ? parseInt(val, 10) : undefined,
											)
										}
									>
										<SelectTrigger className="bg-background/50 border-white/10 h-11">
											<SelectValue placeholder="Выберите форму" />
										</SelectTrigger>
										<SelectContent className="glass border-white/10">
											<SelectItem value="1">Форма 1</SelectItem>
											<SelectItem value="2">Форма 2</SelectItem>
											<SelectItem value="3">Форма 3</SelectItem>
										</SelectContent>
									</Select>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label htmlFor="clearance_order_number" className="text-xs font-semibold text-muted-foreground">Номер приказа</Label>
										<Input
											id="clearance_order_number"
											{...register("clearance_order_number")}
											placeholder="№123 от 01.01.2024"
                                            className="bg-background/50 border-white/10 h-11"
										/>
									</div>

									<div className="space-y-2">
										<Label htmlFor="clearance_expiry_date" className="text-xs font-semibold text-muted-foreground">Дата окончания</Label>
										<Input
											id="clearance_expiry_date"
											type="date"
											{...register("clearance_expiry_date")}
                                            className="bg-background/50 border-white/10 h-11 [color-scheme:dark]"
										/>
									</div>
								</div>
							</div>

							{/* Секция: Статус */}
							<div className="space-y-4">
								<h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-primary/80 border-b border-white/10 pb-2 mb-4 flex items-center gap-2">
									<AlertCircle className="h-3 w-3" />
                                    Текущее состояние
								</h3>

								<div className="space-y-2">
									<Label className="text-xs font-semibold text-muted-foreground">Статус</Label>
									<Select
										value={currentStatus}
										onValueChange={(val) => setValue("status", val)}
									>
										<SelectTrigger className="bg-background/50 border-white/10 h-11">
											<SelectValue />
										</SelectTrigger>
										<SelectContent className="glass border-white/10">
											<SelectItem value="В строю">В строю</SelectItem>
											<SelectItem value="В командировке">В командировке</SelectItem>
											<SelectItem value="В госпитале">В госпитале</SelectItem>
											<SelectItem value="В отпуске">В отпуске</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>
						</CardContent>

						<CardFooter className="flex justify-between border-t border-white/10 bg-white/5 mt-6 px-8 py-6">
							<Button type="button" variant="ghost" className="hover:bg-white/10 transition-colors" asChild>
								<Link href="/personnel">Отмена</Link>
							</Button>
							<Button type="submit" className="gradient-primary border-0 shadow-lg px-8" disabled={createMutation.isPending}>
								{createMutation.isPending ? "Сохранение..." : "Создать запись"}
							</Button>
						</CardFooter>
					</form>
				</Card>
			</div>
		</div>
	);
}