'use client';

import React from 'react';
import { HelpCircle } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface HelpTooltipProps {
    content: string;
    className?: string;
    iconClassName?: string;
}

export function HelpTooltip({ content, className, iconClassName }: HelpTooltipProps) {
    if (!content) return null;

    return (
        <TooltipProvider delayDuration={200}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        type="button"
                        className={cn(
                            "inline-flex items-center justify-center ml-1.5 focus:outline-none transition-transform hover:scale-110 active:scale-95",
                            className
                        )}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                        }}
                    >
                        <HelpCircle
                            className={cn(
                                "w-3.5 h-3.5 text-yellow-500 fill-yellow-500/10",
                                iconClassName
                            )}
                        />
                    </button>
                </TooltipTrigger>
                <TooltipContent
                    side="top"
                    className="max-w-xs bg-slate-900 border-slate-800 text-slate-200 text-xs font-medium px-3 py-2 shadow-xl animate-in zoom-in-95"
                >
                    <p>{content}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
