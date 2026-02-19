"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Laptop, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { PersonnelSelect } from "@/components/shared/personnel-select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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

const LAPTOP_MANUFACTURERS = [
	"Apple", "ASUS", "Acer", "Dell", "HP", "Huawei",
	"Lenovo", "LG", "Microsoft", "MSI", "Samsung", "Другой",
];

const OS_OPTIONS = [
	"Windows 10", "Windows 11", "macOS", "Ubuntu", "Другая",
];

const RAM_OPTIONS = ["4", "8", "16", "32", "64"];

const schema = z.object({
	manufacturer: z.string().min(1, "Выберите производителя"),
	model: z.string().min(1, "Укажите модель"),
	serial_number: z.string().default(""),
	current_owner_id: z.number().optional(),
	operating_system: z.string().default(""),
	ram_gb: z.string().default(""),
	notes: z.string().default(""),
});

type FormInput = z.input<typeof schema>;
type FormData = z.output<typeof schema>;

export default function PersonalLaptopCreatePage() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const [error, setError] = useState("");

	const {
		register,
		handleSubmit,
		setValue,
		watch,
		formState: { errors },
	} = useForm<FormInput, unknown, FormData>({
		resolver: zodResolver(schema),
		shouldFocusError: false,
		defaultValues: {
			manufacturer: "",
			model: "",
			serial_number: "",
			operating_system: "",
			ram_gb: "",
			notes: "",
		},
	});

	const currentManufacturer = watch("manufacturer");
	const currentOs = watch("operating_system");
	const currentRam = watch("ram_gb");
	const currentOwnerId = watch("current_owner_id");

	const mutation = useMutation({
		mutationFn: (data: FormData) =>
			equipmentApi.create({
				equipment_type: "Ноутбук",
				is_personal: true,
				manufacturer: data.manufacturer,
				model: data.model,
				serial_number: data.serial_number || undefined,
				current_owner_id: data.current_owner_id ?? undefined,
				operating_system: data.operating_system || undefined,
				ram_gb: data.ram_gb ? Number(data.ram_gb) : undefined,
				notes: data.notes || undefined,
				status: "В работе",
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["equipment"] });
			toast.success("Личный ноутбук добавлен");
			router.push("/personal-items");
		},
		onError: (err: unknown) => {
			const e = err as { response?: { data?: { detail?: string } } };
			const detail = e.response?.data?.detail;
			setError(typeof detail === "string" ? detail : "Ошибка при сохранении");
			toast.error("Ошибка при сохранении");
		},
	});

	const onSubmit = (data: FormData) => {
		setError("");
		mutation.mutate(data);
	};

	const onInvalid = () => {
		toast.error("Проверьте обязательные поля формы");
	};

	return (
		<div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 p-8 text-foreground">
			<div className="max-w-2xl mx-auto">
				<Button
					variant="ghost"
					asChild
					className="mb-6 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
				>
					<Link href="/personal-items">
						<ArrowLeft className="mr-2 h-4 w-4" />
						Назад
					</Link>
				</Button>

				<div className="flex items-center gap-3 mb-8">
					<div className="p-3 bg-purple-500/10 rounded-xl">
						<Laptop className="h-6 w-6 text-purple-400" />
					</div>
					<div>
						<h1 className="text-2xl font-bold">Добавить личный ноутбук</h1>
						<p className="text-sm text-muted-foreground mt-0.5">
							Личное имущество военнослужащего — не принадлежит министерству
						</p>
					</div>
				</div>

				<Card className="glass-elevated border-white/10 shadow-2xl overflow-hidden">
					<CardHeader className="bg-white/5 border-b border-white/10 py-6">
						<CardTitle className="text-lg font-semibold flex items-center gap-2">
							<Laptop className="h-5 w-5 text-purple-400" />
							Данные ноутбука
						</CardTitle>
					</CardHeader>

					<form onSubmit={handleSubmit(onSubmit, onInvalid)}>
						<CardContent className="space-y-6 p-8">
							{error && (
								<Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive-foreground">
									<AlertDescription>{error}</AlertDescription>
								</Alert>
							)}

							{/* Производитель + Модель */}
							<div className="space-y-4">
								<h3 className="text-sm font-bold uppercase tracking-widest text-primary/70 border-b border-white/5 pb-2">
									Основная информация
								</h3>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div className="space-y-2">
										<Label className="text-muted-foreground">Производитель *</Label>
										<Select
											value={currentManufacturer}
											onValueChange={(val) => setValue("manufacturer", val)}
										>
											<SelectTrigger className={`bg-background/50 border-white/10 focus:border-primary/50 ${errors.manufacturer ? "border-destructive/50" : ""}`}>
												<SelectValue placeholder="Выберите..." />
											</SelectTrigger>
											<SelectContent className="glass border-white/10">
												{LAPTOP_MANUFACTURERS.map((m) => (
													<SelectItem key={m} value={m}>{m}</SelectItem>
												))}
											</SelectContent>
										</Select>
										{errors.manufacturer && (
											<p className="text-xs text-destructive">{errors.manufacturer.message}</p>
										)}
									</div>

									<div className="space-y-2">
										<Label htmlFor="model" className="text-muted-foreground">Модель *</Label>
										<Input
											id="model"
											{...register("model")}
											placeholder="MacBook Pro 14, ThinkPad X1..."
											className={`bg-background/50 border-white/10 focus:border-primary/50 ${errors.model ? "border-destructive/50" : ""}`}
										/>
										{errors.model && (
											<p className="text-xs text-destructive">{errors.model.message}</p>
										)}
									</div>
								</div>

								<div className="space-y-2">
									<Label htmlFor="serial_number" className="text-muted-foreground font-mono text-xs uppercase">Серийный номер (S/N)</Label>
									<Input
										id="serial_number"
										{...register("serial_number")}
										placeholder="C02XYZABC..."
										className="bg-background/50 border-white/10 focus:border-primary/50 font-mono"
									/>
								</div>
							</div>

							{/* Характеристики */}
							<div className="space-y-4">
								<h3 className="text-sm font-bold uppercase tracking-widest text-primary/70 border-b border-white/5 pb-2">
									Характеристики
								</h3>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div className="space-y-2">
										<Label className="text-muted-foreground">Операционная система</Label>
										<Select
											value={currentOs}
											onValueChange={(val) => setValue("operating_system", val)}
										>
											<SelectTrigger className="bg-background/50 border-white/10 focus:border-primary/50">
												<SelectValue placeholder="Выберите..." />
											</SelectTrigger>
											<SelectContent className="glass border-white/10">
												{OS_OPTIONS.map((os) => (
													<SelectItem key={os} value={os}>{os}</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>

									<div className="space-y-2">
										<Label className="text-muted-foreground">Объём RAM (ГБ)</Label>
										<Select
											value={currentRam}
											onValueChange={(val) => setValue("ram_gb", val)}
										>
											<SelectTrigger className="bg-background/50 border-white/10 focus:border-primary/50">
												<SelectValue placeholder="Выберите..." />
											</SelectTrigger>
											<SelectContent className="glass border-white/10">
												{RAM_OPTIONS.map((v) => (
													<SelectItem key={v} value={v}>{v} ГБ</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
								</div>
							</div>

							{/* Размещение */}
							<div className="space-y-4">
								<h3 className="text-sm font-bold uppercase tracking-widest text-primary/70 border-b border-white/5 pb-2">
									Размещение
								</h3>

								<div className="space-y-2">
									<Label className="text-muted-foreground">Владелец</Label>
									<PersonnelSelect
										value={currentOwnerId}
										onValueChange={(val) => setValue("current_owner_id", val)}
										placeholder="Выберите военнослужащего (опционально)"
									/>
								</div>
							</div>

							{/* Дополнительно */}
							<div className="space-y-4">
								<h3 className="text-sm font-bold uppercase tracking-widest text-primary/70 border-b border-white/5 pb-2">
									Дополнительно
								</h3>

								<div className="space-y-2">
									<Label htmlFor="notes" className="text-muted-foreground">Примечания</Label>
									<Textarea
										id="notes"
										{...register("notes")}
										placeholder="Дополнительные сведения..."
										rows={3}
										className="bg-background/50 border-white/10 focus:border-primary/50 resize-none"
									/>
								</div>

								<div className="flex items-start gap-3 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
									<Laptop className="h-4 w-4 text-purple-400 mt-0.5 shrink-0" />
									<p className="text-xs text-purple-300/80 leading-relaxed">
										Личный ноутбук не требует инвентарного номера МО и не учитывается как имущество министерства.
										Он отображается только в разделе «Личные вещи».
									</p>
								</div>
							</div>
						</CardContent>

						<CardFooter className="bg-white/5 flex justify-between border-t border-white/10 py-6 px-8">
							<Button type="button" variant="ghost" asChild className="hover:bg-white/10 text-muted-foreground transition-colors">
								<Link href="/personal-items">Отмена</Link>
							</Button>
							<Button
								type="submit"
								disabled={mutation.isPending}
								className="gradient-primary border-0 shadow-lg px-8 font-semibold"
							>
								{mutation.isPending ? (
									<div className="flex items-center gap-2">
										<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
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