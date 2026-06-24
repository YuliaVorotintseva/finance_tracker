import { cn } from "../lib/utils";

const COLORS = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#eab308",
  "#84cc16",
  "#22c55e",
  "#10b981",
  "#14b8a6",
  "#06b6d4",
  "#0ea5e9",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#d946ef",
  "#ec4899",
  "#f43f5e",
  "#64748b",
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  className?: string;
}

export const ColorPicker = ({
  value,
  onChange,
  className,
}: ColorPickerProps) => (
  <div className={cn("flex flex-wrap gap-2", className)}>
    {COLORS.map((color) => (
      <button
        key={color}
        type="button"
        className={cn(
          "h-8 w-8 rounded-full border-2 transition-transform",
          value === color
            ? "scale-110 border-foreground"
            : "border-transparent hover:scale-105",
        )}
        style={{ backgroundColor: color }}
        onClick={() => onChange(color)}
      />
    ))}
  </div>
);
