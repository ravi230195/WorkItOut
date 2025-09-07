import React from "react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";

interface MetricCardProps {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  iconClassName?: string;
  iconBgClassName?: string;
  title: string;
  subtitle?: string;
  rightNode?: React.ReactNode; // check circle or badge
  valueNode?: React.ReactNode; // big number
  helperNode?: React.ReactNode; // right side helper text
  progress?: number; // 0-100
  progressTrackClassName?: string; // e.g., 'bg-warm-sage/20'
  progressColorVar?: string; // e.g., 'hsl(var(--warm-sage))'
  children?: React.ReactNode; // any extra visualizations
}

export default function MetricCard({
  icon: Icon,
  iconClassName,
  iconBgClassName,
  title,
  subtitle,
  rightNode,
  valueNode,
  helperNode,
  progress,
  progressTrackClassName,
  progressColorVar,
  children,
}: MetricCardProps) {
  return (
    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader className="pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${iconBgClassName ?? "bg-foreground/5"}`}>
              <Icon size={24} className={iconClassName} />
            </div>
            <div>
              <h2 className="font-bold text-warm-brown text-xl">{title}</h2>
              {subtitle && <p className="text-sm text-warm-brown/60">{subtitle}</p>}
            </div>
          </div>
          {rightNode}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {(valueNode || helperNode) && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              {valueNode}
              {helperNode}
            </div>
            {typeof progress === "number" && (
              <Progress
                value={progress}
                className={`h-4 rounded-full ${progressTrackClassName ?? "bg-foreground/10"}`}
                style={{ "--progress-color": progressColorVar } as React.CSSProperties}
              />
            )}
          </div>
        )}

        {children}
      </CardContent>
    </Card>
  );
}

