"use client";

import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { personnelApi } from "@/lib/api/personnel";
import { cn } from "@/lib/utils";

interface PersonnelSelectProps {
	value?: number;
	onValueChange: (value: number | undefined) => void;
	placeholder?: string;
	emptyOptionLabel?: string;
	disabled?: boolean;
	error?: boolean;
}

export function PersonnelSelect({
	value,
	onValueChange,
	placeholder = "Выберите сотрудника",
	emptyOptionLabel = "—",
	disabled = false,
	error = false,
}: PersonnelSelectProps) {
	const [open, setOpen] = React.useState(false);
	const [search, setSearch] = React.useState("");
	const inputRef = React.useRef<HTMLInputElement>(null);

	const { data: personnelData, isLoading } = useQuery({
		queryKey: ["personnel"],
		queryFn: () => personnelApi.getList({ limit: 1000 }),
	});

	// Автофокус на поисковое поле при открытии
	React.useEffect(() => {
		if (open) {
			// Небольшая задержка, чтобы popover успел отрендериться
			const timer = setTimeout(() => {
				inputRef.current?.focus();
			}, 10);
			return () => clearTimeout(timer);
		} else {
			setSearch("");
		}
	}, [open]);

	const selectedPerson = React.useMemo(
		() => personnelData?.items.find((p) => p.id === value),
		[personnelData, value],
	);

	const filteredItems = React.useMemo(() => {
		if (!personnelData?.items) return [];
		if (!search.trim()) return personnelData.items;
		const q = search.toLowerCase();
		return personnelData.items.filter(
			(p) =>
				p.full_name.toLowerCase().includes(q) ||
				(p.rank && p.rank.toLowerCase().includes(q)) ||
				(p.position && p.position.toLowerCase().includes(q)),
		);
	}, [personnelData, search]);

	const displayValue = React.useMemo(() => {
		if (value == null) return null;
		if (!selectedPerson) return null;
		return selectedPerson.rank
			? `${selectedPerson.rank} ${selectedPerson.full_name}`
			: selectedPerson.full_name;
	}, [value, selectedPerson]);

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
						{isLoading
							? "Загрузка..."
							: displayValue ?? placeholder}
					</span>
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</button>
			</PopoverPrimitive.Trigger>

			<PopoverPrimitive.Portal>
				<PopoverPrimitive.Content
					className={cn(
						"z-50 w-(--radix-popover-trigger-width) min-w-64 overflow-hidden rounded-md border border-white/10 bg-slate-900/95 text-popover-foreground shadow-2xl backdrop-blur-xl",
						"data-[state=open]:animate-in data-[state=closed]:animate-out",
						"data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
						"data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
						"data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
					)}
					sideOffset={4}
					align="start"
					side="top"
					// Не перехватывать фокус обратно на триггер при закрытии
					onCloseAutoFocus={(e) => e.preventDefault()}
				>
					{/* Поисковая строка — обычный input, не внутри Radix Select */}
					<div className="flex items-center border-b border-white/10 px-3 bg-slate-900/95 sticky top-0 z-10">
						<Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
						<input
							ref={inputRef}
							type="text"
							autoComplete="off"
							placeholder="Введите фамилию или звание..."
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

						{/* Результаты */}
						{filteredItems.length === 0 ? (
							<div className="py-6 text-center text-sm text-muted-foreground">
								Ничего не найдено
							</div>
						) : (
							filteredItems.map((person) => {
								const label = person.rank
									? `${person.rank} ${person.full_name}`
									: person.full_name;
								const isSelected = person.id === value;

								return (
									<button
										key={person.id}
										type="button"
										className={cn(
											"relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-none select-none transition-colors text-left",
											"hover:bg-primary/20 focus:bg-primary/20",
											isSelected && "text-primary",
										)}
										onClick={() => {
											onValueChange(person.id);
											setOpen(false);
										}}
									>
										{isSelected && (
											<Check className="absolute right-2 h-4 w-4 text-primary shrink-0" />
										)}
										<span className="line-clamp-1">{label}</span>
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