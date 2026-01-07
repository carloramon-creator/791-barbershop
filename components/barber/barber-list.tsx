import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Clock, ChevronRight, ArrowLeft, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface BarberListProps {
    barbers: any[];
    onSelect: (barberId: string) => void;
}

export function BarberList({ barbers, onSelect }: BarberListProps) {
    const [selectedId, setSelectedId] = useState<string | null>(null);

    if (barbers.length === 0) {
        return (
            <div className="text-center py-10 bg-slate-900/50 rounded-xl border border-slate-800">
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Nenhum barbeiro online no momento.</p>
            </div>
        );
    }

    const selectedBarber = barbers.find(b => b.barber_id === selectedId);

    if (selectedId && selectedBarber) {
        return (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <Card className="border-2 border-blue-500/50 bg-slate-900 overflow-hidden shadow-2xl shadow-blue-900/20 rounded-3xl">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-20 h-20 rounded-full border-2 border-blue-500 p-1">
                                <div className="w-full h-full rounded-full overflow-hidden bg-slate-800">
                                    {selectedBarber.photo_url ? (
                                        <img src={selectedBarber.photo_url} alt={selectedBarber.barber_name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-slate-500 font-black text-2xl uppercase">
                                            {selectedBarber.barber_name[0]}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-100 uppercase tracking-tighter">
                                    {selectedBarber.barber_nickname || selectedBarber.barber_name}
                                </h3>
                                <Badge className={cn(
                                    "mt-1 uppercase text-[10px] font-black tracking-widest",
                                    selectedBarber.status === 'available' ? "bg-emerald-500/20 text-emerald-500 border-emerald-500/50" : "bg-amber-500/20 text-amber-500 border-amber-500/50"
                                )}>
                                    {selectedBarber.status === 'available' ? 'Livre Agora' : 'Em Atendimento'}
                                </Badge>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center">
                                <Users size={16} className="mx-auto text-blue-500 mb-2" />
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Fila Atual</p>
                                <p className="text-xl font-black text-slate-100">{selectedBarber.queue.length} clientes</p>
                            </div>
                            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center">
                                <Clock size={16} className="mx-auto text-blue-500 mb-2" />
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Espera Est.</p>
                                <p className="text-xl font-black text-slate-100">{selectedBarber.total_estimated_wait_minutes} min</p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setSelectedId(null)}
                                className="flex-1 h-14 border-slate-800 text-slate-500 font-black uppercase rounded-2xl bg-slate-900/50"
                            >
                                <ArrowLeft className="mr-2" size={18} />
                                Voltar
                            </Button>
                            <Button
                                onClick={() => onSelect(selectedBarber.barber_id)}
                                className="flex-[2] h-14 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest rounded-2xl shadow-lg"
                            >
                                <Check className="mr-2" size={18} />
                                Confirmar
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-2">
            {barbers.map((barber) => (
                <div
                    key={barber.barber_id}
                    onClick={() => setSelectedId(barber.barber_id)}
                    className="flex flex-col items-center gap-2 group cursor-pointer"
                >
                    <div className={cn(
                        "relative w-24 h-24 rounded-full p-1 transition-all duration-300",
                        "border-2 border-slate-800 group-hover:border-blue-500/50 group-hover:scale-110",
                    )}>
                        <div className="w-full h-full rounded-full overflow-hidden bg-slate-900 ring-4 ring-slate-950">
                            {barber.photo_url ? (
                                <img src={barber.photo_url} alt={barber.barber_name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-700 font-black text-xl">
                                    {barber.barber_name[0]}
                                </div>
                            )}
                        </div>

                        {/* Status indicator dot */}
                        <div className={cn(
                            "absolute bottom-0 right-1 w-6 h-6 rounded-full border-4 border-slate-950 flex items-center justify-center",
                            barber.status === 'available' ? "bg-emerald-500" :
                                barber.status === 'busy' ? "bg-amber-500" : "bg-red-500"
                        )}>
                            <div className="w-2 h-2 rounded-full bg-white/30 animate-pulse" />
                        </div>
                    </div>

                    <div className="text-center">
                        <p className="text-[11px] font-black text-slate-100 uppercase truncate w-24 leading-tight">
                            {barber.barber_nickname || barber.barber_name.split(' ')[0]}
                        </p>
                        <p className={cn(
                            "text-[8px] font-bold uppercase tracking-widest",
                            ifAvailable(barber) ? "text-emerald-500" : "text-slate-500"
                        )}>
                            {barber.status === 'available' ? 'Livre' :
                                barber.status === 'busy' ? 'Ocupado' : 'Offline'}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
}

function ifAvailable(barber: any) {
    return barber.status === 'available';
}
