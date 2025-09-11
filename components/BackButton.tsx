// src/components/BackButton.tsx
import { ArrowLeft } from "lucide-react";
import { cn } from "./ui/utils";

type BackButtonProps = {
    onClick: () => void;
    className?: string;
    iconSize?: number;
    ariaLabel?: string;
};

export default function BackButton({
    onClick,
    className,
    iconSize = 24,
    ariaLabel = "Go back",
}: BackButtonProps) {
    return (
        <button
            onClick={onClick}
            aria-label={ariaLabel}
            className={cn("p-0 m-0 bg-transparent border-0 text-black", className)}
        >
            <ArrowLeft size={iconSize} />
        </button>
    );
}