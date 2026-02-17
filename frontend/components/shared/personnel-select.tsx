"use client";

import { useQuery } from "@tanstack/react-query";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	SelectSearch,
} from "@/components/ui/select";
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

const NO_PERSON_VALUE = "__no_person__";

export function PersonnelSelect({
	value,
	onValueChange,
	placeholder = "Выберите сотрудника",
	emptyOptionLabel = "—",
	disabled = false,
	error = false,
}: PersonnelSelectProps) {
	const { data: personnelData, isLoading } = useQuery({
		queryKey: ["personnel"],
		queryFn: () => personnelApi.getList({ limit: 1000 }),
	});

	return (
		<Select
			value={value != null ? value.toString() : NO_PERSON_VALUE}
			onValueChange={(val) =>
				onValueChange(val === NO_PERSON_VALUE ? undefined : parseInt(val, 10))
			}
			disabled={disabled}
		>
			<SelectTrigger 
				className={cn(
					error && "border-destructive/50 ring-destructive/20 text-destructive-foreground"
				)}
			>
				<SelectValue placeholder={isLoading ? "Загрузка..." : placeholder} />
			</SelectTrigger>
			
			<SelectContent>
				<SelectSearch placeholder="Введите фамилию или звание..." />
				
				<SelectItem value={NO_PERSON_VALUE}>{emptyOptionLabel}</SelectItem>
				
				{personnelData?.items.map((person) => (
					<SelectItem key={person.id} value={person.id.toString()}>
						{person.rank && `${person.rank} `}
						{person.full_name}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}