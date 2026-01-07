import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Clock, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface QueueStatusCardProps {
    ticket: {
        client_name: string;
        client_photo?: string;
        status: 'waiting' | 'attending' | 'finished';
        real_position: number;
        estimated_wait_minutes: number;
        barbers?: {
            name: string;
            photo_url?: string;
        };
    };
}

export function QueueStatusCard({ ticket }: QueueStatusCardProps) {
    const getStatusConfig = () => {
        switch (ticket.status) {
            case 'attending':
                return {
                    title: "Sua vez chegou!",
                    description: "Você está sendo atendido agora. Aproveite!",
                    color: "from-emerald-500 to-emerald-700",
                    glow: "shadow-emerald-900/40",
                    icon: <CheckCircle2 className="text-emerald-500 animate-bounce" size={48} />,
                    badge: "Em Atendimento"
                };
            case 'finished':
                return {
                    title: "Concluído!",
                    description: "Obrigado pela preferência. Volte sempre!",
                    color: "from-blue-500 to-blue-700",
                    glow: "shadow-blue-900/40",
                    icon: <Sparkles className="text-blue-500" size={48} />,
                    badge: "Finalizado"
                };
            default:
                return {
                    title: "Na Fila",
                    description: "Estamos preparando sua cadeira. Aguarde!",
                    color: "from-blue-600 to-blue-900",
                    glow: "shadow-blue-900/60",
                    icon: <Clock className="text-blue-500 animate-pulse" size={48} />,
                    badge: "Aguardando"
                };
        }
    };

    const config = getStatusConfig();

    return (
        <div className="space-y-8">
            <div className="relative group">
                <div className={cn(
                    "absolute -inset-1 bg-gradient-to-r blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200",
                    config.color
                )} />
                <Card className="relative bg-slate-900/80 backdrop-blur-xl border-slate-800/50 overflow-hidden rounded-[2.5rem]">
                    <CardContent className="p-10 text-center space-y-6">
                        <div className="flex justify-center relative">
                            <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full" />
                            <div className="relative z-10 transition-transform duration-500 hover:scale-110">
                                {ticket.client_photo ? (
                                    <div className="w-24 h-24 rounded-full border-4 border-blue-500/30 overflow-hidden shadow-2xl">
                                        <img src={ticket.client_photo} alt={ticket.client_name} className="w-full h-full object-cover" />
                                    </div>
                                ) : (
                                    config.icon
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.4em]">Status do Ticket</p>
                            <h2 className="text-4xl font-black text-slate-100 uppercase leading-tight">
                                {config.title}
                            </h2>
                            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                                {config.description}
                            </p>
                        </div>

                        <div className="flex justify-center">
                            <Badge className={cn("font-black uppercase tracking-[0.2em] px-6 py-2 rounded-full text-[10px] border-none shadow-lg", config.color, config.glow)}>
                                {config.badge}
                            </Badge>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {ticket.status === 'waiting' && (
                <div className="grid grid-cols-2 gap-4">
                    <Card className="bg-slate-900/50 backdrop-blur-md border-slate-800/50 rounded-3xl overflow-hidden relative group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-600" />
                        <CardContent className="p-6 text-center space-y-1">
                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">Posição</p>
                            <p className="text-4xl font-black text-slate-100 transition-colors group-hover:text-blue-500">{ticket.real_position}<span className="text-lg">º</span></p>
                        </CardContent>
                    </Card>
                    <Card className="bg-slate-900/50 backdrop-blur-md border-slate-800/50 rounded-3xl overflow-hidden relative group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-600" />
                        <CardContent className="p-6 text-center space-y-1">
                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">Tempo</p>
                            <p className="text-4xl font-black text-slate-100 transition-colors group-hover:text-blue-500">~{ticket.estimated_wait_minutes}<span className="text-lg">m</span></p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {ticket.barbers && (
                <Card className="bg-slate-900/40 backdrop-blur-sm border-slate-800/50 rounded-3xl overflow-hidden">
                    <CardHeader className="p-5 border-b border-slate-800/50 bg-slate-800/20">
                        <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Seu Artista</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 flex items-center gap-5">
                        <div className="relative">
                            <div className="absolute -inset-1 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-full blur-[2px] opacity-40" />
                            <div className="relative w-16 h-16 rounded-full bg-slate-800 overflow-hidden border-2 border-slate-700 shadow-xl">
                                {ticket.barbers.photo_url ? (
                                    <img src={ticket.barbers.photo_url} alt={ticket.barbers.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-slate-500">
                                        <User size={32} />
                                    </div>
                                )}
                            </div>
                        </div>
                        <div>
                            <p className="text-xl font-black text-slate-100 uppercase leading-none">{ticket.barbers.name}</p>
                            <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest mt-1.5">Profissional Designado</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {ticket.status === 'waiting' && (
                <div className="flex items-start gap-4 p-6 bg-blue-600/5 border border-blue-600/20 rounded-[2rem] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/5 rounded-full blur-3xl -mr-12 -mt-12" />
                    <AlertCircle className="text-blue-500 shrink-0 mt-1" size={20} />
                    <p className="text-[11px] text-slate-400 font-bold leading-relaxed uppercase tracking-tighter">
                        O tempo é uma estimativa. Acompanhe a fila em tempo real e fique por perto para não perder sua vez!
                    </p>
                </div>
            )}
        </div>
    );
}

