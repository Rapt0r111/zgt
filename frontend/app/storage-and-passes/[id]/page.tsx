"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, UserMinus, UserPlus, Usb, ShieldCheck, Edit3, X, FileText, Calendar, Hash, Info, Settings } from "lucide-react";
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
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
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
import { personnelApi } from "@/lib/api/personnel";
import { storageAndPassesApi } from "@/lib/api/storage-and-passes";

const assetSchema = z
	.object({
		asset_type: z.enum(["flash_drive", "electronic_pass"]),
		serial_number: z.string().min(1),
		model: z.string().default(""),
		manufacturer: z.string().default(""),
		status: z.enum(["in_use", "stock", "broken", "lost"]),
		assigned_to_id: z.number().optional(),
		capacity_gb: z.number().optional(),
		access_level: z.number().optional(),
		notes: z.string().default(""),
	})
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

type AssetFormData = z.input<typeof assetSchema>;

export default function StorageAndPassDetailPage() {
	const _router = useRouter();
	const params = useParams();
	const queryClient = useQueryClient();
	const [error, setError] = useState("");
	const [isEditing, setIsEditing] = useState(false);
	const [showAssignDialog, setShowAssignDialog] = useState(false);
	const [selectedPersonnelId, setSelectedPersonnelId] = useState<number | null>(
		null,
	);

	const assetId = parseInt(params.id as string, 10);

	const { data: asset, isLoading } = useQuery({
		queryKey: ["storage-and-pass", assetId],
		queryFn: () => storageAndPassesApi.getById(assetId),
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
	} = useForm<AssetFormData>({
		resolver: zodResolver(assetSchema),
	});

	useEffect(() => {
		if (asset) {
			reset({
				asset_type: asset.asset_type,
				serial_number: asset.serial_number,
				model: asset.model || "",
				manufacturer: asset.manufacturer || "",
				status: asset.status,
				assigned_to_id: asset.assigned_to_id,
				capacity_gb: asset.capacity_gb,
				access_level: asset.access_level,
				notes: asset.notes || "",
			});
		}
	}, [asset, reset]);

	const updateMutation = useMutation({
		mutationFn: (data: AssetFormData) =>
			storageAndPassesApi.update(assetId, data),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["storage-and-pass", assetId],
			});
			queryClient.invalidateQueries({ queryKey: ["storage-and-passes"] });
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

	const assignMutation = useMutation({
		mutationFn: (personnelId: number) =>
			storageAndPassesApi.assign(assetId, { assigned_to_id: personnelId }),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["storage-and-pass", assetId],
			});
			queryClient.invalidateQueries({ queryKey: ["storage-and-passes"] });
			setShowAssignDialog(false);
			setSelectedPersonnelId(null);
			toast.success("Устройство выдано");
		},
		onError: (err: unknown) => {
			const error = err as { response?: { data?: { detail?: string } } };
			toast.error(error.response?.data?.detail || "Ошибка при выдаче");
		},
	});

	const revokeMutation = useMutation({
		mutationFn: () => storageAndPassesApi.revoke(assetId),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["storage-and-pass", assetId],
			});
			queryClient.invalidateQueries({ queryKey: ["storage-and-passes"] });
			toast.success("Устройство возвращено");
		},
		onError: (err: unknown) => {
			const error = err as { response?: { data?: { detail?: string } } };
			toast.error(error.response?.data?.detail || "Ошибка при возврате");
		},
	});

	const onSubmit = (data: AssetFormData) => {
		setError("");
		updateMutation.mutate(data);
	};

	const handleAssign = () => {
		if (selectedPersonnelId) {
			assignMutation.mutate(selectedPersonnelId);
		}
	};

	const currentStatus = watch("status");
	const currentOwnerId = watch("assigned_to_id");

	if (isLoading) {
		return (
			<div className="min-h-screen bg-slate-900 flex items-center justify-center">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
			</div>
		);
	}

	if (!asset) {
		return (
			<div className="min-h-screen bg-slate-900 flex items-center justify-center text-foreground">
				<p>Актив не найден</p>
			</div>
		);
	}

	const getStatusBadge = (status: string) => {
		const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
			in_use: "default",
			stock: "secondary",
			broken: "destructive",
			lost: "outline",
		};
		const labels: Record<string, string> = {
			in_use: "Используется",
			stock: "На складе",
			broken: "Сломан",
			lost: "Утерян",
		};
		return (
			<Badge variant={variants[status] || "default"} className="px-3 shadow-sm">
				{labels[status] || status}
			</Badge>
		);
	};

	return (
		<div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 p-8 text-foreground">
			<div className="max-w-4xl mx-auto">
				<Button variant="ghost" asChild className="mb-6 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors">
					<Link href="/storage-and-passes">
						<ArrowLeft className="mr-2 h-4 w-4" />
						Назад к списку
					</Link>
				</Button>

				<div className="flex flex-wrap justify-between items-start mb-8 gap-4">
					<div>
						<div className="flex items-center gap-3 mb-1">
							<h1 className="text-3xl font-bold tracking-tight">{asset.serial_number}</h1>
							{getStatusBadge(asset.status)}
						</div>
						<p className="text-muted-foreground flex items-center gap-2">
							<span className="font-medium text-primary/80">
								{asset.asset_type === "flash_drive" ? "USB-флешка" : "Электронный пропуск"}
							</span>
							{asset.model && (
								<>
									<span className="opacity-30">•</span>
									<span>{asset.manufacturer} {asset.model}</span>
								</>
							)}
						</p>
					</div>
					<div className="flex gap-2 items-center">
						{asset.status === "stock" && (
							<Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
								<DialogTrigger asChild>
									<Button size="sm" className="gradient-primary border-0 shadow-lg">
										<UserPlus className="mr-2 h-4 w-4" />
										Выдать
									</Button>
								</DialogTrigger>
								<DialogContent className="glass border-white/10 text-foreground">
									<DialogHeader>
										<DialogTitle>Выдать устройство</DialogTitle>
									</DialogHeader>
									<div className="space-y-4 py-4">
										<div className="space-y-2">
											<Label className="text-muted-foreground">Выберите сотрудника</Label>
											<Select
												value={selectedPersonnelId?.toString() || ""}
												onValueChange={(val) => setSelectedPersonnelId(parseInt(val, 10))}
											>
												<SelectTrigger className="bg-background/50 border-white/10">
													<SelectValue placeholder="Выберите сотрудника" />
												</SelectTrigger>
												<SelectContent className="glass border-white/10">
													{personnelData?.items.map((person) => (
														<SelectItem key={person.id} value={person.id.toString()}>
															{person.rank ? `${person.rank} ` : ""}{person.full_name}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
										<div className="flex justify-end gap-2 pt-4">
											<Button variant="ghost" onClick={() => setShowAssignDialog(false)} className="hover:bg-white/10">
												Отмена
											</Button>
											<Button
												className="gradient-primary border-0 shadow-lg"
												onClick={handleAssign}
												disabled={!selectedPersonnelId || assignMutation.isPending}
											>
												{assignMutation.isPending ? "Выдача..." : "Выдать"}
											</Button>
										</div>
									</div>
								</DialogContent>
							</Dialog>
						)}
						{asset.status === "in_use" && (
							<Button
								size="sm"
								variant="outline"
								className="bg-white/5 border-white/10 hover:bg-white/10"
								onClick={() => revokeMutation.mutate()}
								disabled={revokeMutation.isPending}
							>
								<UserMinus className="mr-2 h-4 w-4" />
								{revokeMutation.isPending ? "Возврат..." : "Вернуть"}
							</Button>
						)}
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

						{/* Основная информация */}
						<Card className="glass-elevated border-white/10 overflow-hidden">
							<CardHeader className="bg-white/5 border-b border-white/10">
								<CardTitle className="text-lg flex items-center gap-2">
									<Settings className="h-4 w-4 text-primary" /> Основные данные
								</CardTitle>
							</CardHeader>
							<CardContent className="p-6 space-y-6">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div className="space-y-2">
										<Label htmlFor="serial_number" className="text-muted-foreground">Серийный номер</Label>
										<Input
											id="serial_number"
											{...register("serial_number")}
											disabled={!isEditing}
											className="bg-background/50 border-white/10 font-mono focus:border-primary/50 disabled:opacity-100 disabled:bg-white/5"
										/>
									</div>

									<div className="space-y-2">
										<Label className="text-muted-foreground">Статус</Label>
										{isEditing ? (
											<Select
												value={currentStatus}
												onValueChange={(val) =>
													setValue("status", val as AssetFormData["status"], {
														shouldValidate: true,
													})
												}
											>
												<SelectTrigger className="bg-background/50 border-white/10">
													<SelectValue />
												</SelectTrigger>
												<SelectContent className="glass border-white/10">
													<SelectItem value="stock">На складе</SelectItem>
													<SelectItem value="in_use">Используется</SelectItem>
													<SelectItem value="broken">Сломан</SelectItem>
													<SelectItem value="lost">Утерян</SelectItem>
												</SelectContent>
											</Select>
										) : (
											<div className="pt-1">{getStatusBadge(asset.status)}</div>
										)}
									</div>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div className="space-y-2">
										<Label htmlFor="manufacturer" className="text-muted-foreground">Производитель</Label>
										<Input
											id="manufacturer"
											{...register("manufacturer")}
											disabled={!isEditing}
											className="bg-background/50 border-white/10 focus:border-primary/50 disabled:opacity-100 disabled:bg-white/5"
										/>
									</div>

									<div className="space-y-2">
										<Label htmlFor="model" className="text-muted-foreground">Модель</Label>
										<Input
											id="model"
											{...register("model")}
											disabled={!isEditing}
											className="bg-background/50 border-white/10 focus:border-primary/50 disabled:opacity-100 disabled:bg-white/5"
										/>
									</div>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									{asset.asset_type === "flash_drive" && (
										<div className="space-y-2">
											<Label htmlFor="capacity_gb" className="text-muted-foreground">Объём (ГБ)</Label>
											<Input
												id="capacity_gb"
												type="number"
												{...register("capacity_gb", { valueAsNumber: true })}
												disabled={!isEditing}
												className="bg-background/50 border-white/10 focus:border-primary/50 disabled:opacity-100 disabled:bg-white/5"
											/>
										</div>
									)}

									{asset.asset_type === "electronic_pass" && (
										<div className="space-y-2">
											<Label htmlFor="access_level" className="text-muted-foreground">Уровень доступа</Label>
											<Input
												id="access_level"
												type="number"
												{...register("access_level", { valueAsNumber: true })}
												disabled={!isEditing}
												className="bg-background/50 border-white/10 focus:border-primary/50 disabled:opacity-100 disabled:bg-white/5"
											/>
										</div>
									)}
								</div>

								{isEditing && currentStatus === "in_use" && (
									<div className="space-y-2 pt-4 border-t border-white/5 animate-in fade-in">
										<Label className="text-muted-foreground">Владелец *</Label>
										<Select
											value={currentOwnerId?.toString() || ""}
											onValueChange={(val) =>
												setValue(
													"assigned_to_id",
													val ? parseInt(val, 10) : undefined,
													{ shouldValidate: true },
												)
											}
										>
											<SelectTrigger className={`bg-background/50 border-white/10 ${errors.assigned_to_id ? "border-destructive/50" : ""}`}>
												<SelectValue placeholder="Выберите сотрудника" />
											</SelectTrigger>
											<SelectContent className="glass border-white/10">
												{personnelData?.items.map((person) => (
													<SelectItem key={person.id} value={person.id.toString()}>
														{person.rank ? `${person.rank} ` : ""}{person.full_name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										{errors.assigned_to_id && (
											<p className="text-xs text-destructive mt-1">{errors.assigned_to_id.message as string}</p>
										)}
									</div>
								)}
							</CardContent>
						</Card>

						{/* Текущий владелец */}
						{asset.assigned_to_name && (
							<Card className="glass-elevated border-white/10 overflow-hidden">
								<CardHeader className="bg-white/5 border-b border-white/10">
									<CardTitle className="text-lg flex items-center gap-2">
										<UserPlus className="h-4 w-4 text-primary" /> Текущий владелец
									</CardTitle>
								</CardHeader>
								<CardContent className="p-6">
									<div className="flex justify-between items-center">
										<div>
											<div className="font-semibold text-lg">{asset.assigned_to_name}</div>
											{asset.assigned_to_rank && (
												<div className="text-muted-foreground">{asset.assigned_to_rank}</div>
											)}
										</div>
										{asset.issue_date && (
											<div className="text-right">
												<div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Дата выдачи</div>
												<div className="text-sm font-medium">{new Date(asset.issue_date).toLocaleDateString("ru-RU")}</div>
											</div>
										)}
									</div>
								</CardContent>
							</Card>
						)}

						{/* Примечания */}
						<Card className="glass-elevated border-white/10 overflow-hidden">
							<CardHeader className="bg-white/5 border-b border-white/10">
								<CardTitle className="text-lg flex items-center gap-2">
									<Info className="h-4 w-4 text-primary" /> Примечания
								</CardTitle>
							</CardHeader>
							<CardContent className="p-6">
								<Textarea
									{...register("notes")}
									disabled={!isEditing}
									rows={4}
									placeholder="Дополнительная информация..."
									className="bg-background/50 border-white/10 resize-none disabled:opacity-100 disabled:bg-white/5"
								/>
							</CardContent>
						</Card>

						{/* Метаданные */}
						<Card className="bg-white/5 border-white/10">
							<CardContent className="p-5 space-y-3 text-xs text-muted-foreground">
								<div className="flex justify-between items-center">
									<span className="flex items-center gap-1.5"><Hash className="h-3 w-3" /> ID актива</span>
									<span className="font-mono text-foreground/70">{asset.id}</span>
								</div>
								<div className="flex justify-between items-center">
									<span className="flex items-center gap-1.5"><Calendar className="h-3 w-3" /> Создано</span>
									<span className="text-foreground/70">{new Date(asset.created_at).toLocaleString("ru-RU")}</span>
								</div>
								<div className="flex justify-between items-center">
									<span className="flex items-center gap-1.5"><Calendar className="h-3 w-3" /> Обновлено</span>
									<span className="text-foreground/70">{new Date(asset.updated_at).toLocaleString("ru-RU")}</span>
								</div>
							</CardContent>
						</Card>
					</div>

					{isEditing && (
						<div className="fixed bottom-8 right-8 z-50 animate-in fade-in slide-in-from-bottom-4">
							<div className="flex gap-3 p-2 rounded-2xl glass-elevated border border-white/20 shadow-2xl">
								<Button
									type="button"
									variant="ghost"
									onClick={() => setIsEditing(false)}
									className="hover:bg-white/10 text-muted-foreground"
								>
									Отмена
								</Button>
								<Button 
									type="submit" 
									disabled={updateMutation.isPending}
									className="gradient-primary border-0 shadow-lg px-6 font-semibold"
								>
									{updateMutation.isPending ? "Сохранение..." : <><Save className="mr-2 h-4 w-4" /> Сохранить</>}
								</Button>
							</div>
						</div>
					)}
				</form>
			</div>
		</div>
	);
}