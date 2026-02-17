"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, MapPin, User as UserIcon, FileText, Calendar, Info, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
import { Textarea } from "@/components/ui/textarea";
import { equipmentApi } from "@/lib/api/equipment";
import { personnelApi } from "@/lib/api/personnel";
import { cleanEmptyStrings } from "@/lib/utils/transform";

const MOVEMENT_TYPES = [
	"Передача",
	"Возврат",
	"Списание",
	"Ремонт",
	"Перемещение",
];

const movementSchema = z.object({
	from_location: z.string().default(""),
	to_location: z.string().min(1, "Укажите новое местоположение"),
	from_person_id: z.number().optional(),
	to_person_id: z.number().optional(),
	movement_type: z.string().min(1, "Выберите тип перемещения"),
	document_number: z.string().default(""),
	document_date: z.string().default(""),
	reason: z.string().default(""),
});

type MovementFormData = z.infer<typeof movementSchema>;

export default function CreateMovementPage() {
	const router = useRouter();
	const params = useParams();
	const queryClient = useQueryClient();
	const [error, setError] = useState("");

	const equipmentId = parseInt(params.id as string, 10);

	const { data: equipment } = useQuery({
		queryKey: ["equipment", equipmentId],
		queryFn: () => equipmentApi.getById(equipmentId),
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
		formState: { errors },
	} = useForm({
		resolver: zodResolver(movementSchema),
		defaultValues: {
			from_location: "",
			to_location: "",
			movement_type: "",
			document_number: "",
			document_date: "",
			reason: "",
		},
	});

	const createMutation = useMutation({
		mutationFn: (data: MovementFormData) =>
			equipmentApi.createMovement({ ...data, equipment_id: equipmentId }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["equipment", equipmentId] });
			queryClient.invalidateQueries({
				queryKey: ["equipment", equipmentId, "movements"],
			});
			toast.success("Перемещение зарегистрировано");
			router.push(`/equipment/${equipmentId}`);
		},
		onError: (err: unknown) => {
			const error = err as { response?: { data?: { detail?: string } } };
			const detail = error.response?.data?.detail;
			setError(typeof detail === "string" ? detail : "Ошибка при создании");
			toast.error("Ошибка при создании");
		},
	});

	const onSubmit = (data: MovementFormData) => {
		setError("");
		const cleanedData = cleanEmptyStrings(data);
		createMutation.mutate(cleanedData as MovementFormData);
	};

	const currentMovementType = watch("movement_type");
	const currentFromPersonId = watch("from_person_id");
	const currentToPersonId = watch("to_person_id");

	if (!equipment) {
		return (
			<div className="min-h-screen bg-slate-900 flex items-center justify-center">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 p-8 text-foreground">
			<div className="max-w-3xl mx-auto">
				<Button 
					variant="ghost" 
					asChild 
					className="mb-6 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
				>
					<Link href={`/equipment/${equipmentId}`}>
						<ArrowLeft className="mr-2 h-4 w-4" />
						Назад к технике
					</Link>
				</Button>

				<div className="mb-8">
					<h1 className="text-3xl font-bold tracking-tight">Регистрация перемещения</h1>
					<div className="flex items-center gap-2 mt-2 text-primary/80 font-mono text-sm">
						<span className="px-2 py-0.5 bg-primary/10 rounded border border-primary/20">
							{equipment.inventory_number}
						</span>
						<span className="text-muted-foreground">•</span>
						<span className="text-muted-foreground">{equipment.equipment_type}</span>
					</div>
				</div>

				<Card className="glass-elevated border-white/10 shadow-2xl overflow-hidden">
					<CardHeader className="bg-white/5 border-b border-white/10 py-6">
						<CardTitle className="text-lg flex items-center gap-2">
							<RefreshCw className="h-5 w-5 text-primary" />
							Детали операции
						</CardTitle>
					</CardHeader>

					<form onSubmit={handleSubmit(onSubmit)}>
						<CardContent className="p-8 space-y-10">
							{error && (
								<Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive-foreground">
									<AlertDescription>{error}</AlertDescription>
								</Alert>
							)}

							{/* Тип перемещения */}
							<div className="space-y-4">
								<div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary/70">
									<Info className="h-3.5 w-3.5" /> Общая информация
								</div>
								<div className="space-y-2">
									<Label className="text-muted-foreground">Тип перемещения *</Label>
									<Select
										value={currentMovementType}
										onValueChange={(val) => setValue("movement_type", val)}
									>
										<SelectTrigger
											className={`bg-background/50 border-white/10 focus:border-primary/50 ${
												errors.movement_type ? "border-destructive/50" : ""
											}`}
										>
											<SelectValue placeholder="Выберите тип" />
										</SelectTrigger>
										<SelectContent className="glass border-white/10">
											{MOVEMENT_TYPES.map((type) => (
												<SelectItem key={type} value={type}>
													{type}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									{errors.movement_type && (
										<p className="text-xs text-destructive mt-1">
											{errors.movement_type.message as string}
										</p>
									)}
								</div>
							</div>

							{/* Местоположение */}
							<div className="space-y-4">
								<div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary/70 border-b border-white/5 pb-2">
									<MapPin className="h-3.5 w-3.5" /> Локация
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div className="space-y-2">
										<Label htmlFor="from_location" className="text-muted-foreground">Откуда (прежнее)</Label>
										<Input
											id="from_location"
											{...register("from_location")}
											placeholder={
												equipment.current_location || "Текущее местоположение"
											}
											className="bg-background/50 border-white/10 focus:border-primary/50"
										/>
									</div>

									<div className="space-y-2">
										<Label htmlFor="to_location" className="text-muted-foreground">Куда (новое) *</Label>
										<Input
											id="to_location"
											{...register("to_location")}
											placeholder="Новое местоположение"
											className={`bg-background/50 border-white/10 focus:border-primary/50 ${
												errors.to_location ? "border-destructive/50" : ""
											}`}
										/>
										{errors.to_location && (
											<p className="text-xs text-destructive mt-1">
												{errors.to_location.message as string}
											</p>
										)}
									</div>
								</div>
							</div>

							{/* Ответственные лица */}
							<div className="space-y-4">
								<div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary/70 border-b border-white/5 pb-2">
									<UserIcon className="h-3.5 w-3.5" /> Ответственные лица
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div className="space-y-2">
										<Label className="text-muted-foreground">Передающий (От кого)</Label>
										<Select
											value={currentFromPersonId?.toString() || ""}
											onValueChange={(val) =>
												setValue(
													"from_person_id",
													val ? parseInt(val, 10) : undefined,
												)
											}
										>
											<SelectTrigger className="bg-background/50 border-white/10 focus:border-primary/50">
												<SelectValue placeholder="Выберите (опционально)" />
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
									</div>

									<div className="space-y-2">
										<Label className="text-muted-foreground">Принимающий (Кому)</Label>
										<Select
											value={currentToPersonId?.toString() || ""}
											onValueChange={(val) =>
												setValue(
													"to_person_id",
													val ? parseInt(val, 10) : undefined,
												)
											}
										>
											<SelectTrigger className="bg-background/50 border-white/10 focus:border-primary/50">
												<SelectValue placeholder="Выберите (опционально)" />
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
									</div>
								</div>
							</div>

							{/* Документ */}
							<div className="space-y-4">
								<div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary/70 border-b border-white/5 pb-2">
									<FileText className="h-3.5 w-3.5" /> Основание (документ)
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div className="space-y-2">
										<Label htmlFor="document_number" className="text-muted-foreground">Номер документа</Label>
										<Input
											id="document_number"
											{...register("document_number")}
											placeholder="Приказ №123"
											className="bg-background/50 border-white/10 focus:border-primary/50 font-mono"
										/>
									</div>

									<div className="space-y-2">
										<Label htmlFor="document_date" className="text-muted-foreground flex items-center gap-2">
											<Calendar className="h-3 w-3" /> Дата документа
										</Label>
										<Input
											id="document_date"
											type="date"
											{...register("document_date")}
											className="bg-background/50 border-white/10 focus:border-primary/50 dark:[color-scheme:dark]"
										/>
									</div>
								</div>
							</div>

							{/* Причина */}
							<div className="space-y-2">
								<Label htmlFor="reason" className="text-muted-foreground">Обоснование / Причина</Label>
								<Textarea
									id="reason"
									{...register("reason")}
									placeholder="Опишите причину перемещения..."
									rows={3}
									className="bg-background/50 border-white/10 focus:border-primary/50 resize-none"
								/>
							</div>
						</CardContent>

						<CardFooter className="bg-white/5 border-t border-white/10 p-8 flex justify-between">
							<Button type="button" variant="ghost" asChild className="hover:bg-white/10">
								<Link href={`/equipment/${equipmentId}`}>Отмена</Link>
							</Button>
							<Button 
								type="submit" 
								disabled={createMutation.isPending}
								className="gradient-primary border-0 shadow-lg px-8 font-semibold"
							>
								{createMutation.isPending ? (
									<div className="flex items-center gap-2">
										<div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
										Регистрация...
									</div>
								) : (
									<div className="flex items-center gap-2">
										<Save className="h-4 w-4" />
										Создать перемещение
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