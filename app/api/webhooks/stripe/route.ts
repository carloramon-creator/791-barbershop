import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe-server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import Stripe from 'stripe';
import { invoiceProvider } from '@/lib/invoice-provider';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

export async function POST(req: Request) {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
        console.error('[STRIPE WEBHOOK] Sem assinatura');
        return NextResponse.json({ error: 'Sem assinatura' }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
        console.error('[STRIPE WEBHOOK] Erro de assinatura:', err.message);
        return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }

    console.log('[STRIPE WEBHOOK] Evento recebido:', event.type);

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                await handleCheckoutCompleted(session);
                break;
            }

            case 'customer.subscription.created':
            case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription;
                await handleSubscriptionChange(subscription);
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                await handleSubscriptionDeleted(subscription);
                break;
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object as Stripe.Invoice;
                await handlePaymentFailed(invoice);
                break;
            }

            case 'invoice.payment_succeeded': {
                const invoice = event.data.object as Stripe.Invoice;
                await handleInvoicePaymentSucceeded(invoice);
                break;
            }

            default:
                console.log('[STRIPE WEBHOOK] Evento não tratado:', event.type);
        }

        return NextResponse.json({ received: true });
    } catch (error: any) {
        console.error('[STRIPE WEBHOOK] Erro ao processar:', error);
        return NextResponse.json(
            { error: 'Erro ao processar webhook' },
            { status: 500 }
        );
    }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const tenantId = session.metadata?.tenant_id;
    const planSlug = session.metadata?.plan;
    const addonSlug = session.metadata?.addon;
    const isAddon = session.metadata?.is_addon === 'true';
    const interval = parseInt(session.metadata?.interval || '1');
    const couponId = session.metadata?.coupon_id;

    if (!tenantId || (!planSlug && !addonSlug)) {
        console.error('[STRIPE] CRITICAL: Metadata faltando no checkout. Session:', session.id);
        return;
    }

    console.log(`[STRIPE] Processando Checkout: Tenant=${tenantId}, Item=${addonSlug || planSlug}, Interval=${interval}, Mode=${session.mode}`);

    if (isAddon && addonSlug) {
        const { data: addonData } = await getSupabaseAdmin().from('system_addons').select('id').eq('slug', addonSlug).single();
        if (addonData) {
            await getSupabaseAdmin().from('tenant_addons').upsert({
                tenant_id: tenantId,
                addon_id: addonData.id,
                status: 'active',
                stripe_subscription_id: session.subscription as string || null
            });
        }
    } else if (planSlug) {
        const updateData: any = {
            plan: planSlug,
            stripe_customer_id: session.customer as string,
            subscription_status: 'active',
        };

        if (session.subscription) {
            updateData.stripe_subscription_id = session.subscription as string;
        }

        if (interval > 1 || session.mode === 'payment') {
            const now = new Date();
            const futureDate = new Date(now.setMonth(now.getMonth() + interval));
            updateData.subscription_current_period_end = futureDate.toISOString();
        }

        await getSupabaseAdmin().from('tenants').update(updateData).eq('id', tenantId);
        await getSupabaseAdmin().from('trial_subscriptions').update({ status: 'converted' }).eq('tenant_id', tenantId).eq('status', 'active');
    }

    // Financeiro para mode: 'payment'
    if (session.mode === 'payment' && session.amount_total) {
        const amount = session.amount_total / 100;
        const description = `Assinatura SaaS ${interval === 12 ? 'Anual' : interval === 6 ? 'Semestral' : ''} - Plano ${planSlug} (Stripe Parcelado)`;

        await getSupabaseAdmin().from('finance').insert({
            tenant_id: tenantId,
            type: 'expense',
            value: amount,
            description: description,
            date: new Date().toISOString().split('T')[0],
            is_paid: true,
            metadata: {
                is_saas_payment: true,
                stripe_session_id: session.id,
                stripe_customer_id: session.customer as string,
                method: 'stripe_card_installments',
                interval: interval
            }
        });
    }

    if (couponId && couponId !== 'null') {
        try {
            const totalDiscount = session.total_details?.amount_discount || 0;
            const discountApplied = totalDiscount / 100;

            await getSupabaseAdmin().from('system_coupon_usage').insert({
                coupon_id: couponId,
                tenant_id: tenantId,
                stripe_session_id: session.id,
                stripe_subscription_id: session.subscription as string || null,
                plan: planSlug || addonSlug,
                discount_applied: discountApplied
            });

            await getSupabaseAdmin().rpc('increment_coupon_usage', { coupon_uuid: couponId });
        } catch (error) {
            console.error('[STRIPE] Erro ao registrar uso do cupom:', error);
        }
    }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
    const customerId = invoice.customer as string;
    const amount = invoice.amount_paid / 100;
    const subscriptionId = (invoice as any).subscription as string;

    if (amount <= 0) return;

    const { data: tenant } = await getSupabaseAdmin().from('tenants').select('id, plan, name, cnpj, cpf').eq('stripe_customer_id', customerId).single();
    if (!tenant) return;

    const isCreation = invoice.billing_reason === 'subscription_create';
    const isUpdate = invoice.billing_reason === 'subscription_update';
    const description = isCreation ? `Assinatura SaaS - Plano ${tenant.plan} (Stripe)` : isUpdate ? `Upgrade/Alteração SaaS - Plano ${tenant.plan} (Stripe)` : `Renovação SaaS - Plano ${tenant.plan} (Stripe)`;

    const { data: financeRecord } = await getSupabaseAdmin().from('finance').insert({
        tenant_id: tenant.id,
        type: 'expense',
        value: amount,
        description: description,
        date: new Date().toISOString().split('T')[0],
        is_paid: true,
        metadata: {
            is_saas_payment: true,
            stripe_invoice_id: invoice.id,
            stripe_subscription_id: subscriptionId,
            stripe_customer_id: customerId,
            method: 'stripe_card',
            billing_reason: invoice.billing_reason
        }
    }).select('*').single();

    await getSupabaseAdmin().from('tenants').update({ subscription_status: 'active' }).eq('id', tenant.id);

    if (financeRecord) {
        try {
            const result = await invoiceProvider.emitSaaSInvoice({
                id: financeRecord.id,
                tenantId: tenant.id,
                customerName: tenant.name || 'Cliente SaaS',
                customerDocument: tenant.cnpj || tenant.cpf || 'Documento não informado',
                serviceDescription: financeRecord.description || 'Assinatura SaaS 791 Barber',
                value: financeRecord.value,
                date: financeRecord.date
            }, false);

            if (result.success) {
                await getSupabaseAdmin().from('finance').update({
                    metadata: { ...financeRecord.metadata, nfe_id: result.invoiceId, nfe_pdf_url: result.pdfUrl, nfe_status: result.status }
                }).eq('id', financeRecord.id);
            }
        } catch (nfseError) {
            console.error('[STRIPE] Erro na emissão de NFS-e:', nfseError);
        }
    }
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
    const tenantId = subscription.metadata?.tenant_id;
    const plan = subscription.metadata?.plan;
    if (!tenantId) return;

    const periodEnd = (subscription as any).current_period_end;
    await getSupabaseAdmin().from('tenants').update({
        stripe_subscription_id: subscription.id,
        subscription_status: subscription.status,
        subscription_current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        ...(plan && { plan }),
    }).eq('id', tenantId);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const tenantId = subscription.metadata?.tenant_id;
    if (!tenantId) return;
    await getSupabaseAdmin().from('tenants').update({ subscription_status: 'canceled', plan: 'basic' }).eq('id', tenantId);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
    const customerId = invoice.customer as string;
    if (!customerId) return;
    const { data: tenant } = await getSupabaseAdmin().from('tenants').select('id').eq('stripe_customer_id', customerId).single();
    if (tenant) {
        await getSupabaseAdmin().from('tenants').update({ subscription_status: 'past_due' }).eq('id', tenant.id);
    }
}
