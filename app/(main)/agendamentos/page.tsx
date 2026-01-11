'use client';

import { useState, useEffect } from 'react';
import { Api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Calendar as CalendarIcon,
    Plus,
    Clock,
    User,
    CheckCircle2,
    Search,
    ChevronLeft,
    ChevronRight,
    CalendarCheck,
    Scissors,
    Trash2,
    Phone,
    Loader2
} from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, startOfDay, addDays, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTrigger,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Service, Barber } from '@/lib/types';
import { useAuth } from '@/lib/auth-provider';

export default function AppointmentsPage() {
    // Main View State
    const [viewDate, setViewDate] = useState(new Date());
    const [appointments, setAppointments] = useState<any[]>([]);
    const [loadingAppts, setLoadingAppts] = useState(true);

    // Wizard State
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [step, setStep] = useState(1);
    const [loadingData, setLoadingData] = useState(false);
    const [stepTitle, setStepTitle] = useState('Selecionar Serviços');

    // Data for Wizard
    const [services, setServices] = useState<Service[]>([]);
    const [barbers, setBarbers] = useState<(Barber & { serviceIds: string[] })[]>([]);

    // Selection State
    const [selectedServices, setSelectedServices] = useState<Service[]>([]);
    const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [clientName, setClientName] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [availableSlots, setAvailableSlots] = useState<{ time: string, status: string, available: boolean }[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Calendar Helper State
    const [calendarMonth, setCalendarMonth] = useState(new Date());

    useEffect(() => {
        fetchAppointments();
    }, [viewDate]);

    // Reset wizard when closed
    useEffect(() => {
        if (!isWizardOpen) {
            setStep(1);
            setSelectedServices([]);
            setSelectedBarber(null);
            setSelectedTime(null);
            setClientName('');
            setClientPhone('');
            setAvailableSlots([]);
        } else {
            loadWizardData();
        }
    }, [isWizardOpen]);

    // Fetch slots when date or barber changes (Step 3)
    useEffect(() => {
        if (step === 3 && selectedBarber && selectedDate) {
            fetchAvailability();
        }
    }, [step, selectedDate, selectedBarber]);

    const fetchAppointments = async () => {
        setLoadingAppts(true);
        try {
            const dateStr = format(viewDate, 'yyyy-MM-dd');
            const data = await Api.getAppointments(dateStr);
            setAppointments(data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingAppts(false);
        }
    };

    const loadWizardData = async () => {
        setLoadingData(true);
        try {
            const [servicesData, barbersData] = await Promise.all([
                Api.getServices(),
                Api.getBarbers()
            ]);
            setServices(servicesData || []);

            // Load barber services for filtering
            const barbersWithServices = await Promise.all((barbersData || []).map(async (b: any) => {
                try {
                    const sIds = await Api.getBarberServices(b.id);
                    return { ...b, serviceIds: sIds || [] };
                } catch {
                    return { ...b, serviceIds: [] };
                }
            }));
            setBarbers(barbersWithServices);

        } catch (error) {
            console.error(error);
        } finally {
            setLoadingData(false);
        }
    };

    const fetchAvailability = async () => {
        if (!selectedBarber) return;
        setLoadingSlots(true);
        setAvailableSlots([]);
        try {
            const duration = selectedServices.reduce((acc, s) => acc + (s.duration_minutes || 30), 0);
            const dateStr = format(selectedDate, 'yyyy-MM-dd');
            const slots = await Api.getAvailability(dateStr, selectedBarber.id, duration);
            setAvailableSlots(slots || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingSlots(false);
        }
    };

    const handleConfirm = async () => {
        if (!selectedBarber || !selectedTime || !selectedServices.length || !clientName || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const dateStr = format(selectedDate, 'yyyy-MM-dd');
            const startStr = `${dateStr}T${selectedTime}:00`; // Local time string
            const duration = selectedServices.reduce((acc, s) => acc + (s.duration_minutes || 30), 0);
            const startTime = new Date(startStr);
            const endTime = new Date(startTime.getTime() + duration * 60000);

            // Construct description with service names
            const serviceNames = selectedServices.map(s => s.name).join(', ');

            await Api.createAppointment({
                client_name: clientName,
                client_phone: clientPhone,
                barber_id: selectedBarber.id,
                start_time: startTime.toISOString(),
                end_time: endTime.toISOString(),
                status: 'scheduled',
                notes: `Serviços: ${serviceNames}`
            });

            setIsWizardOpen(false);
            fetchAppointments();
            alert('Agendamento realizado com sucesso!');
        } catch (error: any) {
            console.error('Error creating appointment:', error);
            alert('Erro ao agendar: ' + (error.message || 'Tente novamente.'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir/cancelar este agendamento?')) return;
        try {
            await Api.deleteAppointment(id);
            fetchAppointments();
            alert('Agendamento removido com sucesso!');
        } catch (error) {
            alert('Erro ao remover agendamento.');
        }
    };

    // --- Steps Logic ---

    // Filter barbers who perform ALL selected services
    const availableBarbers = barbers.filter(b => {
        if (!b.status) return true; // Fail safe
        if (selectedServices.length === 0) return true;
        // Check if barber has all selected service IDs
        // Note: If barber has no services linked, assume they do NOTHING (strict) or EVERYTHING (lax)? 
        // Strict is safer: needs explicit link.
        return selectedServices.every(s => b.serviceIds.includes(s.id));
    });

    const totalDuration = selectedServices.reduce((acc, s) => acc + (s.duration_minutes || 30), 0);
    const totalPrice = selectedServices.reduce((acc, s) => acc + s.price, 0);

    // --- Render Helpers ---

    const renderCalendar = () => {
        const start = startOfMonth(calendarMonth);
        const end = endOfMonth(calendarMonth);
        const days = eachDayOfInterval({ start, end });

        // Fill empty days at start
        const startDay = start.getDay(); // 0 (Sun) to 6 (Sat)
        const emptyDays = Array(startDay).fill(null);

        return (
            <div className="bg-slate-800 rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                    <Button variant="ghost" size="icon" onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}><ChevronLeft size={16} /></Button>
                    <span className="font-bold capitalize">{format(calendarMonth, 'MMMM yyyy', { locale: ptBR })}</span>
                    <Button variant="ghost" size="icon" onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}><ChevronRight size={16} /></Button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2 text-slate-400">
                    <div>DOM</div><div>SEG</div><div>TER</div><div>QUA</div><div>QUI</div><div>SEX</div><div>SÁB</div>
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {emptyDays.map((_, i) => <div key={`empty-${i}`} />)}
                    {days.map(day => {
                        const isSelected = isSameDay(day, selectedDate);
                        const isPast = day < startOfDay(new Date());
                        return (
                            <button
                                key={day.toISOString()}
                                disabled={isPast}
                                onClick={() => { setSelectedDate(day); setSelectedTime(null); }}
                                className={cn(
                                    "h-8 w-8 rounded-full flex items-center justify-center text-sm transition-colors",
                                    isSelected ? "bg-blue-600 text-white font-bold" : "hover:bg-slate-700 text-slate-200",
                                    isPast && "text-slate-600 cursor-not-allowed hover:bg-transparent",
                                    isToday(day) && !isSelected && "border border-blue-500 text-blue-400"
                                )}
                            >
                                {format(day, 'd')}
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-2">
                        <CalendarIcon size={24} className="text-blue-500" /> Agenda
                    </h1>
                    <p className="text-slate-400 font-medium">Gerencie agendamentos e horários.</p>
                </div>

                <Dialog open={isWizardOpen} onOpenChange={setIsWizardOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-blue-600 hover:bg-blue-700">
                            <Plus size={16} className="mr-2" /> Novo Agendamento
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-4xl h-[600px] flex flex-col p-0 gap-0 overflow-hidden">
                        <DialogHeader className="p-6 border-b border-slate-800 bg-slate-950/50">
                            <div className="flex items-center justify-between">
                                <DialogTitle>{stepTitle}</DialogTitle>
                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <span className={cn("w-6 h-6 rounded-full flex items-center justify-center border", step >= 1 ? "bg-blue-600 border-blue-600 text-white" : "border-slate-700")}>1</span>
                                    <span className="w-8 h-[1px] bg-slate-800" />
                                    <span className={cn("w-6 h-6 rounded-full flex items-center justify-center border", step >= 2 ? "bg-blue-600 border-blue-600 text-white" : "border-slate-700")}>2</span>
                                    <span className="w-8 h-[1px] bg-slate-800" />
                                    <span className={cn("w-6 h-6 rounded-full flex items-center justify-center border", step >= 3 ? "bg-blue-600 border-blue-600 text-white" : "border-slate-700")}>3</span>
                                    <span className="w-8 h-[1px] bg-slate-800" />
                                    <span className={cn("w-6 h-6 rounded-full flex items-center justify-center border", step >= 4 ? "bg-blue-600 border-blue-600 text-white" : "border-slate-700")}>4</span>
                                </div>
                            </div>
                        </DialogHeader>

                        <div className="flex-1 overflow-y-auto p-6 bg-slate-900">
                            {/* STEP 1: SERVICES */}
                            {step === 1 && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {services.map(service => {
                                            const isSelected = selectedServices.some(s => s.id === service.id);
                                            return (
                                                <div
                                                    key={service.id}
                                                    className={cn(
                                                        "p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between",
                                                        isSelected ? "bg-blue-600/10 border-blue-600/50" : "bg-slate-800/50 border-slate-800 hover:border-slate-700"
                                                    )}
                                                    onClick={() => {
                                                        if (isSelected) setSelectedServices(selectedServices.filter(s => s.id !== service.id));
                                                        else setSelectedServices([...selectedServices, service]);
                                                    }}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <Checkbox checked={isSelected} className="border-slate-500 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500" />
                                                        <div>
                                                            <p className="font-bold text-slate-100">{service.name}</p>
                                                            <p className="text-xs text-slate-400">{service.duration_minutes || 30} min</p>
                                                        </div>
                                                    </div>
                                                    <span className="font-mono text-blue-400">R$ {service.price.toFixed(2)}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* STEP 2: PROFESSIONAL */}
                            {step === 2 && (
                                <div className="space-y-4">
                                    {availableBarbers.length === 0 ? (
                                        <div className="text-center py-10 text-slate-500">
                                            <p>Nenhum profissional disponível para realizar todos os serviços selecionados.</p>
                                            <p className="text-xs mt-2 text-slate-600">Verifique os vínculos em "Equipe" ou selecione menos serviços.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {availableBarbers.map(barber => (
                                                <div
                                                    key={barber.id}
                                                    onClick={() => {
                                                        setSelectedBarber(barber);
                                                        setStep(3); // Auto-advance
                                                    }}
                                                    className={cn(
                                                        "flex flex-col items-center p-6 rounded-xl border cursor-pointer transition-all hover:scale-105",
                                                        selectedBarber?.id === barber.id
                                                            ? "bg-blue-600/20 border-blue-500 ring-1 ring-blue-500"
                                                            : "bg-slate-800 border-slate-700 hover:bg-slate-700"
                                                    )}
                                                >
                                                    <div className="w-16 h-16 rounded-full bg-slate-700 mb-3 overflow-hidden border-2 border-slate-600">
                                                        {barber.photo_url ? (
                                                            <img src={barber.photo_url} alt={barber.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <User className="w-8 h-8 m-auto text-slate-400 mt-3" />
                                                        )}
                                                    </div>
                                                    <p className="font-bold text-center">{barber.nickname || barber.name}</p>
                                                    <p className="text-xs text-slate-400 mt-1">Disponível</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* STEP 3: DATE & TIME */}
                            {step === 3 && (
                                <div className="flex flex-col md:flex-row gap-6 h-full">
                                    <div className="w-full md:w-1/2">
                                        <h3 className="text-sm font-bold text-slate-400 mb-3 uppercase">1. Escolha o Dia</h3>
                                        {renderCalendar()}
                                    </div>
                                    <div className="w-full md:w-1/2 flex flex-col">
                                        <h3 className="text-sm font-bold text-slate-400 mb-3 uppercase">2. Escolha o Horário</h3>
                                        <div className="bg-slate-800/50 rounded-lg border border-slate-800 flex-1 p-4 overflow-y-auto">
                                            {loadingSlots ? (
                                                <div className="h-full flex items-center justify-center text-slate-500 animate-pulse">Carregando horários...</div>
                                            ) : availableSlots.length === 0 ? (
                                                <div className="h-full flex items-center justify-center text-slate-500 text-center text-sm p-4">
                                                    Nenhum horário disponível para esta data com duração de {totalDuration} min.
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-3 gap-2">
                                                    {availableSlots.map(slot => (
                                                        <button
                                                            key={slot.time}
                                                            disabled={!slot.available}
                                                            onClick={() => slot.available && setSelectedTime(slot.time)}
                                                            className={cn(
                                                                "py-2 rounded text-sm font-mono border transition-all",
                                                                slot.available
                                                                    ? (selectedTime === slot.time
                                                                        ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-900/50"
                                                                        : "bg-slate-800 border-slate-700 hover:bg-emerald-600/20 text-emerald-400 border-emerald-900/30")
                                                                    : "bg-slate-900/50 border-slate-800 text-slate-600 cursor-not-allowed opacity-50"
                                                            )}
                                                        >
                                                            {slot.time}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="mt-3 p-3 bg-slate-950/50 rounded-lg border border-slate-800 flex flex-wrap gap-4 items-center justify-center text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                                <span>Disponível</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-2 h-2 rounded-full bg-slate-700" />
                                                <span>Ocupado / Intervalo</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 4: CONFIRMATION */}
                            {step === 4 && (
                                <div className="max-w-md mx-auto space-y-6 pt-4">
                                    <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 space-y-4">
                                        <div className="flex items-center gap-4 border-b border-slate-700 pb-4">
                                            <div className="w-12 h-12 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-500">
                                                <CalendarCheck size={24} />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg text-slate-200">Resumo do Agendamento</h3>
                                                <p className="text-sm text-slate-400">{format(selectedDate, "dd 'de' MMMM", { locale: ptBR })} às {selectedTime}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-3 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">Profissional:</span>
                                                <span className="font-bold">{selectedBarber?.nickname || selectedBarber?.name}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">Serviços ({selectedServices.length}):</span>
                                                <span className="font-bold text-right max-w-[200px] truncate">{selectedServices.map(s => s.name).join(', ')}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">Duração Total:</span>
                                                <span className="font-bold">{totalDuration} min</span>
                                            </div>
                                            <div className="flex justify-between pt-2 border-t border-slate-700 mt-2">
                                                <span className="text-slate-400">Valor Total:</span>
                                                <span className="font-bold text-emerald-400 text-lg">R$ {totalPrice.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>Nome do Cliente</Label>
                                            <Input
                                                value={clientName}
                                                onChange={e => setClientName(e.target.value)}
                                                placeholder="Nome completo"
                                                className="bg-slate-800 border-slate-700"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Telefone (Opcional)</Label>
                                            <Input
                                                value={clientPhone}
                                                onChange={e => setClientPhone(e.target.value)}
                                                placeholder="(00) 00000-0000"
                                                className="bg-slate-800 border-slate-700"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <DialogFooter className="p-6 border-t border-slate-800 bg-slate-950/50 flex justify-between items-center w-full">
                            {step > 1 ? (
                                <Button variant="outline" onClick={() => {
                                    setStep(step - 1);
                                    if (step === 2) setStepTitle('Selecionar Serviços');
                                    if (step === 3) setStepTitle('Escolher Profissional');
                                    if (step === 4) setStepTitle('Data e Hora');
                                }} className="border-slate-700 text-slate-400 hover:text-white">
                                    <ChevronLeft size={16} className="mr-1" /> Voltar
                                </Button>
                            ) : <div></div>}

                            <div className="flex items-center gap-4">
                                {step === 1 && <span className="text-sm font-bold text-slate-400">{selectedServices.length} selecionados • {totalDuration} min</span>}

                                {step < 4 ? (
                                    <Button
                                        onClick={() => {
                                            setStep(step + 1);
                                            if (step === 1) setStepTitle('Escolher Profissional');
                                            if (step === 2) setStepTitle('Data e Hora');
                                            if (step === 3) setStepTitle('Confirmar Agendamento');
                                        }}
                                        disabled={
                                            (step === 1 && selectedServices.length === 0) ||
                                            (step === 2 && !selectedBarber) ||
                                            (step === 3 && (!selectedDate || !selectedTime))
                                        }
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-8"
                                    >
                                        Próximo <ChevronRight size={16} className="ml-1" />
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={handleConfirm}
                                        disabled={!clientName || isSubmitting}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 shadow-lg shadow-emerald-900/20 min-w-[200px]"
                                    >
                                        {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 size={16} className="mr-2" />}
                                        {isSubmitting ? 'Agendando...' : 'Confirmar Agendamento'}
                                    </Button>
                                )}
                            </div>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* LISTAGEM DE AGENDAMENTOS EXISTENTE (Resumida para nao ficar gigante, mantendo funcionalidade) */}
            <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center gap-4 bg-slate-900/50 p-4 rounded-lg border border-slate-800 overflow-x-auto">
                    <Button variant="ghost" className="text-slate-400" onClick={() => setViewDate(subDays(viewDate, 1))}><ChevronLeft /></Button>
                    <div className="flex-1 text-center">
                        <h2 className="text-xl font-bold text-slate-100 capitalize">{format(viewDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}</h2>
                    </div>
                    <Button variant="ghost" className="text-slate-400" onClick={() => setViewDate(addDays(viewDate, 1))}><ChevronRight /></Button>
                    <Button variant="outline" size="sm" onClick={() => setViewDate(new Date())} className="ml-4 border-slate-700">Hoje</Button>
                </div>

                {loadingAppts ? (
                    <div className="text-center py-12 text-slate-500">Carregando agenda...</div>
                ) : appointments.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 bg-slate-900/20 rounded-xl border border-dashed border-slate-800">
                        Nenhum agendamento para este dia.
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {appointments.map(appt => (
                            <div key={appt.id} className="flex items-center justify-between p-4 bg-slate-800 rounded-lg border border-slate-700 hover:border-slate-600 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="text-center px-4 py-2 bg-slate-900 rounded border border-slate-800 min-w-[80px]">
                                        <span className="block text-lg font-bold text-slate-200">{format(new Date(appt.start_time), 'HH:mm')}</span>
                                        <span className="text-xs text-slate-500">{format(new Date(appt.end_time), 'HH:mm')}</span>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-100">{appt.client_name}</h3>
                                        <div className="flex items-center gap-3 text-sm text-slate-400 mt-1">
                                            <span className="flex items-center gap-1"><User size={12} /> {appt.barber_nickname || appt.barber_name}</span>
                                            {appt.client_phone && <span className="flex items-center gap-1"><Phone size={12} /> {appt.client_phone}</span>}
                                        </div>
                                        {appt.notes && <p className="text-xs text-blue-400 mt-2 bg-blue-900/20 px-2 py-1 rounded w-fit">{appt.notes}</p>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <Badge className={cn("capitalize h-fit",
                                        appt.status === 'scheduled' ? "bg-blue-500" :
                                            appt.status === 'completed' ? "bg-emerald-500" : "bg-slate-600"
                                    )}>
                                        {appt.status === 'scheduled' ? 'Agendado' : appt.status}
                                    </Badge>
                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(appt.id)} className="text-slate-500 hover:text-red-500 transition-colors">
                                        <Trash2 size={18} />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
