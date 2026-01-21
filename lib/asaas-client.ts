import axios, { AxiosInstance } from 'axios';

export interface AsaasConfig {
    apiKey: string;
    environment?: 'sandbox' | 'production';
}

export interface AsaasCustomer {
    name: string;
    email: string;
    cpfCnpj: string;
    phone?: string;
    mobilePhone?: string;
    postalCode?: string;
    address?: string;
    addressNumber?: string;
    complement?: string;
    province?: string;
    notificationDisabled?: boolean;
}

export interface AsaasPayment {
    customer: string; // Customer ID
    billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED';
    value: number;
    dueDate: string; // YYYY-MM-DD
    description?: string;
    externalReference?: string;
    installmentCount?: number;
    installmentValue?: number;
    discount?: {
        value?: number;
        dueDateLimitDays?: number;
        type?: 'FIXED' | 'PERCENTAGE';
    };
    fine?: {
        value?: number;
        type?: 'FIXED' | 'PERCENTAGE';
    };
    interest?: {
        value?: number;
        type?: 'PERCENTAGE';
    };
    postalService?: boolean;
    split?: any[];
}

export interface AsaasCreditCardPayment extends AsaasPayment {
    creditCard?: {
        holderName: string;
        number: string;
        expiryMonth: string;
        expiryYear: string;
        ccv: string;
    };
    creditCardHolderInfo?: {
        name: string;
        email: string;
        cpfCnpj: string;
        postalCode: string;
        addressNumber: string;
        addressComplement?: string;
        phone: string;
        mobilePhone?: string;
    };
    remoteIp?: string;
}

export class AsaasClient {
    private client: AxiosInstance;
    private baseURL: string;

    constructor(config: AsaasConfig) {
        this.baseURL = config.environment === 'production'
            ? 'https://api.asaas.com/v3'
            : 'https://sandbox.asaas.com/api/v3';

        this.client = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Content-Type': 'application/json',
                'access_token': config.apiKey,
            },
        });
    }

    // Customer Management
    async createCustomer(customer: AsaasCustomer) {
        const response = await this.client.post('/customers', customer);
        return response.data;
    }

    async getCustomer(customerId: string) {
        const response = await this.client.get(`/customers/${customerId}`);
        return response.data;
    }

    async getCustomerByEmail(email: string) {
        const response = await this.client.get('/customers', {
            params: { email }
        });
        return response.data.data?.[0] || null;
    }

    // Payment Management
    async createPayment(payment: AsaasPayment | AsaasCreditCardPayment) {
        const response = await this.client.post('/payments', payment);
        return response.data;
    }

    async getPayment(paymentId: string) {
        const response = await this.client.get(`/payments/${paymentId}`);
        return response.data;
    }

    // Subscription Management
    async createSubscription(subscription: any) {
        const response = await this.client.post('/subscriptions', subscription);
        return response.data;
    }

    async getSubscriptionPreviousPayments(subscriptionId: string) {
        const response = await this.client.get(`/subscriptions/${subscriptionId}/payments`);
        return response.data;
    }

    async getPaymentsBySubscription(subscriptionId: string, limit: number = 10) {
        const response = await this.client.get('/payments', {
            params: { subscription: subscriptionId, limit }
        });
        return response.data;
    }


    async getPaymentByExternalReference(externalReference: string) {
        const response = await this.client.get('/payments', {
            params: { externalReference }
        });
        return response.data.data?.[0] || null;
    }

    // Pix QR Code
    async getPixQrCode(paymentId: string) {
        const response = await this.client.get(`/payments/${paymentId}/pixQrCode`);
        return response.data;
    }

    // Boleto
    async getBoletoBarCode(paymentId: string) {
        const response = await this.client.get(`/payments/${paymentId}/identificationField`);
        return response.data;
    }

    // Checkout API
    async createCheckout(payload: {
        billingTypes: ('CREDIT_CARD' | 'BOLETO' | 'PIX')[];
        chargeTypes: ('DETACHED' | 'RECURRENT' | 'INSTALLMENT')[];
        minutesToExpire?: number;
        callback: {
            successUrl: string;
            cancelUrl: string;
            expiredUrl: string;
        };
        items: Array<{
            name: string;
            description: string;
            quantity: number;
            value: number;
        }>;
        customerData?: {
            name: string;
            cpfCnpj: string;
            email: string;
            phone?: string;
            address?: string;
            addressNumber?: string;
            complement?: string;
            postalCode?: string;
            province?: string;
            city?: number;
        };
        subscription?: {
            cycle: 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY';
            nextDueDate: string;
            endDate?: string;
        };
        installment?: {
            maxInstallmentCount: number;
        };
    }) {
        const response = await this.client.post('/checkouts', payload);
        return response.data;
    }

    // Invoice Customization

    async customizeInvoice(config: {
        logoUrl?: string;
        primaryColor?: string;
        secondaryColor?: string;
        fontColor?: string;
        observations?: string;
    }) {
        const response = await this.client.post('/myAccount/paymentCheckoutConfig', config);
        return response.data;
    }

    async getInvoiceCustomization() {
        const response = await this.client.get('/myAccount/paymentCheckoutConfig');
        return response.data;
    }

    // Commercial Info Management
    async getCommercialInfo() {
        const response = await this.client.get('/myAccount/commercialInfo');
        return response.data;
    }

    async updateCommercialInfo(info: {
        email?: string;
        site?: string;
        phone?: string;
        mobilePhone?: string;
    }) {
        const response = await this.client.put('/myAccount/commercialInfo', info);
        return response.data;
    }

    // Webhook verification
    verifyWebhook(payload: any, signature: string, secret: string): boolean {
        // Asaas doesn't use signature verification by default
        // You can implement custom verification if needed
        return true;
    }
}

export default AsaasClient;
