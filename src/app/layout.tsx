import type { Metadata } from 'next';
import './globals.css';
import ClientLayout from './ClientLayout';

export const metadata: Metadata = {
  title: 'EPSON | Painel de Gestão de Ordens de Serviço & Performance CSA',
  description: 'Controle de OS, Indicadores de SLA, BI 23_001 e Classificação de Níveis Epson',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
