'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, subDays, startOfMonth, endOfMonth, min, max } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, Filter, Download, FileText, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Api } from '@/lib/api';
import { DateRange } from 'react-day-picker';

export function FinancialReports() {
    const [loading, setLoading] = useState(false);
    const [records, setRecords] = useState<any[]>([]);

    // Filters
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    });
    const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');
    const [paramFilter, setParamFilter] = useState<'all' | 'revenue' | 'expense'>('all');
    const [unitFilter, setUnitFilter] = useState('all');

    useEffect(() => {
        loadReportData();
    }, [dateRange, unitFilter]); // Reload when range/unit changes. Local filter for status/type.

    async function loadReportData() {
        if (!dateRange?.from) return;

        setLoading(true);
        try {
            // We fetch a bit wider range or use the filter parameters if API supports it.
            // Currently API supports startDate/endDate.
            const data = await Api.getSystemFinanceRecords({
                startDate: dateRange.from.toISOString(),
                endDate: dateRange.to?.toISOString() || dateRange.from.toISOString(),
                businessUnit: unitFilter
            });
            setRecords(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    // Client-side filtering for Status/Type to avoid excessive API calls if data volume is manageable
    const filteredRecords = records.filter(r => {
        if (statusFilter !== 'all' && r.status !== statusFilter) return false;
        if (paramFilter !== 'all' && r.type !== paramFilter) return false;
        return true;
    });

    const totalRevenue = filteredRecords.filter(r => r.type === 'revenue').reduce((acc, c) => acc + Number(c.value), 0);
    const totalExpense = filteredRecords.filter(r => r.type === 'expense').reduce((acc, c) => acc + Number(c.value), 0);
    const result = totalRevenue - totalExpense;

    const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Filters Bar */}
            <div className="flex flex-col md:flex-row gap-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
                <div className="grid gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                id="date"
                                variant={"outline"}
                                className={cn(
                                    "w-[260px] justify-start text-left font-normal bg-slate-950 border-slate-800 text-white hover:bg-slate-900",
                                    !dateRange && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateRange?.from ? (
                                    dateRange.to ? (
                                        <>
                                            {format(dateRange.from, "dd/MM/y", { locale: ptBR })} -{" "}
                                            {format(dateRange.to, "dd/MM/y", { locale: ptBR })}
                                        </>
                                    ) : (
                                        format(dateRange.from, "dd/MM/y", { locale: ptBR })
                                    )
                                ) : (
                                    <span>Selecione o período</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={dateRange?.from}
                                selected={dateRange}
                                onSelect={setDateRange}
                                numberOfMonths={2}
                            />
                        </PopoverContent>
                    </Popover>
                </div>

                <Select value={unitFilter} onValueChange={setUnitFilter}>
                    <SelectTrigger className="w-[180px] bg-slate-950 border-slate-800 text-white">
                        <SelectValue placeholder="Unidade" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas as Unidades</SelectItem>
                        <SelectItem value="holding">Holding</SelectItem>
                        <SelectItem value="barber">791 Barber</SelectItem>
                        <SelectItem value="beauty">791 Beauty</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={paramFilter} onValueChange={(v: any) => setParamFilter(v)}>
                    <SelectTrigger className="w-[180px] bg-slate-950 border-slate-800 text-white">
                        <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Receitas e Despesas</SelectItem>
                        <SelectItem value="revenue">Apenas Receitas</SelectItem>
                        <SelectItem value="expense">Apenas Despesas</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                    <SelectTrigger className="w-[180px] bg-slate-950 border-slate-800 text-white">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos os Status</SelectItem>
                        <SelectItem value="paid">Realizado / Pago</SelectItem>
                        <SelectItem value="pending">Pendente / Agendado</SelectItem>
                    </SelectContent>
                </Select>

                <Button variant="outline" className="ml-auto border-blue-600/30 text-blue-500 hover:bg-blue-600/10">
                    <Download className="mr-2 h-4 w-4" /> Exportar
                </Button>
            </div>

            {/* Resume Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-slate-950/40 border-slate-800">
                    <CardHeader className="py-4">
                        <CardTitle className="text-xs font-bold uppercase text-slate-500">Total Receitas</CardTitle>
                        <div className="text-2xl font-black text-emerald-500">{formatCurrency(totalRevenue)}</div>
                    </CardHeader>
                </Card>
                <Card className="bg-slate-950/40 border-slate-800">
                    <CardHeader className="py-4">
                        <CardTitle className="text-xs font-bold uppercase text-slate-500">Total Despesas</CardTitle>
                        <div className="text-2xl font-black text-red-500">{formatCurrency(totalExpense)}</div>
                    </CardHeader>
                </Card>
                <Card className="bg-slate-950/40 border-slate-800">
                    <CardHeader className="py-4">
                        <CardTitle className="text-xs font-bold uppercase text-slate-500">Resultado do Período</CardTitle>
                        <div className={cn("text-2xl font-black", result >= 0 ? "text-blue-500" : "text-amber-500")}>{formatCurrency(result)}</div>
                    </CardHeader>
                </Card>
            </div>

            {/* Data Table */}
            <Card className="bg-slate-950 border-slate-800">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-900/50">
                                <tr>
                                    <th className="px-4 py-3 text-[10px] uppercase font-black text-slate-500 tracking-widest">Data</th>
                                    <th className="px-4 py-3 text-[10px] uppercase font-black text-slate-500 tracking-widest">Unidade</th>
                                    <th className="px-4 py-3 text-[10px] uppercase font-black text-slate-500 tracking-widest">Descrição</th>
                                    <th className="px-4 py-3 text-[10px] uppercase font-black text-slate-500 tracking-widest">Categoria</th>
                                    <th className="px-4 py-3 text-[10px] uppercase font-black text-slate-500 tracking-widest">Status</th>
                                    <th className="px-4 py-3 text-[10px] uppercase font-black text-slate-500 tracking-widest text-right">Valor</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {loading ? (
                                    <tr><td colSpan={6} className="p-8 text-center text-slate-500 text-xs uppercase animate-pulse">Carregando dados...</td></tr>
                                ) : filteredRecords.length === 0 ? (
                                    <tr><td colSpan={6} className="p-8 text-center text-slate-500 text-xs uppercase">Nenhum registro encontrado para os filtros selecionados.</td></tr>
                                ) : (
                                    filteredRecords.map(record => (
                                        <tr key={record.id} className="hover:bg-slate-900/50 transition-colors">
                                            <td className="px-4 py-3 text-xs font-bold text-slate-400">
                                                {format(new Date(record.date), 'dd/MM/yyyy')}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge variant="outline" className={cn("text-[9px] uppercase tracking-tighter border-0 bg-opacity-10",
                                                    record.business_unit === 'barber' ? "bg-blue-500 text-blue-400" :
                                                        record.business_unit === 'beauty' ? "bg-pink-500 text-pink-400" : "bg-slate-500 text-slate-400"
                                                )}>
                                                    {record.business_unit}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 text-xs font-medium text-slate-200">{record.description}</td>
                                            <td className="px-4 py-3 text-[10px] uppercase font-bold text-slate-500">{record.category}</td>
                                            <td className="px-4 py-3">
                                                {record.status === 'paid' ? (
                                                    <div className="flex items-center gap-1 text-emerald-500 text-[10px] uppercase font-black">
                                                        <CheckCircle2 size={12} /> Pago
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1 text-amber-500 text-[10px] uppercase font-black">
                                                        <Clock size={12} /> Pendente
                                                    </div>
                                                )}
                                            </td>
                                            <td className={cn("px-4 py-3 text-right text-xs font-black", record.type === 'revenue' ? "text-emerald-500" : "text-red-500")}>
                                                {record.type === 'revenue' ? '+' : '-'} {formatCurrency(record.value)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
