"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { CheckIcon, ChevronDownIcon, ChevronUpIcon, Search, X } from "lucide-react";

import { cn } from "@/lib/utils";

const SelectSearchContext = React.createContext<{
	searchQuery: string;
	setSearchQuery: (query: string) => void;
	isSearchable: boolean;
	setIsSearchable: (val: boolean) => void;
} | null>(null);

function Select({
	children,
	onOpenChange,
	...props
}: React.ComponentProps<typeof SelectPrimitive.Root>) {
	const [searchQuery, setSearchQuery] = React.useState("");
	const [isSearchable, setIsSearchable] = React.useState(false);

	const handleOpenChange = (open: boolean) => {
		if (!open) setSearchQuery("");
		onOpenChange?.(open);
	};

	return (
		<SelectSearchContext.Provider value={{ searchQuery, setSearchQuery, isSearchable, setIsSearchable }}>
			<SelectPrimitive.Root onOpenChange={handleOpenChange} {...props}>
				{children}
			</SelectPrimitive.Root>
		</SelectSearchContext.Provider>
	);
}

function SelectGroup({ ...props }: React.ComponentProps<typeof SelectPrimitive.Group>) {
	return <SelectPrimitive.Group data-slot="select-group" {...props} />;
}

function SelectValue({ ...props }: React.ComponentProps<typeof SelectPrimitive.Value>) {
	return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

function SelectTrigger({
	className,
	size = "default",
	children,
	...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
	size?: "sm" | "default";
}) {
	return (
		<SelectPrimitive.Trigger
			data-slot="select-trigger"
			data-size={size}
			className={cn(
				"flex w-fit items-center justify-between gap-2 rounded-md border border-white/10 bg-background/50 px-3 py-2 text-sm whitespace-nowrap shadow-sm transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8 data-placeholder:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground/50",
				className,
			)}
			{...props}
		>
			<span className="line-clamp-1 flex items-center gap-2">
				{children}
			</span>
			<SelectPrimitive.Icon asChild>
				<ChevronDownIcon className="size-4 opacity-50" />
			</SelectPrimitive.Icon>
		</SelectPrimitive.Trigger>
	);
}

const SelectSearch = React.forwardRef<
	HTMLInputElement,
	React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => {
	const context = React.useContext(SelectSearchContext);
	const internalRef = React.useRef<HTMLInputElement>(null);
    
	React.useImperativeHandle(ref, () => internalRef.current as HTMLInputElement);

	React.useEffect(() => {
		context?.setIsSearchable(true);
		return () => context?.setIsSearchable(false);
	}, [context]);

	// Автофокус при открытии списка
	React.useEffect(() => {
		const timer = setTimeout(() => {
			internalRef.current?.focus();
		}, 0);
		return () => clearTimeout(timer);
	}, []);

	if (!context) return null;

	return (
		<div className="flex items-center border-b border-white/10 px-3 sticky top-0 bg-slate-900/95 backdrop-blur-md z-10">
			<Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
			<input
				ref={internalRef}
				autoComplete="off"
				className={cn(
					"flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground",
					className
				)}
				value={context.searchQuery}
				onChange={(e: React.ChangeEvent<HTMLInputElement>) => context.setSearchQuery(e.target.value)}
				onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
					// Останавливаем распространение, чтобы Select не перехватывал нажатия (навигацию)
					e.stopPropagation();
				}}
				onClick={(e: React.MouseEvent) => e.stopPropagation()}
				{...props}
			/>
			{context.searchQuery && (
				<X 
					className="h-4 w-4 opacity-50 cursor-pointer hover:opacity-100" 
					onClick={(e: React.MouseEvent) => {
						e.stopPropagation();
						context.setSearchQuery("");
						internalRef.current?.focus();
					}}
				/>
			)}
		</div>
	);
});
SelectSearch.displayName = "SelectSearch";

function SelectContent({
	className,
	children,
	position = "popper",
	...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
	return (
		<SelectPrimitive.Portal>
			<SelectPrimitive.Content
				data-slot="select-content"
				className={cn(
					"relative z-50 max-h-96 min-w-32 overflow-hidden rounded-md border border-white/10 bg-slate-900/95 text-popover-foreground shadow-2xl backdrop-blur-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
					position === "popper" &&
						"data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
					className,
				)}
				position={position}
				{...props}
			>
				<SelectScrollUpButton />
				<SelectPrimitive.Viewport
					className={cn(
						"p-1",
						position === "popper" &&
							"h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
					)}
				>
					{children}
				</SelectPrimitive.Viewport>
				<SelectScrollDownButton />
			</SelectPrimitive.Content>
		</SelectPrimitive.Portal>
	);
}

function SelectLabel({ ...props }: React.ComponentProps<typeof SelectPrimitive.Label>) {
	return (
		<SelectPrimitive.Label
			className={cn("px-2 py-1.5 text-xs font-semibold text-muted-foreground/70", props.className)}
			{...props}
		/>
	);
}

function SelectItem({
	className,
	children,
	...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
	const context = React.useContext(SelectSearchContext);
	
	const textContent = React.useMemo(() => {
		return React.Children.toArray(children)
			.map(child => (typeof child === 'string' || typeof child === 'number' ? child : ''))
			.join('')
			.toLowerCase();
	}, [children]);

	if (context?.searchQuery && !textContent.includes(context.searchQuery.toLowerCase())) {
		return null;
	}

	return (
		<SelectPrimitive.Item
			data-slot="select-item"
			className={cn(
				"relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-none select-none transition-colors focus:bg-primary/20 focus:text-primary-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
				className,
			)}
			{...props}
		>
			<span
				className="absolute right-2 flex size-3.5 items-center justify-center"
			>
				<SelectPrimitive.ItemIndicator>
					<CheckIcon className="size-4 text-primary" />
				</SelectPrimitive.ItemIndicator>
			</span>
			<SelectPrimitive.ItemText>
				<span className="flex items-center gap-2">{children}</span>
			</SelectPrimitive.ItemText>
		</SelectPrimitive.Item>
	);
}

function SelectSeparator({ ...props }: React.ComponentProps<typeof SelectPrimitive.Separator>) {
	return (
		<SelectPrimitive.Separator
			className={cn("bg-white/5 pointer-events-none -mx-1 my-1 h-px", props.className)}
			{...props}
		/>
	);
}

function SelectScrollUpButton({ ...props }: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
	return (
		<SelectPrimitive.ScrollUpButton
			className={cn("flex cursor-default items-center justify-center py-1 opacity-50 hover:opacity-100", props.className)}
			{...props}
		>
			<ChevronUpIcon className="size-4" />
		</SelectPrimitive.ScrollUpButton>
	);
}

function SelectScrollDownButton({ ...props }: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
	return (
		<SelectPrimitive.ScrollDownButton
			className={cn("flex cursor-default items-center justify-center py-1 opacity-50 hover:opacity-100", props.className)}
			{...props}
		>
			<ChevronDownIcon className="size-4" />
		</SelectPrimitive.ScrollDownButton>
	);
}

export {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectScrollDownButton,
	SelectScrollUpButton,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
	SelectSearch,
};