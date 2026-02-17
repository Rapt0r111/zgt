"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Save, XCircle, Smartphone, User as UserIcon, Calendar, Info, Shield, Hash, Edit3, X } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { phonesApi } from "@/lib/api/phones";
import { cleanEmptyStrings } from "@/lib/utils/transform";

const phoneSchema = z.object({
	owner_id: z.number().min(1, "Выберите владельца"),
	model: z.string().default(""),
	color: z.string().default(""),
	imei_1: z.string().default(""),
	imei_2: z.string().default(""),
	serial_number: z.string().default(""),
	has_camera: z.boolean().default(true),
	has_recorder: z.boolean().default(true),
	storage_location: z.string().default(""),
	status: z.string().default("Выдан"),
});

type PhoneFormData = z.infer<typeof phoneSchema>;

export default function PhoneDetailPage() {
	const _router = useRouter();
	const params = useParams();
	const queryClient = useQueryClient();
	const [error, setError] = useState("");
	const [isEditing, setIsEditing] = useState(false);

	const phoneId = parseInt(params.id as string, 10);

	const { data: phone, isLoading } = useQuery({
		queryKey: ["phone", phoneId],
		queryFn: () => phonesApi.getById(phoneId),
	});

	const { data: personnelData } = useQuery({
		queryKey: ["personnel"],
		queryFn: () => personnelApi.getList({ limit: 1000 }),
	});

	const {
		register,
		handleSubmit,
		setValue,
		watch,
		reset,
		formState: { errors },
	} = useForm({
		resolver: zodResolver(phoneSchema),
	});

	useEffect(() => {
		if (phone) {
			reset({
				owner_id: phone.owner_id,
				model: phone.model || "",
				color: phone.color || "",
				imei_1: phone.imei_1 || "",
				imei_2: phone.imei_2 || "",
				serial_number: phone.serial_number || "",
				has_camera: phone.has_camera,
				has_recorder: phone.has_recorder,
				storage_location: phone.storage_location || "",
				status: phone.status,
			});
		}
	}, [phone, reset]);

	const updateMutation = useMutation({
		mutationFn: (data: PhoneFormData) => phonesApi.update(phoneId, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["phone", phoneId] });
			queryClient.invalidateQueries({ queryKey: ["phones"] });
			setIsEditing(false);
			setError("");
			toast.success("Данные обновлены");
		},
		onError: (err: unknown) => {
			const error = err as { response?: { data?: { detail?: string } } };
			setError(error.response?.data?.detail || "Ошибка при обновлении");
			toast.error("Ошибка при обновлении");
		},
	});

	const onSubmit = (data: PhoneFormData) => {
		setError("");
		const cleanedData = cleanEmptyStrings(data);
		updateMutation.mutate(cleanedData as PhoneFormData);
	};

	const currentOwnerId = watch("owner_id");
	const currentStatus = watch("status");
	const hasCamera = watch("has_camera");
	const hasRecorder = watch("has_recorder");

	if (isLoading) {
		return (
			<div className="min-h-screen bg-slate-900 flex items-center justify-center">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
			</div>
		);
	}

	if (!phone) {
		return (
			<div className="min-h-screen bg-slate-900 flex items-center justify-center text-foreground">
				<p>Телефон не найден</p>
			</div>
		);
	}

	const getStatusBadge = (status: string) => {
		return status === "Выдан" ? (
			<Badge variant="default" className="gap-1.5 bg-emerald-500/20 text-emerald-400 border-emerald-500/20 px-3 py-1">
				<CheckCircle2 className="h-3.5 w-3.5" />
				Выдан
			</Badge>
		) : (
			<Badge variant="secondary" className="gap-1.5 bg-orange-500/20 text-orange-400 border-orange-500/20 px-3 py-1">
				<XCircle className="h-3.5 w-3.5" />
				Сдан
			</Badge>
		);
	};

	return (
		<div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 p-8 text-foreground">
			<div className="max-w-4xl mx-auto">
				<Button variant="ghost" asChild className="mb-6 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors">
					<Link href="/phones">
						<ArrowLeft className="mr-2 h-4 w-4" />
						Назад к списку
					</Link>
				</Button>

				<div className="flex flex-wrap justify-between items-start mb-8 gap-4">
					<div>
						<h1 className="text-3xl font-bold tracking-tight">
							{phone.model || "Модель не указана"}
						</h1>
						<div className="flex items-center gap-2 mt-2 text-muted-foreground">
							<UserIcon className="h-4 w-4 opacity-50" />
							<span>
								{phone.owner_rank && `${phone.owner_rank} `}
								{phone.owner_full_name || "Владелец не указан"}
							</span>
						</div>
					</div>
					<div className="flex gap-3 items-center">
						{getStatusBadge(phone.status)}
						<Button 
							variant={isEditing ? "outline" : "secondary"} 
							onClick={() => setIsEditing(!isEditing)}
							className={!isEditing ? "bg-white/10 hover:bg-white/20 border-0" : "bg-transparent border-white/20"}
						>
							{isEditing ? (
								<><X className="mr-2 h-4 w-4" /> Отменить</>
							) : (
								<><Edit3 className="mr-2 h-4 w-4" /> Редактировать</>
							)}
						</Button>
					</div>
				</div>

				<form onSubmit={handleSubmit(onSubmit)}>
					<div className="grid gap-6">
						{error && (
							<Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive-foreground">
								<AlertDescription>{error}</AlertDescription>
							</Alert>
						)}

						{/* Владелец */}
						<Card className="glass-elevated border-white/10 overflow-hidden">
							<CardHeader className="bg-white/5 border-b border-white/10">
								<CardTitle className="text-lg flex items-center gap-2">
									<UserIcon className="h-4 w-4 text-primary" /> Владелец устройства
								</CardTitle>
							</CardHeader>
							<CardContent className="p-6">
								<div className="space-y-2">
									<Label className="text-muted-foreground">Военнослужащий *</Label>
									{isEditing ? (
										<Select
											value={currentOwnerId?.toString() || ""}
											onValueChange={(val) =>
												setValue("owner_id", parseInt(val, 10))
											}
										>
											<SelectTrigger
												className={`bg-background/50 border-white/10 focus:border-primary/50 ${errors.owner_id ? "border-destructive/50" : ""}`}
											>
												<SelectValue placeholder="Выберите владельца" />
											</SelectTrigger>
											<SelectContent className="glass border-white/10">
												{personnelData?.items.map((person) => (
													<SelectItem
														key={person.id}
														value={person.id.toString()}
													>
														{person.rank ? `${person.rank} ` : ""}
														{person.full_name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									) : (
										<div className="p-3 rounded-md bg-white/5 border border-transparent font-medium">
											{phone.owner_rank && <span className="text-muted-foreground mr-1">{phone.owner_rank}</span>}
											{phone.owner_full_name || "Не указан"}
										</div>
									)}
									{errors.owner_id && (
										<p className="text-xs text-destructive mt-1">
											{errors.owner_id.message as string}
										</p>
									)}
								</div>
							</CardContent>
						</Card>

						{/* Данные телефона */}
						<Card className="glass-elevated border-white/10 overflow-hidden">
							<CardHeader className="bg-white/5 border-b border-white/10">
								<CardTitle className="text-lg flex items-center gap-2">
									<Smartphone className="h-4 w-4 text-primary" /> Сведения об устройстве
								</CardTitle>
							</CardHeader>
							<CardContent className="p-6 space-y-6">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div className="space-y-2">
										<Label htmlFor="model" className="text-muted-foreground">Модель</Label>
										<Input
											id="model"
											{...register("model")}
											disabled={!isEditing}
											placeholder="iPhone 14 Pro"
											className="bg-background/50 border-white/10 focus:border-primary/50 disabled:opacity-100 disabled:bg-white/5"
										/>
									</div>

									<div className="space-y-2">
										<Label htmlFor="color" className="text-muted-foreground">Цвет</Label>
										<Input
											id="color"
											{...register("color")}
											disabled={!isEditing}
											placeholder="Чёрный"
											className="bg-background/50 border-white/10 focus:border-primary/50 disabled:opacity-100 disabled:bg-white/5"
										/>
									</div>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div className="space-y-2">
										<Label htmlFor="imei_1" className="text-muted-foreground">IMEI 1</Label>
										<Input
											id="imei_1"
											{...register("imei_1")}
											disabled={!isEditing}
											placeholder="123456789012345"
											maxLength={15}
											className="bg-background/50 border-white/10 font-mono focus:border-primary/50 disabled:opacity-100 disabled:bg-white/5"
										/>
									</div>

									<div className="space-y-2">
										<Label htmlFor="imei_2" className="text-muted-foreground">IMEI 2</Label>
										<Input
											id="imei_2"
											{...register("imei_2")}
											disabled={!isEditing}
											placeholder="123456789012345"
											maxLength={15}
											className="bg-background/50 border-white/10 font-mono focus:border-primary/50 disabled:opacity-100 disabled:bg-white/5"
										/>
									</div>
								</div>

								<div className="space-y-2">
									<Label htmlFor="serial_number" className="text-muted-foreground">Серийный номер (S/N)</Label>
									<Input
										id="serial_number"
										{...register("serial_number")}
										disabled={!isEditing}
										placeholder="ABC123DEF456"
										className="bg-background/50 border-white/10 font-mono focus:border-primary/50 disabled:opacity-100 disabled:bg-white/5"
									/>
								</div>

								{/* Функции */}
								<div className="space-y-4">
									<Label className="text-xs font-bold uppercase tracking-widest text-primary/70">Разрешенные функции</Label>
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
										<div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${hasCamera ? 'bg-primary/5 border-primary/20' : 'bg-white/5 border-white/5 opacity-60'}`}>
											<Label htmlFor="has_camera" className="font-medium cursor-pointer">Камера</Label>
											<Checkbox
												id="has_camera"
												checked={hasCamera}
												onCheckedChange={(checked) =>
													setValue("has_camera", checked as boolean)
												}
												disabled={!isEditing}
												className="data-[state=checked]:bg-primary"
											/>
										</div>
										<div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${hasRecorder ? 'bg-primary/5 border-primary/20' : 'bg-white/5 border-white/5 opacity-60'}`}>
											<Label htmlFor="has_recorder" className="font-medium cursor-pointer">Диктофон</Label>
											<Checkbox
												id="has_recorder"
												checked={hasRecorder}
												onCheckedChange={(checked) =>
													setValue("has_recorder", checked as boolean)
												}
												disabled={!isEditing}
												className="data-[state=checked]:bg-primary"
											/>
										</div>
									</div>
								</div>
							</CardContent>
						</Card>

						{/* Хранение */}
						<Card className="glass-elevated border-white/10 overflow-hidden">
							<CardHeader className="bg-white/5 border-b border-white/10">
								<CardTitle className="text-lg flex items-center gap-2">
									<Shield className="h-4 w-4 text-primary" /> Хранение и статус
								</CardTitle>
							</CardHeader>
							<CardContent className="p-6 space-y-6">
								<div className="space-y-2">
									<Label htmlFor="storage_location" className="text-muted-foreground">Ячейка хранения</Label>
									<Input
										id="storage_location"
										{...register("storage_location")}
										disabled={!isEditing}
										placeholder="Ячейка 15"
										className="bg-background/50 border-white/10 focus:border-primary/50 disabled:opacity-100 disabled:bg-white/5"
									/>
								</div>

								<div className="space-y-2">
									<Label className="text-muted-foreground">Статус</Label>
									{isEditing ? (
										<Select
											value={currentStatus}
											onValueChange={(val) => setValue("status", val)}
										>
											<SelectTrigger className="bg-background/50 border-white/10 focus:border-primary/50">
												<SelectValue />
											</SelectTrigger>
											<SelectContent className="glass border-white/10">
												<SelectItem value="Выдан">Выдан</SelectItem>
												<SelectItem value="Сдан">Сдан</SelectItem>
											</SelectContent>
										</Select>
									) : (
										<div className="pt-1">{getStatusBadge(phone.status)}</div>
									)}
								</div>
							</CardContent>
						</Card>

						{/* Метаданные */}
						<Card className="bg-white/5 border-white/10">
							<CardContent className="p-5 space-y-3 text-xs text-muted-foreground">
								<div className="flex justify-between items-center">
									<span className="flex items-center gap-1.5"><Hash className="h-3 w-3" /> ID устройства</span>
									<span className="font-mono text-foreground/70">{phoneId}</span>
								</div>
								<div className="flex justify-between items-center">
									<span className="flex items-center gap-1.5"><Calendar className="h-3 w-3" /> Добавлено</span>
									<span className="text-foreground/70">{new Date(phone.created_at).toLocaleString("ru-RU")}</span>
								</div>
								<div className="flex justify-between items-center">
									<span className="flex items-center gap-1.5"><Info className="h-3 w-3" /> Обновлено</span>
									<span className="text-foreground/70">{new Date(phone.updated_at).toLocaleString("ru-RU")}</span>
								</div>
							</CardContent>
						</Card>
					</div>

					{isEditing && (
						<div className="fixed bottom-8 right-8 z-50 animate-in fade-in slide-in-from-bottom-4">
							<Button 
								type="submit" 
								disabled={updateMutation.isPending}
								className="gradient-primary border-0 shadow-2xl px-8 h-12 rounded-full font-bold"
							>
								{updateMutation.isPending ? (
									<div className="flex items-center gap-2">
										<div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
										Сохранение...
									</div>
								) : (
									<div className="flex items-center gap-2">
										<Save className="h-5 w-5" />
										Сохранить изменения
									</div>
								)}
							</Button>
						</div>
					)}
				</form>
			</div>
		</div>
	);
}