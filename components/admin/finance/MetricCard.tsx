"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDownRight, ArrowUpRight, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface MetricCardProps {
    title: string;
    value: string;
    description?: string;
    icon?: any;
    trend?: {
        value: number; // Percentage, e.g., 12.5
        isPositive: boolean;
    };
    chartData?: any[]; // Array of { value: number }
    color?: "blue" | "green" | "red" | "amber";
    delay?: number; // Animation delay index
    onClick?: () => void;
}

const colorMap = {
    blue: {
        bg: "bg-blue-500/10",
        text: "text-blue-500",
        border: "border-blue-500/20",
        gradient: ["#3b82f6", "#eff6ff"],
    },
    green: {
        bg: "bg-emerald-500/10",
        text: "text-emerald-500",
        border: "border-emerald-500/20",
        gradient: ["#10b981", "#ecfdf5"],
    },
    red: {
        bg: "bg-rose-500/10",
        text: "text-rose-500",
        border: "border-rose-500/20",
        gradient: ["#f43f5e", "#fff1f2"],
    },
    amber: {
        bg: "bg-amber-500/10",
        text: "text-amber-500",
        border: "border-amber-500/20",
        gradient: ["#f59e0b", "#fffbeb"],
    },
};

export function MetricCard({
    title,
    value,
    description,
    icon: Icon = DollarSign,
    trend,
    chartData,
    color = "blue",
    delay = 0,
    onClick
}: MetricCardProps) {
    const theme = colorMap[color];

    return (
        <Card
            onClick={onClick}
            className={cn(
                "relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group",
                "bg-white light:bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-800",
                "animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards",
                onClick && "cursor-pointer hover:ring-2 hover:ring-offset-2 hover:ring-offset-slate-950 hover:ring-blue-600/50"
            )}
            style={{ animationDelay: `${delay * 100}ms` }}
        >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 z-10 relative">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">
                    {title}
                </CardTitle>
                <div className={cn("p-2 rounded-xl transition-colors group-hover:bg-white/20", theme.bg)}>
                    <Icon className={cn("h-4 w-4", theme.text)} />
                </div>
            </CardHeader>
            <CardContent className="z-10 relative">
                <div className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50 mb-1">
                    {value}
                </div>
                {(trend || description) && (
                    <div className="flex items-center text-xs space-x-2">
                        {trend && (
                            <span className={cn(
                                "flex items-center font-bold px-1.5 py-0.5 rounded-md",
                                trend.isPositive
                                    ? "text-emerald-500 bg-emerald-500/10"
                                    : "text-rose-500 bg-rose-500/10"
                            )}>
                                {trend.isPositive ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                                {Math.abs(trend.value)}%
                            </span>
                        )}
                        {description && (
                            <span className="text-slate-400 font-medium truncate">
                                {description}
                            </span>
                        )}
                    </div>
                )}
            </CardContent>

            {/* Sparkline Background */}
            {chartData && chartData.length > 0 && (
                <div className="absolute inset-0 top-12 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={theme.gradient[0]} stopOpacity={0.5} />
                                    <stop offset="100%" stopColor={theme.gradient[0]} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke={theme.gradient[0]}
                                strokeWidth={3}
                                fill={`url(#gradient-${color})`}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}
        </Card>
    );
}
