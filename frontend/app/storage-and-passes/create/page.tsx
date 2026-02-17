"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Usb, ShieldCheck, HardDrive, Save, FileText, Settings, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { PersonnelSelect } from "@/components/shared/personnel-select";
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
import { Textarea } from "@/components/ui/textarea";
import { storageAndPassesApi } from "@/lib/api/storage-and-passes";
import { cleanEmptyStrings } from "@/lib/utils/transform";

const assetSchema = z
	.object({
		asset_type: z.enum(["flash_drive", "electronic_pass"], {
			message: "Выберите тип устройства",
		}),

		serial_number: z.string().min(1, "Серийный номер обязателен"),

		model: z.string().optional(),
		manufacturer: z.string().optional(),

		status: z.enum(["in_use", "stock", "broken", "lost"]),

		assigned_to_id: z.number().optional(),
		capacity_gb: z.number().optional(),
		access_level: z.number().min(1).max(10).optional(),

		notes: z.string().optional(),
	})
	.refine(
		(data) => {
			if (data.asset_type === "flash_drive" && !data.capacity_gb) {
				return false;
			}
			return true;
		},
		{
			message: "Для флешки обязателен объём в ГБ",
			path: ["capacity_gb"],
		},
	)
	.refine(
		(data) => {
			if (data.asset_type === "electronic_pass" && !data.access_level) {
				return false;
			}
			return true;
		},
		{
			message: "Для пропуска обязателен уровень доступа",
			path: ["access_level"],
		},
	)
	.refine(
		(data) => {
			if (data.status === "in_use" && !data.assigned_to_id) {
				return false;
			}
			return true;
		},
		{
			message: 'Для статуса "В использовании" необходимо указать владельца',
			path: ["assigned_to_id"],
		},
	);

type AssetFormData = z.infer<typeof assetSchema>;

export default function CreateStorageAndPassPage() {
	const router = useRouter();
	const [error, setError] = useState("");

	const {
		register,
		handleSubmit,
		setValue,
		watch,
		formState: { errors },
	} = useForm<AssetFormData>({
		resolver: zodResolver(assetSchema),
		defaultValues: {
			status: "stock",
			model: "",
			manufacturer: "",
			notes: "",
		},
	});

	const createMutation = useMutation({
		mutationFn: (data: AssetFormData) => storageAndPassesApi.create(data),
		onSuccess: () => {
			toast.success("Актив добавлен");
			router.push("/storage-and-passes");
		},
		onError: (err: unknown) => {
			const error = err as { response?: { data?: { detail?: string } } };
			const detail = error.response?.data?.detail;
			setError(typeof detail === "string" ? detail : "Ошибка");
			toast.error("Ошибка при создании");
		},
	});

	const onSubmit = (data: AssetFormData) => {
		setError("");
		const cleanedData = cleanEmptyStrings(data);
		createMutation.mutate(cleanedData as AssetFormData);
	};

	const currentType = watch("asset_type");
	const currentStatus = watch("status");
	const currentOwnerId = watch("assigned_to_id");

	return (
		<div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 p-8 text-foreground">
			<div className="max-w-3xl mx-auto">
				<Button 
					variant="ghost" 
					asChild 
					className="mb-6 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
				>
					<Link href="/storage-and-passes">
						<ArrowLeft className="mr-2 h-4 w-4" />
						Назад к списку
					</Link>
				</Button>

				<div className="mb-8">
					<h1 className="text-3xl font-bold tracking-tight">Регистрация актива</h1>
					<p className="text-muted-foreground mt-1">Добавление нового USB-носителя или электронного пропуска в базу</p>
				</div>

				<Card className="glass-elevated border-white/10 shadow-2xl overflow-hidden">
					<CardHeader className="bg-white/5 border-b border-white/10 py-6">
						<CardTitle className="text-lg font-semibold flex items-center gap-2">
							{currentType === "electronic_pass" ? (
								<ShieldCheck className="h-5 w-5 text-primary" />
							) : (
								<Usb className="h-5 w-5 text-primary" />
							)}
							Карточка учета
						</CardTitle>
					</CardHeader>

					<form onSubmit={handleSubmit(onSubmit)}>
						<CardContent className="p-8 space-y-10">
							{error && (
								<Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive-foreground">
									<AlertDescription>{error}</AlertDescription>
								</Alert>
							)}

							{/* Секция: Тип и идентификация */}
							<div className="space-y-6">
								<div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary/70 pb-2 border-b border-white/5">
									<Settings className="h-3.5 w-3.5" /> Тип устройства
								</div>
								
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div className="space-y-2">
										<Label className="text-muted-foreground">Тип актива *</Label>
										<Select
											value={currentType}
											onValueChange={(val) =>
												setValue("asset_type", val as AssetFormData["asset_type"], {
													shouldValidate: true,
												})
											}
										>
											<SelectTrigger
												className={`bg-background/50 border-white/10 focus:border-primary/50 ${errors.asset_type ? "border-destructive/50" : ""}`}
											>
												<SelectValue placeholder="Выберите тип" />
											</SelectTrigger>
											<SelectContent className="glass border-white/10">
												<SelectItem value="flash_drive">USB-флешка</SelectItem>
												<SelectItem value="electronic_pass">
													Электронный пропуск
												</SelectItem>
											</SelectContent>
										</Select>
										{errors.asset_type && (
											<p className="text-xs text-destructive mt-1">
												{errors.asset_type.message}
											</p>
										)}
									</div>

									<div className="space-y-2">
										<Label htmlFor="serial_number" className="text-muted-foreground">Серийный номер *</Label>
										<Input
											id="serial_number"
											{...register("serial_number")}
											placeholder="ABC123XYZ"
											className={`bg-background/50 border-white/10 font-mono focus:border-primary/50 ${errors.serial_number ? "border-destructive/50" : ""}`}
										/>
										{errors.serial_number && (
											<p className="text-xs text-destructive mt-1">
												{errors.serial_number.message}
											</p>
										)}
									</div>
								</div>
							</div>

							{/* Секция: Технические данные */}
							<div className="space-y-6">
								<div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary/70 pb-2 border-b border-white/5">
									<FileText className="h-3.5 w-3.5" /> Характеристики
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div className="space-y-2">
										<Label htmlFor="manufacturer" className="text-muted-foreground">Производитель</Label>
										<Input
											id="manufacturer"
											{...register("manufacturer")}
											placeholder="Kingston, Transcend..."
											className="bg-background/50 border-white/10 focus:border-primary/50"
										/>
									</div>

									<div className="space-y-2">
										<Label htmlFor="model" className="text-muted-foreground">Модель</Label>
										<Input
											id="model"
											{...register("model")}
											placeholder="DataTraveler 100 G3"
											className="bg-background/50 border-white/10 focus:border-primary/50"
										/>
									</div>
								</div>

								{currentType === "flash_drive" && (
									<div className="space-y-2 animate-in fade-in slide-in-from-left-2 duration-300">
										<Label htmlFor="capacity_gb" className="text-muted-foreground flex items-center gap-2">
											<HardDrive className="h-3 w-3" /> Объём (ГБ) *
										</Label>
										<Input
											id="capacity_gb"
											type="number"
											{...register("capacity_gb", { valueAsNumber: true })}
											placeholder="16"
											className={`bg-background/50 border-white/10 focus:border-primary/50 ${errors.capacity_gb ? "border-destructive/50" : ""}`}
										/>
										{errors.capacity_gb && (
											<p className="text-xs text-destructive mt-1">
												{errors.capacity_gb.message}
											</p>
										)}
									</div>
								)}

								{currentType === "electronic_pass" && (
									<div className="space-y-2 animate-in fade-in slide-in-from-left-2 duration-300">
										<Label htmlFor="access_level" className="text-muted-foreground flex items-center gap-2">
											<ShieldCheck className="h-3 w-3" /> Уровень доступа (1-10) *
										</Label>
										<Input
											id="access_level"
											type="number"
											{...register("access_level", { valueAsNumber: true })}
											placeholder="3"
											min="1"
											max="10"
											className={`bg-background/50 border-white/10 focus:border-primary/50 ${errors.access_level ? "border-destructive/50" : ""}`}
										/>
										{errors.access_level && (
											<p className="text-xs text-destructive mt-1">
												{errors.access_level.message}
											</p>
										)}
									</div>
								)}
							</div>

							{/* Секция: Статус и принадлежность */}
							<div className="space-y-6">
								<div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary/70 pb-2 border-b border-white/5">
									<UserIcon className="h-3.5 w-3.5" /> Статус и владение
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div className="space-y-2">
										<Label className="text-muted-foreground">Текущий статус</Label>
										<Select
											value={currentStatus}
											onValueChange={(val) =>
												setValue("status", val as AssetFormData["status"], {
													shouldValidate: true,
												})
											}
										>
											<SelectTrigger className="bg-background/50 border-white/10 focus:border-primary/50">
												<SelectValue />
											</SelectTrigger>
											<SelectContent className="glass border-white/10">
												<SelectItem value="stock">На складе</SelectItem>
												<SelectItem value="in_use">Используется</SelectItem>
												<SelectItem value="broken">Сломан</SelectItem>
												<SelectItem value="lost">Утерян</SelectItem>
											</SelectContent>
										</Select>
									</div>

									{currentStatus === "in_use" && (
										<div className="space-y-2 animate-in zoom-in-95 duration-200">
											<Label className="text-muted-foreground">Владелец *</Label>
											<PersonnelSelect
												value={currentOwnerId}
												onValueChange={(val) =>
													setValue("assigned_to_id", val, { shouldValidate: true })
												}
												placeholder="Выберите сотрудника"
												error={!!errors.assigned_to_id}
											/>
											{errors.assigned_to_id && (
												<p className="text-xs text-destructive mt-1">
													{errors.assigned_to_id.message}
												</p>
											)}
										</div>
									)}
								</div>
								
								{currentStatus === "in_use" && (
									<p className="text-[10px] text-primary/60 italic">
										При статусе "Используется" необходимо обязательно закрепить актив за сотрудником.
									</p>
								)}
							</div>

							<div className="space-y-2">
								<Label htmlFor="notes" className="text-muted-foreground">Примечания</Label>
								<Textarea
									id="notes"
									{...register("notes")}
									placeholder="Дополнительная информация о состоянии или месте хранения..."
									rows={3}
									className="bg-background/50 border-white/10 focus:border-primary/50 resize-none"
								/>
							</div>
						</CardContent>

						<CardFooter className="bg-white/5 border-t border-white/10 p-8 flex justify-between">
							<Button type="button" variant="ghost" asChild className="hover:bg-white/10 text-muted-foreground">
								<Link href="/storage-and-passes">Отмена</Link>
							</Button>
							<Button 
								type="submit" 
								disabled={createMutation.isPending}
								className="gradient-primary border-0 shadow-lg px-8 font-semibold"
							>
								{createMutation.isPending ? (
									<div className="flex items-center gap-2">
										<div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
										Сохранение...
									</div>
								) : (
									<div className="flex items-center gap-2">
										<Save className="h-4 w-4" />
										Создать запись
									</div>
								)}
							</Button>
						</CardFooter>
					</form>
				</Card>
			</div>
		</div>
	);
}