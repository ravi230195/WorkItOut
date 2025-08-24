// src/components/BackButton.tsx
import { ArrowLeft } from "lucide-react";
import { TactileButton } from "./TactileButton";

type BackButtonProps = {
    onClick: () => void;
    className?: string;
    iconSize?: number;
    ariaLabel?: string;
    variant?: "primary" | "secondary";
    size?: "sm" | "md" | "lg";
};

export default function BackButton({
    onClick,
    className,
    iconSize = 20,
    ariaLabel = "Go back",
    variant = "secondary",
    size = "sm",
}: BackButtonProps) {
    return (
        <TactileButton
            variant={variant}
            size={size}
            onClick={onClick}
            className={className}
            aria-label={ariaLabel}
        >
            <ArrowLeft size={iconSize} />
        </TactileButton>
    );
}