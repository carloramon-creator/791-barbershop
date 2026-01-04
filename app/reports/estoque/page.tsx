'use client';

import { useEffect, useState } from 'react';
import { Api } from '@/lib/api';
import { Product } from '@/lib/types';
import { Loader2, Printer } from 'lucide-react';

export default function InventoryReportPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Api.getProducts()
            .then(data => setProducts(data || []))
            .finally(() => setLoading(false));
    }, []);

    const totalCost = products.reduce((acc, p) => acc + (Number(p.cost_price) * (p.stock_quantity || 0)), 0);
    const totalSale = products.reduce((acc, p) => acc + (Number(p.price) * (p.stock_quantity || 0)), 0);

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="flex justify-between items-start mb-8 print:hidden">
                <h1 className="text-2xl font-bold">Relatório de Estoque</h1>
                <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-md hover:bg-slate-800"
                >
                    <Printer size={16} /> Imprimir / Salvar PDF
                </button>
            </div>

            <div className="text-center mb-8 border-b pb-4">
                <h2 className="text-xl font-bold uppercase tracking-widest">Relatório de Posição de Estoque</h2>
                <p className="text-sm text-gray-500">Gerado em {new Date().toLocaleString()}</p>
            </div>

            {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>
            ) : (
                <div className="space-y-8">
                    <table className="w-full text-sm text-left">
                        <thead>
                            <tr className="border-b-2 border-black">
                                <th className="py-2">Produto</th>
                                <th className="py-2 text-center">Qtd Atual</th>
                                <th className="py-2 text-right">Custo Unit.</th>
                                <th className="py-2 text-right">Venda Unit.</th>
                                <th className="py-2 text-right">Total Custo</th>
                                <th className="py-2 text-right">Total Venda</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {products.map(p => (
                                <tr key={p.id}>
                                    <td className="py-2 font-medium">{p.name}</td>
                                    <td className="py-2 text-center font-bold">{p.stock_quantity || 0}</td>
                                    <td className="py-2 text-right">R$ {Number(p.cost_price || 0).toFixed(2)}</td>
                                    <td className="py-2 text-right">R$ {Number(p.price || 0).toFixed(2)}</td>
                                    <td className="py-2 text-right text-gray-600">R$ {(Number(p.cost_price || 0) * (p.stock_quantity || 0)).toFixed(2)}</td>
                                    <td className="py-2 text-right font-bold">R$ {(Number(p.price || 0) * (p.stock_quantity || 0)).toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="border-t-2 border-black font-bold text-base">
                                <td className="py-4">TOTAIS</td>
                                <td className="py-4 text-center">{products.reduce((acc, p) => acc + (p.stock_quantity || 0), 0)}</td>
                                <td></td>
                                <td></td>
                                <td className="py-4 text-right">R$ {totalCost.toFixed(2)}</td>
                                <td className="py-4 text-right">R$ {totalSale.toFixed(2)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}
        </div>
    );
}
