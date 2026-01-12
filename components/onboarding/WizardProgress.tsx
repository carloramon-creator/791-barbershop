'use client';

import { cn } from '@/lib/utils';

interface WizardProgressProps {
    currentStep: number;
    totalSteps: number;
    title: string;
}

export function WizardProgress({ currentStep, totalSteps, title }: WizardProgressProps) {
    const percentage = (currentStep / totalSteps) * 100;

    return (
        <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-black text-slate-100">{title}</h2>
                <span className="text-sm font-bold text-slate-400">
                    Etapa {currentStep} de {totalSteps}
                </span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-500 ease-out"
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
}
