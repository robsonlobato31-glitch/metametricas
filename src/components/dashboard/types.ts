import { LucideIcon } from 'lucide-react';

export type MetricLevel = 'campaign' | 'ad_set' | 'ad';

export interface FunnelStep {
    label: string;
    value: string | number;
    subLabel: string;
    percent?: string;
}

export interface KPI {
    label: string;
    value: string | number;
    icon?: LucideIcon;
    change?: number;
}
