'use client';

import { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ChevronRight, ChevronDown, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Product {
    id: string;
    name: string;
    category_id?: string;
    category_name?: string;
}

interface ProductCategory {
    id: string;
    name: string;
}

interface ProductTreeSelectorProps {
    products: Product[];
    categories: ProductCategory[];
    selectedProductIds: string[];
    onSelectionChange: (productIds: string[]) => void;
}

export function ProductTreeSelector({
    products,
    categories,
    selectedProductIds,
    onSelectionChange
}: ProductTreeSelectorProps) {
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

    // Agrupar produtos por categoria
    const productsByCategory = products.reduce((acc, product) => {
        const categoryId = product.category_id || 'uncategorized';
        if (!acc[categoryId]) acc[categoryId] = [];
        acc[categoryId].push(product);
        return acc;
    }, {} as Record<string, Product[]>);

    const toggleCategory = (categoryId: string) => {
        const newExpanded = new Set(expandedCategories);
        if (newExpanded.has(categoryId)) {
            newExpanded.delete(categoryId);
        } else {
            newExpanded.add(categoryId);
        }
        setExpandedCategories(newExpanded);
    };

    const toggleProduct = (productId: string) => {
        const newSelection = selectedProductIds.includes(productId)
            ? selectedProductIds.filter(id => id !== productId)
            : [...selectedProductIds, productId];
        onSelectionChange(newSelection);
    };

    const isCategorySelected = (categoryId: string) => {
        const categoryProducts = productsByCategory[categoryId] || [];
        return categoryProducts.length > 0 &&
            categoryProducts.every(p => selectedProductIds.includes(p.id));
    };

    const toggleCategory = (categoryId: string) => {
        const categoryProducts = productsByCategory[categoryId] || [];
        const allSelected = isCategorySelected(categoryId);

        if (allSelected) {
            // Desmarcar todos da categoria
            const newSelection = selectedProductIds.filter(
                id => !categoryProducts.find(p => p.id === id)
            );
            onSelectionChange(newSelection);
        } else {
            // Marcar todos da categoria
            const categoryProductIds = categoryProducts.map(p => p.id);
            const newSelection = [...new Set([...selectedProductIds, ...categoryProductIds])];
            onSelectionChange(newSelection);
        }
    };

    const toggleCategoryExpansion = (categoryId: string) => {
        const newExpanded = new Set(expandedCategories);
        if (newExpanded.has(categoryId)) {
            newExpanded.delete(categoryId);
        } else {
            newExpanded.add(categoryId);
        }
        setExpandedCategories(newExpanded);
    };

    if (products.length === 0) {
        return (
            <div className="text-center py-8 text-slate-500 text-sm">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Nenhum produto cadastrado ainda.</p>
            </div>
        );
    }

    return (
        <div className="space-y-2 max-h-96 overflow-y-auto border border-slate-800 rounded-lg p-4 bg-slate-950/50">
            {categories.map(category => {
                const categoryProducts = productsByCategory[category.id] || [];
                if (categoryProducts.length === 0) return null;

                const isExpanded = expandedCategories.has(category.id);
                const isSelected = isCategorySelected(category.id);

                return (
                    <div key={category.id} className="space-y-1">
                        <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-800/50 transition-colors">
                            <button
                                onClick={() => toggleCategoryExpansion(category.id)}
                                className="p-1 hover:bg-slate-700 rounded transition-colors"
                            >
                                {isExpanded ? (
                                    <ChevronDown size={16} className="text-blue-500" />
                                ) : (
                                    <ChevronRight size={16} className="text-slate-500" />
                                )}
                            </button>
                            <Checkbox
                                id={`cat-${category.id}`}
                                checked={isSelected}
                                onCheckedChange={() => toggleCategory(category.id)}
                            />
                            <Label
                                htmlFor={`cat-${category.id}`}
                                className="flex-1 font-bold text-slate-200 uppercase text-xs cursor-pointer"
                            >
                                {category.name} ({categoryProducts.length})
                            </Label>
                        </div>

                        {isExpanded && (
                            <div className="ml-8 space-y-1 animate-in slide-in-from-top-2 duration-200">
                                {categoryProducts.map(product => (
                                    <div
                                        key={product.id}
                                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-800/30 transition-colors"
                                    >
                                        <Checkbox
                                            id={`prod-${product.id}`}
                                            checked={selectedProductIds.includes(product.id)}
                                            onCheckedChange={() => toggleProduct(product.id)}
                                        />
                                        <Label
                                            htmlFor={`prod-${product.id}`}
                                            className="flex-1 text-slate-300 text-sm cursor-pointer"
                                        >
                                            {product.name}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Produtos sem categoria */}
            {productsByCategory['uncategorized'] && productsByCategory['uncategorized'].length > 0 && (
                <div className="space-y-1 pt-2 border-t border-slate-800">
                    <div className="flex items-center gap-2 p-2">
                        <Label className="font-bold text-slate-400 uppercase text-xs">
                            Sem Categoria ({productsByCategory['uncategorized'].length})
                        </Label>
                    </div>
                    <div className="ml-4 space-y-1">
                        {productsByCategory['uncategorized'].map(product => (
                            <div
                                key={product.id}
                                className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-800/30 transition-colors"
                            >
                                <Checkbox
                                    id={`prod-${product.id}`}
                                    checked={selectedProductIds.includes(product.id)}
                                    onCheckedChange={() => toggleProduct(product.id)}
                                />
                                <Label
                                    htmlFor={`prod-${product.id}`}
                                    className="flex-1 text-slate-300 text-sm cursor-pointer"
                                >
                                    {product.name}
                                </Label>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
