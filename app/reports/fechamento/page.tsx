'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Api } from '@/lib/api';
import { Loader2, Printer } from 'lucide-react';
import { Sale, Barber } from '@/lib/types';
import { supabaseClient } from '@/lib/supabase-client';

function ClosingReportContent() {
    const searchParams = useSearchParams();
    const barberId = searchParams.get('barberId');
    const bonus = Number(searchParams.get('bonus') || 0);

    const [sales, setSales] = useState<Sale[]>([]);
    const [barber, setBarber] = useState<any>(null); // Use any to allow join fields if needed
    const [tenantName, setTenantName] = useState('Barbearia');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!barberId) return;
            setLoading(true);
            try {
                // 1. Fetch Barber info
                const { data: bData } = await supabaseClient
                    .from('barbers')
                    .select('*, users(name)')
                    .eq('id', barberId)
                    .single();

                // Fallback if barber is just stored in users
                const { data: uData } = await supabaseClient
                    .from('users')
                    .select('name')
                    .eq('id', barberId)
                    .single();

                const barberName = bData?.name || bData?.users?.name || uData?.name || 'Barbeiro';
                setBarber({ name: barberName });

                // 2. Fetch Tenant info (Branding)
                const { data: userData } = await supabaseClient.auth.getUser();
                if (userData?.user) {
                    const { data: tData } = await supabaseClient
                        .from('tenants')
                        .select('name')
                        .eq('id', userData.user.user_metadata.tenant_id)
                        .single();
                    if (tData) setTenantName(tData.name);
                }

                // 3. Fetch Pending Sales (Same logic as Closing Dialog)
                const { data: sData } = await supabaseClient
                    .from('sales')
                    .select(`
                        *,
                        client_queue (client_name)
                    `)
                    .eq('barber_id', barberId)
                    .eq('barber_commission_paid', false)
                    .eq('status', 'completed'); // Only completed sales

                if (sData) setSales(sData as any[]);

            } catch (error) {
                console.error("Error fetching report data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        // Add minimal delay to allow data to settle if called immediately after a sale
        setTimeout(fetchData, 500);
    }, [barberId]);

    if (!barberId) return <div>Barbeiro não identificado.</div>;

    const totalGross = sales.reduce((acc, sale) => acc + (sale.total_amount || 0), 0);
    const totalCommission = sales.reduce((acc, sale) => acc + (sale.commission_value || 0), 0);
    const totalPayable = totalCommission + bonus;

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="p-8 max-w-[80mm] mx-auto bg-white min-h-screen font-mono text-xs text-black leading-tight print:p-0 print:max-w-none print:w-[80mm]">
            {/* Header */}
            <div className="text-center border-b border-black pb-4 mb-4">
                <h1 className="text-sm font-bold uppercase">{tenantName}</h1>
                <p className="mt-1">Fechamento de Caixa</p>
                <div className="mt-2 text-left">
                    <p>Barbeiro: <span className="font-bold">{barber?.name}</span></p>
                    <p>Data: {new Date().toLocaleDateString('pt-BR')} {new Date().toLocaleTimeString('pt-BR')}</p>
                </div>
            </div>

            {/* List */}
            <div className="mb-4">
                <div className="flex justify-between border-b border-black mb-1 font-bold">
                    <span>Item/Cliente</span>
                    <span>Valor</span>
                </div>
                {sales.map((sale) => (
                    <div key={sale.id} className="flex justify-between py-1 border-b border-dashed border-gray-400">
                        <div className="flex flex-col">
                            <span>{new Date(sale.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} - {sale.client_queue?.client_name || 'Balcão'}</span>
                            <span className="text-[10px] text-gray-600">Comissão: R$ {(sale.commission_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <span>R$ {(sale.total_amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                ))}
                {sales.length === 0 && <p className="text-center italic mt-2">Nenhum lançamento.</p>}
            </div>

            {/* Totals */}
            <div className="border-t border-black pt-2 space-y-1">
                <div className="flex justify-between">
                    <span>Qtd Serviços:</span>
                    <span>{sales.length}</span>
                </div>
                <div className="flex justify-between">
                    <span>Faturamento Bruto:</span>
                    <span>R$ {totalGross.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                    <span>Comissão Total:</span>
                    <span>R$ {totalCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                {bonus !== 0 && (
                    <div className="flex justify-between">
                        <span>Bônus/Ajuste:</span>
                        <span>R$ {bonus.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                )}
                <div className="flex justify-between text-sm font-bold border-t border-black mt-2 pt-2">
                    <span>TOTAL A PAGAR:</span>
                    <span>R$ {totalPayable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
            </div>

            {/* Signature */}
            <div className="mt-12 text-center">
                <div className="border-t border-black w-3/4 mx-auto mb-2"></div>
                <p className="uppercase font-bold">{barber?.name}</p>
                <p className="text-[10px] italic">Assinatura</p>
            </div>

            <div className="mt-8 text-center print:hidden">
                <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-md hover:bg-slate-800 mx-auto"
                >
                    <Printer size={16} /> Imprimir Cupom
                </button>
            </div>
        </div>
    );
}

export default function ClosingReportPage() {
    return (
        <Suspense fallback={<div>Carregando...</div>}>
            <ClosingReportContent />
        </Suspense>
    );
}
