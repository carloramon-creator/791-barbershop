import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface BarberCardProps {
    barber: {
        barber_id: string;
        barber_name: string;
        barber_nickname?: string;
        photo_url?: string;
        status: string;
        is_active: boolean;
        queue: any[];
        total_estimated_wait_minutes: number;
    };
    isSelected: boolean;
    onSelect: () => void;
}

export function BarberCard({ barber, isSelected, onSelect }: BarberCardProps) {
    const isAvailable = barber.is_active && barber.status === 'available';

    return (
        <Card
            className={cn(
                "cursor-pointer transition-all duration-300 border-2 overflow-hidden bg-slate-900",
                isSelected
                    ? "border-blue-500 ring-2 ring-blue-500/20 scale-[1.02]"
                    : "border-slate-800 hover:border-slate-700 hover:bg-slate-800/80"
            )}
            onClick={onSelect}
        >
            <CardContent className="p-0">
                <div className="relative h-40 w-full bg-slate-800">
                    {barber.photo_url ? (
                        <img
                            src={barber.photo_url}
                            alt={barber.barber_nickname || barber.barber_name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-slate-500 italic">
                            Sem foto
                        </div>
                    )}
                    <div className="absolute top-2 right-2">
                        <Badge className={cn(
                            "font-bold uppercase tracking-tighter text-[10px]",
                            barber.is_active ? "bg-emerald-500/90" : "bg-red-500/90"
                        )}>
                            {barber.is_active ? 'Online' : 'Pausa'}
                        </Badge>
                    </div>
                </div>

                <div className="p-4 space-y-3">
                    <div>
                        <h3 className="text-lg font-black text-slate-100 uppercase">
                            {barber.barber_nickname || barber.barber_name}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={cn(
                                "w-2 h-2 rounded-full",
                                barber.status === 'busy' ? "bg-amber-500" : "bg-blue-500 animate-pulse"
                            )} />
                            <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                                {barber.status === 'busy' ? 'Atendendo' : 'Livre'}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800/50">
                            <div className="flex items-center gap-1 text-slate-500 mb-1">
                                <Users size={12} />
                                <span className="text-[10px] font-bold uppercase tracking-tighter">Fila</span>
                            </div>
                            <p className="text-sm font-black text-slate-200">{barber.queue.length} clientes</p>
                        </div>
                        <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800/50">
                            <div className="flex items-center gap-1 text-slate-500 mb-1">
                                <Clock size={12} />
                                <span className="text-[10px] font-bold uppercase tracking-tighter">Espera</span>
                            </div>
                            <p className="text-sm font-black text-slate-200">{barber.total_estimated_wait_minutes} min</p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
