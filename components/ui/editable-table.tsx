'use client';

import { useState } from 'react';
import { Pencil, Trash2, Plus, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Column {
    key: string;
    label: string;
    type: 'text' | 'currency' | 'number';
    suffix?: string;
    required?: boolean;
}

interface EditableTableProps {
    columns: Column[];
    data: any[];
    onChange: (data: any[]) => void;
    onAdd: () => void;
    onRemove: (index: number) => void;
}

export function EditableTable({ columns, data, onChange, onAdd, onRemove }: EditableTableProps) {
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editingData, setEditingData] = useState<any>({});

    const startEdit = (index: number) => {
        setEditingIndex(index);
        setEditingData({ ...data[index] });
    };

    const saveEdit = () => {
        if (editingIndex !== null) {
            const newData = [...data];
            newData[editingIndex] = editingData;
            onChange(newData);
            setEditingIndex(null);
        }
    };

    const cancelEdit = () => {
        setEditingIndex(null);
        setEditingData({});
    };

    const formatValue = (value: any, column: Column) => {
        if (column.type === 'currency') {
            return `R$ ${parseFloat(value || 0).toFixed(2).replace('.', ',')}`;
        }
        if (column.type === 'number' && column.suffix) {
            return `${value || 0} ${column.suffix}`;
        }
        return value || '';
    };

    return (
        <div className="border border-slate-700 rounded-lg overflow-hidden bg-slate-900">
            <table className="w-full">
                <thead className="bg-slate-800">
                    <tr>
                        {columns.map((col) => (
                            <th key={col.key} className="px-4 py-3 text-left text-sm font-bold text-slate-300">
                                {col.label}
                            </th>
                        ))}
                        <th className="px-4 py-3 text-right text-sm font-bold text-slate-300 w-24">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, index) => (
                        <tr key={index} className="border-t border-slate-700 hover:bg-slate-800/50 transition-colors">
                            {columns.map((col) => (
                                <td key={col.key} className="px-4 py-3">
                                    {editingIndex === index ? (
                                        <input
                                            type={col.type === 'text' ? 'text' : 'number'}
                                            value={editingData[col.key] || ''}
                                            onChange={(e) => setEditingData({ ...editingData, [col.key]: e.target.value })}
                                            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                                            step={col.type === 'currency' ? '0.01' : '1'}
                                            autoFocus={col.key === columns[0].key}
                                        />
                                    ) : (
                                        <span className="text-sm text-slate-200">{formatValue(row[col.key], col)}</span>
                                    )}
                                </td>
                            ))}
                            <td className="px-4 py-3 text-right">
                                {editingIndex === index ? (
                                    <div className="flex gap-2 justify-end">
                                        <button
                                            onClick={saveEdit}
                                            className="p-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white transition-colors"
                                            title="Salvar"
                                        >
                                            <Check size={14} />
                                        </button>
                                        <button
                                            onClick={cancelEdit}
                                            className="p-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors"
                                            title="Cancelar"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex gap-2 justify-end">
                                        <button
                                            onClick={() => startEdit(index)}
                                            className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                                            title="Editar"
                                        >
                                            <Pencil size={14} />
                                        </button>
                                        <button
                                            onClick={() => onRemove(index)}
                                            className="p-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors"
                                            title="Remover"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="p-4 border-t border-slate-700 bg-slate-800/50">
                <button
                    onClick={onAdd}
                    className="flex items-center gap-2 text-blue-400 hover:text-blue-300 font-bold text-sm transition-colors"
                >
                    <Plus size={16} />
                    Adicionar linha
                </button>
            </div>
        </div>
    );
}
