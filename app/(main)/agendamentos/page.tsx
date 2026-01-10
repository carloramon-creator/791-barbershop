'use client';

import { useState, useEffect } from 'react';
import { Api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Calendar as CalendarIcon,
    Plus,
    ChevronLeft,
    ChevronRight,
    Clock,
    User,
    Phone,
    MoreVertical,
    Trash2,
    CheckCircle2,
    XCircle
} from 'lucide-react';
import { format, addDays, subDays, startOfDay, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AppointmentsPage() {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [appointments, setAppointments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddOpen, setIsAddOpen] = useState(false);

    // Form state
    const [newClientName, setNewClientName] = useState('');
    const [newClientPhone, setNewClientPhone] = useState('');
    const [newBarberId, setNewBarberId] = useState('');
    const [newTime, setNewTime] = useState('09:00');
    const [barbers, setBarbers] = useState<any[]>([]);

    useEffect(() => {
        fetchBarbers();
        fetchAppointments();
    }, [selectedDate]);

    const fetchBarbers = async () => {
        try {
            const data = await Api.getBarbers();
            setBarbers(data);
        } catch (error) {
            console.error('Error fetching barbers:', error);
        }
    };

    const fetchAppointments = async () => {
        setLoading(true);
        try {
            const dateStr = format(selectedDate, 'yyyy-MM-dd');
            const data = await Api.getAppointments(dateStr);
            setAppointments(data || []);
        } catch (error) {
            console.error('Error fetching appointments:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddAppointment = async () => {
        if (!newClientName || !newBarberId) {
            alert('Preencha pelo menos o nome e o barbeiro.');
            return;
        }

        try {
            const startStr = `${format(selectedDate, 'yyyy-MM-dd')}T${newTime}:00`;
            const startDate = new Date(startStr);
            const endDate = new Date(startDate.getTime() + 30 * 60000); // 30 mins default

            await Api.createAppointment({
                client_name: newClientName,
                client_phone: newClientPhone,
                barber_id: newBarberId,
                start_time: startDate.toISOString(),
                end_time: endDate.toISOString(),
                status: 'scheduled'
            });

            setIsAddOpen(false);
            resetForm();
            fetchAppointments();
        } catch (error) {
            alert('Erro ao criar agendamento.');
        }
    };

    const resetForm = () => {
        setNewClientName('');
        setNewClientPhone('');
        setNewBarberId('');
        setNewTime('09:00');
    };

    const handleStatusUpdate = async (id: string, status: string) => {
        try {
            await Api.updateAppointment(id, { status });
            fetchAppointments();
        } catch (error) {
            alert('Erro ao atualizar status.');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este agendamento?')) return;
        try {
            await Api.deleteAppointment(id);
            fetchAppointments();
        } catch (error) {
            alert('Erro ao excluir.');
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-100 uppercase italic">Agendamentos</h1>
                    <p className="text-slate-400 font-medium">Gerencie horários marcados para seus clientes.</p>
                </div>

                <Button
                    onClick={() => setIsAddOpen(true)}
                    className="h-14 px-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase italic tracking-widest shadow-lg shadow-blue-600/30"
                >
                    <Plus className="mr-2" /> Novo Agendamento
                </Button>
            </div>

            <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => setSelectedDate(subDays(selectedDate, 1))}>
                        <ChevronLeft />
                    </Button>
                    <div className="flex flex-col items-center min-w-[200px]">
                        <span className="text-xs font-black text-blue-500 uppercase tracking-widest">
                            {format(selectedDate, 'EEEE', { locale: ptBR })}
                        </span>
                        <span className="text-xl font-black text-slate-100">
                            {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                        </span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setSelectedDate(addDays(selectedDate, 1))}>
                        <ChevronRight />
                    </Button>
                </div>

                <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date())} className="border-slate-800 text-slate-400">
                    Hoje
                </Button>
            </div>

            <div className="grid gap-4">
                {loading ? (
                    <div className="text-center py-20 text-slate-500 font-bold uppercase tracking-widest animate-pulse">
                        Carregando agenda...
                    </div>
                ) : appointments.length === 0 ? (
                    <Card className="bg-slate-900/50 border-slate-800 border-dashed border-2 py-20 flex flex-col items-center justify-center opacity-40">
                        <CalendarIcon size={48} className="text-slate-600 mb-4" />
                        <p className="text-sm font-black uppercase tracking-widest">Nenhum agendamento para este dia</p>
                    </Card>
                ) : (
                    appointments.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()).map((appt) => (
                        <Card key={appt.id} className="bg-slate-900 border-slate-800 overflow-hidden group hover:border-blue-500/50 transition-all shadow-xl">
                            <CardContent className="p-0">
                                <div className="flex flex-col md:flex-row items-stretch md:items-center">
                                    <div className="bg-slate-950 p-6 flex flex-col items-center justify-center border-r border-slate-800 min-w-[120px]">
                                        <Clock className="w-4 h-4 text-blue-500 mb-1" />
                                        <span className="text-xl font-black text-slate-100">
                                            {format(new Date(appt.start_time), 'HH:mm')}
                                        </span>
                                    </div>

                                    <div className="flex-1 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-lg font-black text-slate-100 uppercase italic leading-none">{appt.client_name}</h3>
                                                <Badge className={cn(
                                                    "text-[9px] uppercase font-black px-2 py-0.5",
                                                    appt.status === 'scheduled' ? "bg-blue-500/10 text-blue-500" :
                                                        appt.status === 'confirmed' ? "bg-emerald-500/10 text-emerald-500" :
                                                            appt.status === 'cancelled' ? "bg-red-500/10 text-red-500" :
                                                                "bg-slate-500/10 text-slate-500"
                                                )}>
                                                    {appt.status === 'scheduled' ? 'Agendado' :
                                                        appt.status === 'confirmed' ? 'Confirmado' :
                                                            appt.status === 'cancelled' ? 'Cancelado' : 'Finalizado'}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-1.5 text-slate-500 text-xs font-bold">
                                                    <User size={12} className="text-slate-600" />
                                                    {appt.barber_nickname || appt.barber_name}
                                                </div>
                                                {appt.client_phone && (
                                                    <div className="flex items-center gap-1.5 text-slate-500 text-xs font-bold">
                                                        <Phone size={12} className="text-slate-600" />
                                                        {appt.client_phone}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {appt.status === 'scheduled' && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleStatusUpdate(appt.id, 'confirmed')}
                                                    className="bg-emerald-600/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-600 hover:text-white text-[10px] font-black uppercase italic"
                                                >
                                                    Confirmar
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDelete(appt.id)}
                                                className="text-slate-600 hover:text-red-500 hover:bg-red-500/10"
                                            >
                                                <Trash2 size={16} />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Modal Novo Agendamento */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
                    <DialogHeader>
                        <DialogTitle className="uppercase italic font-black">Novo Agendamento</DialogTitle>
                        <DialogDescription>Marque um horário para {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}.</DialogDescription>
                    </DialogHeader>

                    <div className="py-4 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2 col-span-2">
                                <Label>Nome do Cliente</Label>
                                <Input
                                    placeholder="Ex: João Silva"
                                    className="bg-slate-950 border-slate-800"
                                    value={newClientName}
                                    onChange={e => setNewClientName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Telefone</Label>
                                <Input
                                    placeholder="(00) 00000-0000"
                                    className="bg-slate-950 border-slate-800"
                                    value={newClientPhone}
                                    onChange={e => setNewClientPhone(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Horário</Label>
                                <Input
                                    type="time"
                                    className="bg-slate-950 border-slate-800"
                                    value={newTime}
                                    onChange={e => setNewTime(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2 col-span-2">
                                <Label>Barbeiro</Label>
                                <Select value={newBarberId} onValueChange={setNewBarberId}>
                                    <SelectTrigger className="bg-slate-950 border-slate-800">
                                        <SelectValue placeholder="Selecione um barbeiro" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                                        {barbers.map(b => (
                                            <SelectItem key={b.id} value={b.id}>{b.nickname || b.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsAddOpen(false)}>Cancelar</Button>
                        <Button onClick={handleAddAppointment} className="bg-blue-600 hover:bg-blue-700 font-black uppercase italic">
                            Agendar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
