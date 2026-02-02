import { parseISO, subHours, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function testTime() {
    const start_time = "2026-02-03T16:30:00+00:00"; // Sample from my check
    const date = format(subHours(parseISO(start_time), 3), "dd/MM 'às' HH:mm", { locale: ptBR });
    console.log(`Input: ${start_time}`);
    console.log(`Parsed & Shifted: ${date}`);

    const now = new Date();
    console.log(`Current server time (UTC): ${now.toISOString()}`);
    console.log(`Current server local time: ${now.toString()}`);
}

testTime();
