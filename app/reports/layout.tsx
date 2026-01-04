'use client';

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
    return (
        <section className="min-h-screen bg-white text-black font-sans">
            {children}
            <style jsx global>{`
                @media print {
                    @page { margin: 1cm; size: portrait; }
                    body { -webkit-print-color-adjust: exact; }
                }
            `}</style>
        </section>
    );
}
