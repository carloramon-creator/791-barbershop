'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, PlusCircle, Share } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InstallPWAProps {
    tenant?: {
        name: string;
        logo_url?: string;
    } | null;
}

export function InstallPWA({ tenant }: InstallPWAProps) {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [showInstall, setShowInstall] = useState(false);

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
            setIsStandalone(true);
            return;
        }

        // Check platform
        const userAgent = window.navigator.userAgent.toLowerCase();
        const ios = /iphone|ipad|ipod/.test(userAgent);
        setIsIOS(ios);

        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShowInstall(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // For iOS, we always show it if not standalone
        if (ios && !isStandalone) {
            setShowInstall(true);
        }

        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, [isStandalone]);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
            setShowInstall(false);
        }
    };

    if (isStandalone || !showInstall) return null;

    return (
        <div className="mx-4 my-6 p-6 bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/20 rounded-[2rem] relative overflow-hidden animate-in fade-in slide-in-from-bottom-4">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16" />

            <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg overflow-hidden">
                        {tenant?.logo_url ? (
                            <img src={tenant.logo_url} alt={tenant.name} className="w-full h-full object-cover" />
                        ) : (
                            <Download size={24} />
                        )}
                    </div>
                    <div>
                        <h4 className="font-black text-slate-100 uppercase text-sm tracking-tight">Instalar Aplicativo</h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{tenant?.name || 'Acesso rápido e offline'}</p>
                    </div>
                </div>

                {isIOS ? (
                    <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800 space-y-3">
                        <p className="text-[11px] text-slate-300 font-medium leading-relaxed">
                            Para instalar no iPhone:
                        </p>
                        <ol className="text-[10px] text-slate-400 space-y-2 uppercase font-black">
                            <li className="flex items-center gap-2">
                                <span className="w-4 h-4 rounded-full bg-slate-800 flex items-center justify-center text-blue-500">1</span>
                                Toque no botão de compartilhar <Share size={14} className="text-blue-500" />
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-4 h-4 rounded-full bg-slate-800 flex items-center justify-center text-blue-500">2</span>
                                Role e escolha "Tela de Início" <PlusCircle size={14} className="text-blue-500" />
                            </li>
                        </ol>
                    </div>
                ) : (
                    <Button
                        onClick={handleInstallClick}
                        className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest rounded-xl shadow-lg border-b-4 border-blue-800 active:border-b-0 active:translate-y-1 transition-all"
                    >
                        Instalar Agora
                    </Button>
                )}
            </div>
        </div>
    );
}
