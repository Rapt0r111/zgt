"use client";

import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { equipmentApi } from "@/lib/api/equipment";
import { cn } from "@/lib/utils";

interface EquipmentSelectProps {
	value?: number;
	onValueChange: (value: number | undefined) => void;
	placeholder?: string;
	emptyOptionLabel?: string;
	disabled?: boolean;
	error?: boolean;
}

/**
 * Формирует читаемый лейбл для единицы техники.
 * Примеры:
 *   "Ноутбук Aquarius NS685U / 570/720/321"
 *   "АРМ Dell OptiPlex 7090 / 570/720/321"
 *   "Принтер / 001/002/003"  (если нет модели)
 */
function formatEquipmentLabel(e: {
	equipment_type: string;
	manufacturer?: string;
	model?: string;
	inventory_number: string;
}): string {
	const parts = [e.equipment_type];
	if (e.manufacturer) parts.push(e.manufacturer);
	if (e.model) parts.push(e.model);
	return `${parts.join(" ")} / ${e.inventory_number}`;
}

export function EquipmentSelect({
	value,
	onValueChange,
	placeholder = "Выберите технику",
	emptyOptionLabel = "—",
	disabled = false,
	error = false,
}: EquipmentSelectProps) {
	const [open, setOpen] = React.useState(false);
	const [search, setSearch] = React.useState("");
	const inputRef = React.useRef<HTMLInputElement>(null);

	const { data: equipmentData, isLoading } = useQuery({
		queryKey: ["equipment", { limit: 1000 }],
		queryFn: () => equipmentApi.getList({ limit: 1000 }),
		staleTime: 5 * 60 * 1000,
	});

	// Автофокус при открытии
	React.useEffect(() => {
		if (open) {
			const timer = setTimeout(() => {
				inputRef.current?.focus();
			}, 10);
			return () => clearTimeout(timer);
		} else {
			setSearch("");
		}
	}, [open]);

	const selectedEquipment = React.useMemo(
		() => equipmentData?.items.find((e) => e.id === value),
		[equipmentData, value],
	);

	const filteredItems = React.useMemo(() => {
		if (!equipmentData?.items) return [];
		if (!search.trim()) return equipmentData.items;
		const q = search.toLowerCase();
		return equipmentData.items.filter(
			(e) =>
				(e.inventory_number ?? "").toLowerCase().includes(q) ||
				(e.model ?? "").toLowerCase().includes(q) ||
				(e.manufacturer ?? "").toLowerCase().includes(q) ||
				(e.equipment_type ?? "").toLowerCase().includes(q),
		);
	}, [equipmentData, search]);

	const displayValue = React.useMemo(() => {
		if (value == null || !selectedEquipment) return null;
		return formatEquipmentLabel(selectedEquipment);
	}, [value, selectedEquipment]);

	return (
		<PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
			<PopoverPrimitive.Trigger asChild>
				<button
					type="button"
					disabled={disabled}
					className={cn(
						"flex h-9 w-full items-center justify-between rounded-md border border-white/10 bg-background/50 px-3 py-2 text-sm shadow-sm transition-all outline-none",
						"hover:border-white/20 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50",
						"disabled:cursor-not-allowed disabled:opacity-50",
						open && "border-primary/50 ring-2 ring-primary/30",
						error && "border-destructive/50 ring-destructive/20",
					)}
				>
					<span className={cn("line-clamp-1 text-left", !displayValue && "text-muted-foreground")}>
						{isLoading ? "Загрузка..." : displayValue ?? placeholder}
					</span>
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</button>
			</PopoverPrimitive.Trigger>

			<PopoverPrimitive.Portal>
				<PopoverPrimitive.Content
					className={cn(
						"z-50 w-(--radix-popover-trigger-width) min-w-72 overflow-hidden rounded-md border border-white/10 bg-slate-900/95 text-popover-foreground shadow-2xl backdrop-blur-xl",
						"data-[state=open]:animate-in data-[state=closed]:animate-out",
						"data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
						"data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
						"data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
					)}
					sideOffset={4}
					align="start"
					side="top"
					onCloseAutoFocus={(e) => e.preventDefault()}
				>
					{/* Поиск */}
					<div className="flex items-center border-b border-white/10 px-3 bg-slate-900/95 sticky top-0 z-10">
						<Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
						<input
							ref={inputRef}
							type="text"
							autoComplete="off"
							placeholder="Модель, тип, учетный номер..."
							className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
						/>
						{search && (
							<X
								className="h-4 w-4 opacity-50 cursor-pointer hover:opacity-100 shrink-0"
								onClick={() => {
									setSearch("");
									inputRef.current?.focus();
								}}
							/>
						)}
					</div>

					{/* Список */}
					<div className="max-h-96 overflow-y-auto p-1">
						{/* Пустая опция */}
						<button
							type="button"
							className={cn(
								"relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-none select-none transition-colors",
								"hover:bg-primary/20 focus:bg-primary/20",
								value == null && "text-primary",
							)}
							onClick={() => {
								onValueChange(undefined);
								setOpen(false);
							}}
						>
							{value == null && (
								<Check className="absolute right-2 h-4 w-4 text-primary" />
							)}
							{emptyOptionLabel}
						</button>

						{filteredItems.length === 0 ? (
							<div className="py-6 text-center text-sm text-muted-foreground">
								Ничего не найдено
							</div>
						) : (
							filteredItems.map((equipment) => {
								const label = formatEquipmentLabel(equipment);
								const isSelected = equipment.id === value;

								return (
									<button
										key={equipment.id}
										type="button"
										className={cn(
											"relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-none select-none transition-colors text-left",
											"hover:bg-primary/20 focus:bg-primary/20",
											isSelected && "text-primary",
										)}
										onClick={() => {
											onValueChange(equipment.id);
											setOpen(false);
										}}
									>
										{isSelected && (
											<Check className="absolute right-2 h-4 w-4 text-primary shrink-0" />
										)}
										<div className="flex flex-col min-w-0">
											<span className="line-clamp-1 font-medium">{label}</span>
											{equipment.serial_number && (
												<span className="text-xs text-muted-foreground font-mono truncate">
													S/N: {equipment.serial_number}
												</span>
											)}
										</div>
									</button>
								);
							})
						)}
					</div>
				</PopoverPrimitive.Content>
			</PopoverPrimitive.Portal>
		</PopoverPrimitive.Root>
	);
}