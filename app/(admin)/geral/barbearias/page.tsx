import ClientPage from './page.client';

export const dynamic = 'force-dynamic';

export default async function TenantsPageServer() {
    // Agora o fetching acontece no lado do cliente para garantir que os cookies da sessão Supabase
    // sejam enviados corretamente pelo navegador, evitando erros de SSR com cookies fragmentados.
    return <ClientPage initialTenants={[]} initialError={null} />;
}
