import { DollarSign, Target, TrendingUp, MousePointer, Eye, Percent } from 'lucide-react';

export const kpiData = [
    { label: 'Investimento', value: 'R$ 0,00', icon: DollarSign },
    { label: 'Resultado', value: '0', icon: Target },
    { label: 'Custo/Resultado', value: 'R$ 0,00', icon: TrendingUp },
    { label: 'Retorno', value: 'R$ 0,00', icon: DollarSign },
    { label: 'CPM', value: 'R$ 0,00', icon: Eye },
    { label: 'CTR', value: '0,00%', icon: Percent },
];

export const funnelData = [
    { label: 'Alcance', value: '0', subLabel: 'Pessoas alcançadas' },
    { label: 'Visualizações', value: '0', subLabel: 'Visualizações de página', percent: '0%' },
    { label: 'Cliques', value: '0', subLabel: 'Cliques no link', percent: '0%' },
    { label: 'Add Carrinho', value: '0', subLabel: 'Adições ao carrinho', percent: '0%' },
    { label: 'Compras', value: '0', subLabel: 'Compras realizadas', percent: '0%' },
];

export const timelineData = [
    { date: '01/01', spend: 0, revenue: 0 },
    { date: '02/01', spend: 0, revenue: 0 },
    { date: '03/01', spend: 0, revenue: 0 },
    { date: '04/01', spend: 0, revenue: 0 },
    { date: '05/01', spend: 0, revenue: 0 },
];

export const demographicsData = [
    { name: '18-24', value: 25, color: '#3b82f6' },
    { name: '25-34', value: 35, color: '#60a5fa' },
    { name: '35-44', value: 20, color: '#93c5fd' },
    { name: '45+', value: 20, color: '#bfdbfe' },
];

export const campaigns = [];
export const creatives = [];
