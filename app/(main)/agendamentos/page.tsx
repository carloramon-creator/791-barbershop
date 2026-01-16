'use client';

import { useState, useEffect, useMemo } from 'react';
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
    Loader2,
    MessageSquare,
    Play,
    Image as ImageIcon,
    Eye,
    EyeOff,
    List,
    CalendarDays,
    Filter,
    FileText
} from 'lucide-react';
import { MaskedInput } from '@/components/ui/masked-input';
import { CloseSaleDialog } from '@/components/sales/close-sale-dialog';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, startOfDay, addDays, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn, formatCurrency } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTrigger,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Service, Barber } from '@/lib/types';
import { useAuth } from '@/lib/auth-provider';

export default function AppointmentsPage() {
    // Main View State
    const [viewDate, setViewDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'calendar' | 'list' | 'pending'>('calendar');
    const [listDateRange, setListDateRange] = useState<{ from: Date, to: Date }>({
        from: subDays(new Date(), 30),
        to: new Date()
    });

    // Derived state for list view fetching
    // If viewMode is list, we fetch based on listDateRange
    // If viewMode is calendar, we fetch based on viewDate (single day)

    const [appointments, setAppointments] = useState<any[]>([]);
    const [loadingAppts, setLoadingAppts] = useState(true);
    const [barbershopName, setBarbershopName] = useState('');
    const [showFinished, setShowFinished] = useState(false);

    // Wizard State
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [wizardMode, setWizardMode] = useState<'booking' | 'walkin'>('booking');
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

    // Checkout State
    const [showSaleDialog, setShowSaleDialog] = useState(false);
    const [activeQueueId, setActiveQueueId] = useState<string | null>(null);
    const [initialServiceIds, setInitialServiceIds] = useState<string[]>([]);

    // Calendar Helper State
    const [calendarMonth, setCalendarMonth] = useState(new Date());

    useEffect(() => {
        fetchAppointments();
        loadBarbershopInfo();
    }, [viewDate, viewMode, listDateRange]);

    const loadBarbershopInfo = async () => {
        try {
            const data = await Api.getBarbershop();
            setBarbershopName(data.name || '');
        } catch (error) {
            console.error('Erro ao buscar info da barbearia', error);
        }
    };

    // Reset wizard when closed
    useEffect(() => {
        if (!isWizardOpen) {
            setStep(1);
            setWizardMode('booking');
            setSelectedServices([]);
            setSelectedBarber(null);
            setSelectedDate(new Date());
            setSelectedTime(null);
            setClientName('');
            setClientPhone('');
            setAvailableSlots([]);
        }
    }, [isWizardOpen]);

    const openWizard = (mode: 'booking' | 'walkin') => {
        setWizardMode(mode);
        setIsWizardOpen(true);
        loadWizardData();
    };

    // Fetch slots when date or barber changes (Step 3)
    useEffect(() => {
        if (step === 3 && selectedBarber && selectedDate) {
            fetchAvailability();
        }
    }, [step, selectedDate, selectedBarber]);

    const fetchAppointments = async () => {
        setLoadingAppts(true);
        try {
            if (viewMode === 'calendar') {
                const dateStr = format(viewDate, 'yyyy-MM-dd');
                const data = await Api.getAppointments(dateStr);
                setAppointments(data || []);
            } else if (viewMode === 'list') {
                const startStr = format(listDateRange.from, 'yyyy-MM-dd');
                const endStr = format(listDateRange.to, 'yyyy-MM-dd');
                const data = await Api.getAppointmentsHistory(startStr, endStr);
                setAppointments(data || []);
            } else if (viewMode === 'pending') {
                // Busca TODOS os agendamentos sem filtro de data
                const data = await Api.getAllAppointments();

                // Filtra no client-side apenas os não finalizados (scheduled ou in_service)
                const pending = (data || []).filter((a: any) =>
                    a.status !== 'completed' &&
                    a.status !== 'cancelled'
                );

                // Ordena por data CRESCENTE (mais antigo primeiro = maior urgência/atraso)
                pending.sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
                setAppointments(pending);
            }
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
        // Validation: No barber, no services, or missing booking time/client info
        if (!selectedBarber || !selectedServices.length || isSubmitting) return;

        if (wizardMode === 'booking') {
            if (!selectedTime || !clientName.trim() || !clientPhone.trim()) {
                return;
            }
        } else if (wizardMode === 'walkin') {
            // Para walk-in o nome é opcional (default 'Cliente Balcão') mas o telefone pode ser util se fornecido
            if (!clientName.trim() && !clientPhone.trim()) {
                // Se ambos vazios, permitimos (usa default), mas se começou a preencher um, permitimos também
            }
        }

        setIsSubmitting(true);
        try {
            let startISO: string;
            let endISO: string;
            const duration = selectedServices.reduce((acc, s) => acc + (s.duration_minutes || 30), 0);

            if (wizardMode === 'walkin') {
                const now = new Date();
                startISO = now.toISOString();
                endISO = new Date(now.getTime() + duration * 60000).toISOString();
            } else {
                const dateStr = format(selectedDate, 'yyyy-MM-dd');
                const startStr = `${dateStr}T${selectedTime}:00`;
                const startTime = new Date(startStr);
                startISO = startTime.toISOString();
                endISO = new Date(startTime.getTime() + duration * 60000).toISOString();
            }

            const serviceNames = selectedServices.map(s => s.name).join(', ');

            const res = await Api.createAppointment({
                client_name: clientName || (wizardMode === 'walkin' ? 'Cliente Balcão' : ''),
                client_phone: clientPhone,
                barber_id: selectedBarber.id,
                start_time: startISO,
                end_time: endISO,
                status: 'scheduled', // Iniciar sempre como scheduled para o Api.startAppointment funcionar de forma padrão
                service_id: selectedServices[0]?.id,
                service_ids: selectedServices.map(s => s.id),
                notes: `Serviços: ${serviceNames}`
            });

            // Se for walk-in, precisamos também criar a entrada na fila (para que o queue_id exista)
            if (wizardMode === 'walkin') {
                await Api.startAppointment(res.id);
            }

            setIsWizardOpen(false);
            fetchAppointments();
            alert(wizardMode === 'walkin' ? 'Atendimento iniciado!' : 'Agendamento realizado com sucesso!');
        } catch (error: any) {
            console.error('Error creating appointment:', error);
            alert('Erro: ' + (error.message || 'Tente novamente.'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Excluir este agendamento?')) return;
        try {
            await Api.deleteAppointment(id);
            fetchAppointments();
        } catch (error) {
            alert('Erro ao excluir');
        }
    };

    const handleNotify = (appt: any) => {
        const phone = appt.client_phone?.replace(/\D/g, '');
        if (!phone) return alert('Telefone não disponível');
        const company = barbershopName ? `A ${barbershopName}` : 'Nossa barbearia';
        const message = encodeURIComponent(`Olá ${appt.client_name}, ${company} passando para lembrar do seu agendamento hoje às ${format(new Date(appt.start_time), 'HH:mm')}. Até logo!`);
        window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
    };

    const handleStartProcedure = async (appt: any) => {
        try {
            await Api.startAppointment(appt.id);
            fetchAppointments();
        } catch (error: any) {
            alert(error.message);
        }
    };

    const [activeAppointmentId, setActiveAppointmentId] = useState<string | null>(null);
    const [saleDialogMode, setSaleDialogMode] = useState<'finish' | 'draft'>('finish');
    const [currentDraftItems, setCurrentDraftItems] = useState<any[] | undefined>(undefined);

    const handleOpenComanda = (appt: any) => {
        setActiveAppointmentId(appt.id);
        setActiveQueueId(null);
        setSaleDialogMode('draft');

        // Se já tiver draft_items no appt, usa. Se não, usa os services do appt como "partial draft" para pre-fill?
        // O CloseSaleDialog já tem logica pra pre-fill com initialServiceIds se initialDraftItems for null. 
        // Mas se quisermos draft real:
        setCurrentDraftItems(appt.draft_items || undefined); // Use undefined if null
        setInitialServiceIds(appt.service_ids || []);

        setShowSaleDialog(true);
    };

    const handleFinishProcedure = (appt: any) => {
        if (!appt.queue_id) {
            // Se não tem queue_id, mas é pra abrir comanda, abrimos com appointmentId
            // Mas handleFinishProcedure costuma ser pra finalizar (com queue).
            // Vamos criar handleOpenComanda separado.
            alert('ID da fila não encontrado para este agendamento.');
            return;
        }
        setActiveQueueId(appt.queue_id);
        setActiveAppointmentId(null);
        setCurrentDraftItems(appt.draft_items || null);
        setInitialServiceIds(appt.service_ids || []);
        setSaleDialogMode('finish'); // Default
        setShowSaleDialog(true);
    };


    const { role, user: currentUser } = useAuth();
    const isOwner = role === 'owner';

    // --- Steps Logic ---

    // Filter barbers who perform ALL selected services
    const availableBarbers = barbers.filter(b => {
        if (b.is_active === false) return false; // Filter out inactive professionals
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

    // --- Derived State for Start Button Logic ---
    const activeMap = useMemo(() => {
        const active: Record<string, boolean> = {}; // barber_id -> has active appointment

        // Identify active appointments (barber is busy)
        appointments.forEach(a => {
            if (a.status === 'in_service') {
                active[a.barber_id] = true;
            }
        });

        return active;
    }, [appointments]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-2">
                        <CalendarIcon size={24} className="text-blue-500" /> Agenda
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <div className="bg-slate-900 p-1 rounded-lg border border-slate-800 flex gap-1">
                            <button
                                onClick={() => setViewMode('calendar')}
                                className={cn("px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-2", viewMode === 'calendar' ? "bg-slate-800 text-white shadow-sm" : "text-slate-500 hover:text-slate-300")}
                            >
                                <CalendarDays size={14} /> Calendário
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={cn("px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-2", viewMode === 'list' ? "bg-slate-800 text-white shadow-sm" : "text-slate-500 hover:text-slate-300")}
                            >
                                <List size={14} /> Histórico
                            </button>
                            <button
                                onClick={() => setViewMode('pending')}
                                className={cn("px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-2", viewMode === 'pending' ? "bg-amber-900/20 text-amber-500 shadow-sm border border-amber-500/20" : "text-slate-500 hover:text-amber-500/80")}
                            >
                                <Clock size={14} /> Pendentes
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    <Button variant="outline" className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10" onClick={() => openWizard('walkin')}>
                        <Scissors size={16} className="mr-2" /> Novo Atendimento
                    </Button>
                    <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => openWizard('booking')}>
                        <Plus size={16} className="mr-2" /> Novo Agendamento
                    </Button>
                </div>

                <Dialog open={isWizardOpen} onOpenChange={setIsWizardOpen}>
                    <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-4xl h-[600px] flex flex-col p-0 gap-0 overflow-hidden">
                        <DialogHeader className="p-6 border-b border-slate-800 bg-slate-950/50">
                            <div className="flex items-center justify-between">
                                <DialogTitle>{wizardMode === 'walkin' ? 'Novo Atendimento' : stepTitle}</DialogTitle>
                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <span className={cn("w-6 h-6 rounded-full flex items-center justify-center border", step >= 1 ? "bg-blue-600 border-blue-600 text-white" : "border-slate-700")}>1</span>
                                    <span className="w-8 h-[1px] bg-slate-800" />
                                    <span className={cn("w-6 h-6 rounded-full flex items-center justify-center border", step >= 2 ? "bg-blue-600 border-blue-600 text-white" : "border-slate-700")}>2</span>
                                    <span className="w-8 h-[1px] bg-slate-800" />
                                    <span className={cn("w-6 h-6 rounded-full flex items-center justify-center border", step >= 3 ? (wizardMode === 'walkin' ? "bg-blue-600 border-blue-600 text-white" : "bg-blue-600 border-blue-600 text-white") : "border-slate-700")}>3</span>
                                    {wizardMode === 'booking' && (
                                        <>
                                            <span className="w-8 h-[1px] bg-slate-800" />
                                            <span className={cn("w-6 h-6 rounded-full flex items-center justify-center border", step >= 4 ? "bg-blue-600 border-blue-600 text-white" : "border-slate-700")}>4</span>
                                        </>
                                    )}
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
                                                    <span className="font-mono text-blue-400">{formatCurrency(service.price)}</span>
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
                                                        if (wizardMode === 'walkin') {
                                                            setStep(3); // For walk-in, skip date/time and go to client info
                                                            setStepTitle('Informações do Cliente');
                                                        } else {
                                                            setStep(3); // For booking, go to date/time
                                                        }
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

                            {/* STEP 3: DATE & TIME or CLIENT INFO (for walk-in) */}
                            {step === 3 && wizardMode === 'booking' && (
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

                            {/* STEP 4: CLIENT (for booking) OR STEP 3: CLIENT (for walk-in) */}
                            {((step === 4 && wizardMode === 'booking') || (step === 3 && wizardMode === 'walkin')) && (
                                <div className="max-w-md mx-auto w-full space-y-6 pt-10">
                                    <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 space-y-4">
                                        <div className="flex items-center gap-4 border-b border-slate-700 pb-4">
                                            <div className="w-12 h-12 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-500">
                                                <CalendarCheck size={24} />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg text-slate-200">{wizardMode === 'walkin' ? 'Confirmar Atendimento' : 'Resumo do Agendamento'}</h3>
                                                {wizardMode === 'booking' && (
                                                    <p className="text-sm text-slate-400">{format(selectedDate, "dd 'de' MMMM", { locale: ptBR })} às {selectedTime}</p>
                                                )}
                                                {wizardMode === 'walkin' && (
                                                    <p className="text-sm text-slate-400">Início Imediato</p>
                                                )}
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
                                                <span className="font-bold text-emerald-400 text-lg">{formatCurrency(totalPrice)}</span>
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
                                            <Label>Telefone (Obrigatório para lembretes)</Label>
                                            <MaskedInput
                                                mask="(99) 99999-9999"
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
                                    if (step === 3) setStepTitle(wizardMode === 'walkin' ? 'Selecionar Serviços' : 'Escolher Profissional');
                                    if (step === 4) setStepTitle('Data e Hora');
                                }} className="border-slate-700 text-slate-400 hover:text-white">
                                    <ChevronLeft size={16} className="mr-1" /> Voltar
                                </Button>
                            ) : <div></div>}

                            <div className="flex items-center gap-4">
                                {step === 1 && <span className="text-sm font-bold text-slate-400">{selectedServices.length} selecionados • {totalDuration} min</span>}

                                {((wizardMode === 'booking' && step < 4) || (wizardMode === 'walkin' && step < 3)) ? (
                                    <Button
                                        onClick={() => {
                                            if (wizardMode === 'walkin' && step === 2) {
                                                setStep(3);
                                                setStepTitle('Informações do Cliente');
                                            } else {
                                                setStep(step + 1);
                                                if (step === 1) setStepTitle('Escolher Profissional');
                                                if (step === 2) setStepTitle('Data e Hora');
                                                if (step === 3) setStepTitle('Confirmar Agendamento');
                                            }
                                        }}
                                        disabled={
                                            (step === 1 && selectedServices.length === 0) ||
                                            (step === 2 && !selectedBarber) ||
                                            (step === 3 && wizardMode === 'booking' && (!selectedDate || !selectedTime)) ||
                                            (step === 4 && wizardMode === 'booking' && (!clientName.trim() || !clientPhone.trim())) ||
                                            (step === 3 && wizardMode === 'walkin' && !clientName.trim())
                                        }
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-8"
                                    >
                                        Próximo <ChevronRight size={16} className="ml-1" />
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={handleConfirm}
                                        disabled={
                                            isSubmitting ||
                                            (wizardMode === 'booking' && (!clientName.trim() || !clientPhone.trim())) ||
                                            (wizardMode === 'walkin' && !clientName.trim())
                                        }
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 shadow-lg shadow-emerald-900/20 min-w-[200px]"
                                    >
                                        {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 size={16} className="mr-2" />}
                                        {isSubmitting ? 'Agendando...' : (wizardMode === 'walkin' ? 'Iniciar Atendimento' : 'Confirmar Agendamento')}
                                    </Button>
                                )}
                            </div>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {viewMode === 'calendar' ? (
                /* MODO CALENDÁRIO (DIA ÚNICO) */

                <div className="flex items-center gap-4 bg-slate-900/50 p-4 rounded-lg border border-slate-800 overflow-x-auto">
                    <Button variant="ghost" className="text-slate-400" onClick={() => setViewDate(subDays(viewDate, 1))}><ChevronLeft /></Button>
                    <div className="flex-1 text-center">
                        <h2 className="text-xl font-bold text-slate-100 capitalize">{format(viewDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}</h2>
                    </div>
                    <Button
                        variant="ghost"
                        className="text-slate-400"
                        onClick={() => setViewDate(addDays(viewDate, 1))}
                    >
                        <ChevronRight />
                    </Button>
                    <div className="flex gap-2 ml-4">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowFinished(!showFinished)}
                            className={cn("border-slate-700 gap-2", showFinished ? "bg-slate-800 text-blue-400" : "text-slate-400")}
                        >
                            {showFinished ? <EyeOff size={14} /> : <Eye size={14} />}
                            {showFinished ? "Ocultar Finalizados" : "Ver Finalizados"}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setViewDate(new Date())} className="border-slate-700">Hoje</Button>
                    </div>
                </div>
            ) : (
                /* MODO LISTA (HISTÓRICO) */
                <div className="space-y-4">
                    <div className="flex items-center justify-between bg-slate-900/50 p-4 rounded-lg border border-slate-800">
                        <div className="flex items-center gap-4">
                            <div className="grid gap-1.5">
                                <Label className="text-xs text-slate-500 uppercase font-bold">Início</Label>
                                <Input
                                    type="date"
                                    value={format(listDateRange.from, 'yyyy-MM-dd')}
                                    onChange={(e) => setListDateRange({ ...listDateRange, from: new Date(e.target.value) })}
                                    className="bg-slate-950 border-slate-800 w-40 text-sm"
                                />
                            </div>
                            <div className="grid gap-1.5">
                                <Label className="text-xs text-slate-500 uppercase font-bold">Fim</Label>
                                <Input
                                    type="date"
                                    value={format(listDateRange.to, 'yyyy-MM-dd')}
                                    onChange={(e) => setListDateRange({ ...listDateRange, to: new Date(e.target.value) })}
                                    className="bg-slate-950 border-slate-800 w-40 text-sm"
                                />
                            </div>
                            <Button variant="secondary" onClick={fetchAppointments} className="mt-5 bg-slate-800 hover:bg-slate-700 text-slate-200">
                                <Filter size={14} className="mr-2" /> Filtrar
                            </Button>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-slate-500 uppercase font-bold">Total no Período</p>
                            <p className="text-2xl font-black text-slate-100">{appointments.length}</p>
                        </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                        <Table>
                            <TableHeader className="bg-slate-950">
                                <TableRow className="border-slate-800 hover:bg-transparent">
                                    <TableHead className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Data</TableHead>
                                    <TableHead className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Cliente</TableHead>
                                    <TableHead className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Profissional</TableHead>
                                    <TableHead className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Serviços</TableHead>
                                    <TableHead className="text-slate-400 font-bold uppercase text-[10px] tracking-wider text-center">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loadingAppts ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                                            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                            Carregando histórico...
                                        </TableCell>
                                    </TableRow>
                                ) : appointments.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                                            Nenhum agendamento encontrado neste período.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    appointments.map((appt) => (
                                        <TableRow key={appt.id} className="border-slate-800 hover:bg-slate-800/50">
                                            <TableCell className="font-mono text-xs text-slate-300">
                                                <div className="font-bold text-slate-200">{format(new Date(appt.start_time), 'dd/MM/yyyy')}</div>
                                                <div className="text-slate-500">{format(new Date(appt.start_time), 'HH:mm')}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-bold text-slate-200">{appt.client_name}</div>
                                                <div className="text-xs text-slate-500">{appt.client_phone}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 overflow-hidden">
                                                        {appt.barber_photo ? <img src={appt.barber_photo} className="w-full h-full object-cover" /> : <User size={14} className="m-auto mt-1 text-slate-500" />}
                                                    </div>
                                                    <span className="text-sm text-slate-300">{appt.barber_nickname || appt.barber_name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="max-w-[200px] truncate text-xs text-slate-400" title={appt.services_names || appt.notes}>
                                                    {appt.services_names || appt.notes || '-'}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge className={cn("px-2 py-0.5 text-[10px] uppercase font-bold border-0",
                                                    appt.status === 'completed' ? "bg-emerald-500/10 text-emerald-500" :
                                                        appt.status === 'cancelled' ? "bg-red-500/10 text-red-500" :
                                                            "bg-blue-500/10 text-blue-500"
                                                )}>
                                                    {appt.status === 'completed' ? 'Finalizado' : appt.status === 'cancelled' ? 'Cancelado' : 'Agendado'}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}

            {/* CONTAINER COMUM (LOADING E DECISÃO DE RENDERIZAÇÃO SOMENTE PARA CALENDÁRIO) */}
            {viewMode === 'calendar' && (
                <>

                    {loadingAppts ? (
                        <div className="flex flex-col items-center justify-center py-24 text-slate-500 gap-4">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                            <p>Carregando sua agenda...</p>
                        </div>
                    ) : appointments.length === 0 ? (
                        <div className="text-center py-24 text-slate-500 bg-slate-900/20 rounded-2xl border border-dashed border-slate-800">
                            <div className="bg-slate-800/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CalendarCheck className="text-slate-600" size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-300">Nenhum agendamento</h3>
                            <p className="text-sm text-slate-500">Não há serviços marcados para este dia.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {/* ATENDIMENTOS ATIVOS / AGENDADOS */}
                            {appointments.filter(a => a.status !== 'completed').map(appt => {
                                const isThisBarberBusy = activeMap[appt.barber_id];

                                // Simplified Logic:
                                // 1. User has permission (Owner or Self)
                                // 2. Is Today (Safety check)
                                // 3. If scheduled: Show button ONLY if barber is FREE (not busy)
                                // 4. If in_service: Always show Finish button

                                const canViewActions = (isOwner || (currentUser?.id === appt.barber_user_id)) && isToday(new Date(appt.start_time));

                                const showStartBtn = canViewActions && (
                                    (appt.status === 'scheduled' && !isThisBarberBusy) ||
                                    (appt.status === 'in_service')
                                );

                                return (
                                    <div key={appt.id} className="group relative flex flex-col md:flex-row items-center gap-6 p-5 bg-slate-900/80 rounded-2xl border border-slate-800 hover:border-blue-500/50 hover:bg-slate-800/80 transition-all shadow-lg">
                                        {/* COLUNA 1: HORÁRIO */}
                                        <div className="flex flex-col items-center justify-center px-6 py-4 bg-slate-950 rounded-xl border border-slate-800 min-w-[120px] shadow-inner">
                                            <span className="text-2xl font-black text-blue-400 leading-none">{format(new Date(appt.start_time), 'HH:mm')}</span>
                                            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-1">Até {format(new Date(appt.end_time), 'HH:mm')}</span>
                                        </div>

                                        {/* COLUNA 2: CLIENTE (Destaque conforme solicitado) */}
                                        <div className="flex-1 flex items-center gap-4 min-w-[200px]">
                                            <div className="w-14 h-14 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                                                {appt.client_photo ? (
                                                    <img src={appt.client_photo} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <ImageIcon className="text-slate-600" size={24} />
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="font-black text-xl text-slate-100 tracking-tight leading-none">{appt.client_name}</h3>
                                                <div className="flex items-center gap-2 text-sm text-slate-400 mt-1.5">
                                                    <Phone size={12} className="text-blue-500" />
                                                    <span className="font-medium">{appt.client_phone}</span>
                                                </div>
                                                <div className="flex flex-wrap gap-1.5 mt-2">
                                                    {(appt.services_names || appt.notes || '').split(',').map((s: string, i: number) => (
                                                        <span key={i} className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-blue-500/20">
                                                            {s.trim()}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* COLUNA 3: PROFISSIONAL (Destaque conforme solicitado) */}
                                        <div className="flex flex-col items-center md:items-end justify-center min-w-[150px] border-l border-slate-800/50 md:pl-6">
                                            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Profissional</span>
                                            <div className="flex items-center gap-2 text-blue-400 font-black text-lg bg-blue-500/5 px-4 py-1.5 rounded-lg border border-blue-500/20">
                                                <User size={16} />
                                                {appt.barber_nickname || appt.barber_name}
                                            </div>
                                        </div>

                                        {/* COLUNA 4: AÇÕES */}
                                        <div className="flex items-center gap-2 border-l border-slate-800/50 md:pl-6">
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => handleOpenComanda(appt)}
                                                className="bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border-blue-500/20 gap-2 h-10 px-4"
                                            >
                                                <FileText size={16} />
                                                <span className="hidden xl:inline">Comanda</span>
                                            </Button>

                                            {appt.status === 'scheduled' && (
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => handleNotify(appt)}
                                                    className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20 gap-2 h-10 px-4"
                                                >
                                                    <MessageSquare size={16} />
                                                    <span className="hidden xl:inline">Notificar</span>
                                                </Button>
                                            )}

                                            {showStartBtn && appt.status === 'scheduled' && (
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => handleStartProcedure(appt)}
                                                    className="bg-blue-600 text-white hover:bg-blue-700 gap-2 h-10 px-4 shadow-lg shadow-blue-900/20"
                                                >
                                                    <Play size={16} fill="currentColor" />
                                                    <span className="hidden xl:inline">Iniciar</span>
                                                </Button>
                                            )}

                                            {showStartBtn && appt.status === 'in_service' && (
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => handleFinishProcedure(appt)}
                                                    className="bg-emerald-600 text-white hover:bg-emerald-700 gap-2 h-10 px-4 shadow-lg shadow-emerald-900/20"
                                                >
                                                    <CheckCircle2 size={16} />
                                                    <span className="hidden xl:inline">Finalizar</span>
                                                </Button>
                                            )}

                                            <Badge className={cn("capitalize px-3 py-1 text-[10px] font-black tracking-widest h-fit border-0",
                                                appt.status === 'scheduled' ? "bg-blue-500/20 text-blue-400" :
                                                    appt.status === 'in_service' ? "bg-amber-500/20 text-amber-500 border border-amber-500/30" :
                                                        appt.status === 'completed' ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-600/20 text-slate-500"
                                            )}>
                                                {appt.status === 'scheduled' ? 'Confirmado' :
                                                    appt.status === 'in_service' ? 'Em Atendimento' :
                                                        appt.status === 'completed' ? 'Finalizado' : appt.status}
                                            </Badge>

                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(appt.id)}
                                                className="text-slate-600 hover:text-red-500 hover:bg-red-500/10 transition-colors rounded-full"
                                            >
                                                <Trash2 size={18} />
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })
                            }

                            {/* ATENDIMENTOS FINALIZADOS (EXPANSÍVEL) */}
                            {showFinished && (
                                <div className="mt-8 space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                                    <div className="flex items-center gap-3 px-2">
                                        <div className="h-[1px] flex-1 bg-slate-800" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Atendimentos Finalizados</span>
                                        <div className="h-[1px] flex-1 bg-slate-800" />
                                    </div>

                                    {appointments.filter(a => a.status === 'completed').length === 0 ? (
                                        <p className="text-center py-8 text-slate-600 text-xs">Nenhum atendimento finalizado para exibir.</p>
                                    ) : (
                                        appointments.filter(a => a.status === 'completed').map(appt => (
                                            <div key={appt.id} className="flex items-center gap-4 p-4 bg-slate-900/40 rounded-xl border border-slate-800/50 opacity-60 hover:opacity-100 transition-opacity">
                                                <div className="px-3 py-1 bg-slate-950 rounded border border-slate-800 text-xs font-mono text-slate-500">
                                                    {format(new Date(appt.start_time), 'HH:mm')}
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-bold text-slate-300 text-sm">{appt.client_name}</h4>
                                                    <p className="text-[10px] text-slate-500 uppercase font-bold">{appt.barber_nickname || appt.barber_name}</p>
                                                </div>
                                                <Badge className="bg-emerald-500/10 text-emerald-500 border-0 text-[9px] uppercase font-black">Finalizado</Badge>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Close Sale Dialog */}
            {showSaleDialog && (activeQueueId || activeAppointmentId) && (
                <CloseSaleDialog
                    isOpen={showSaleDialog}
                    onOpenChange={setShowSaleDialog}
                    queueId={activeQueueId || undefined}
                    appointmentId={activeAppointmentId || undefined}
                    initialServiceIds={initialServiceIds}
                    initialDraftItems={currentDraftItems}
                    mode={saleDialogMode}
                    onSuccess={() => fetchAppointments()}
                />
            )}
        </div>
    );
}
