import Link from 'next/link';
import { useAuth } from '@/lib/auth-provider';
import { User, Sun, Moon, Menu, AlertTriangle, Clock, CreditCard } from 'lucide-react';
import { useTheme } from '@/lib/theme-provider';
import { Button } from '@/components/ui/button';

export function Topbar() {
    const { user, role, isImpersonating, tenant, profile } = useAuth();
    const { theme, toggleTheme } = useTheme();

    return (
        <header className="flex flex-col border-b border-slate-800 bg-slate-950 transition-colors shadow-lg">
            {isImpersonating && (
                <div className="bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest py-1.5 px-4 flex items-center justify-between animate-pulse">
                    <div className="flex items-center gap-2">
                        <AlertTriangle size={12} />
                        Imporsonando Barbieria: <span className="underline">{tenant?.name}</span>
                    </div>
                    <a href="/api/system/impersonate?stop=true" className="bg-white text-amber-600 px-2 py-0.5 rounded font-bold hover:bg-slate-100 transition-colors">
                        Parar Acesso
                    </a>
                </div>
            )}
            <div className="h-16 px-4 md:px-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {/* Menu Hamburguer aparecerá apenas no mobile se necessário futuramente */}
                    <div className="text-sm font-bold text-slate-400 hidden md:block uppercase tracking-widest">
                        Painel Administrativo
                    </div>
                    {/* Indicador de Plano */}
                    {tenant && (
                        <div className="hidden lg:flex items-center px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-medium">
                            {(() => {
                                const isStripeTrial = tenant.plan === 'trial' || tenant.subscription_status === 'trialing';

                                // Detecção de Trial por Data de Cadastro (< 7 dias e não ativo)
                                let isTimeTrial = false;
                                let daysLeft = 0;

                                if (tenant.created_at) {
                                    const created = new Date(tenant.created_at);
                                    const now = new Date();
                                    const diffTime = Math.abs(now.getTime() - created.getTime());
                                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                                    if (diffDays <= 7 && tenant.subscription_status !== 'active') {
                                        isTimeTrial = true;
                                        daysLeft = 8 - diffDays; // 8 para incluir o dia atual
                                    }
                                }

                                const isTrial = isStripeTrial || isTimeTrial;

                                // Recalcula daysLeft se for Stripe Trial (tem data fim definida)
                                if (isStripeTrial && tenant.subscription_current_period_end) {
                                    const end = new Date(tenant.subscription_current_period_end);
                                    const now = new Date();
                                    if (end > now) {
                                        daysLeft = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                                    }
                                }

                                if (isTrial) {
                                    return (
                                        <Link href="/configuracoes/plano">
                                            <div className="flex items-center gap-2 bg-amber-500 text-slate-950 px-4 py-1.5 rounded-full font-bold shadow-lg shadow-amber-500/20 animate-in fade-in zoom-in duration-300 hover:scale-105 transition-transform cursor-pointer hover:bg-amber-400">
                                                <Clock size={16} className="text-slate-900" />
                                                <span>
                                                    Seu teste acaba em {daysLeft} dias! Assine agora
                                                </span>
                                            </div>
                                        </Link>
                                    );
                                } else {
                                    return (
                                        <div className="flex items-center gap-2 text-blue-400">
                                            <CreditCard size={14} />
                                            <span>
                                                Plano {tenant.plan === 'basic' ? 'Básico' : tenant.plan === 'complete' ? 'Completo' : tenant.plan === 'premium' ? 'Premium' : tenant.plan}
                                            </span>
                                        </div>
                                    );
                                }
                            })()}
                        </div>
                    )}
                    <div className="md:hidden text-lg font-black text-blue-600">791</div>
                </div>

                <div className="flex items-center gap-2 md:gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleTheme}
                        className="w-10 h-10 rounded-xl hover:bg-slate-800 transition-colors"
                    >
                        {theme === 'dark' ? (
                            <Sun className="w-5 h-5 text-yellow-500" />
                        ) : (
                            <Moon className="w-5 h-5 text-slate-700 fill-slate-700" />
                        )}
                    </Button>

                    <div className="flex items-center gap-3 pl-2 md:pl-4 border-l border-slate-800">
                        <div className="text-right hidden sm:block">
                            <div className="text-sm font-bold text-slate-100">{profile?.nickname || profile?.name || user?.email?.split('@')[0]}</div>
                            <div className="text-[10px] text-slate-500 uppercase font-black tracking-tighter">{role === 'owner' ? 'Dono' : 'Barbeiro'}</div>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 overflow-hidden">
                            {profile?.photo_url ? (
                                <img src={profile.photo_url} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <User className="w-5 h-5" />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
