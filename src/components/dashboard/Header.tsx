import React, { useState } from 'react';
import { DateRangePicker } from '@/components/DateRangePicker';
import { SyncMetricsButton } from '@/components/SyncMetricsButton';
import { DateRange } from 'react-day-picker';
import { ChevronDown, Layers, Grid, Layout, Building2, Activity } from 'lucide-react';
import { MetricLevel } from './types';
import { useAdAccounts } from '@/hooks/useAdAccounts';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface HeaderProps {
    dateRange: DateRange | undefined;
    setDateRange: (range: DateRange | undefined) => void;
    selectedLevel: MetricLevel;
    onLevelChange: (level: MetricLevel) => void;
    selectedAccountId?: string;
    onAccountChange: (accountId: string | undefined) => void;
    provider?: 'meta' | 'google' | 'all';
    status?: string;
    onStatusChange?: (status: string | undefined) => void;
}

export const Header: React.FC<HeaderProps> = ({
    dateRange,
    setDateRange,
    selectedLevel,
    onLevelChange,
    selectedAccountId,
    onAccountChange,
    provider = 'all',
    status,
    onStatusChange
}) => {
    const { data: adAccounts, isLoading: loadingAccounts } = useAdAccounts('meta', status);

    return (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 bg-dark-card border border-dark-border p-4 rounded-2xl relative overflow-hidden">
            {/* Blue gradient top border */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-500 via-brand-400 to-brand-600"></div>

            <div className="flex items-center gap-4">
                <div className="bg-brand-500/10 p-2 rounded-xl border border-brand-500/20">
                    <Layout className="text-brand-500 w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-100 tracking-tight">DashTracking</h1>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        <span>Atualizado em tempo real</span>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                {/* Status Selector */}
                {onStatusChange && (
                    <Select
                        value={status}
                        onValueChange={(v) => onStatusChange(v === 'all' ? undefined : v)}
                    >
                        <SelectTrigger className="w-[140px] bg-dark-bg border-dark-border text-gray-200 hover:border-brand-500/50">
                            <div className="flex items-center gap-2">
                                <Activity size={14} className="text-brand-500" />
                                <SelectValue placeholder="Status" />
                            </div>
                        </SelectTrigger>
                        <SelectContent className="bg-dark-card border-dark-border">
                            <SelectItem value="all" className="text-gray-200 hover:bg-dark-bg focus:bg-dark-bg">Todos</SelectItem>
                            <SelectItem value="ACTIVE" className="text-gray-200 hover:bg-dark-bg focus:bg-dark-bg">Ativas</SelectItem>
                            <SelectItem value="PAUSED" className="text-gray-200 hover:bg-dark-bg focus:bg-dark-bg">Pausadas</SelectItem>
                            <SelectItem value="WITH_SPEND" className="text-gray-200 hover:bg-dark-bg focus:bg-dark-bg">Com Gastos</SelectItem>
                            <SelectItem value="HAD_DELIVERY" className="text-gray-200 hover:bg-dark-bg focus:bg-dark-bg">Veiculadas</SelectItem>
                        </SelectContent>
                    </Select>
                )}

                {/* Ad Account Selector */}
                <Select value={selectedAccountId || 'all'} onValueChange={(value) => onAccountChange(value === 'all' ? undefined : value)}>
                    <SelectTrigger className="w-[200px] bg-dark-bg border-dark-border text-gray-200 hover:border-brand-500/50">
                        <div className="flex items-center gap-2">
                            <Building2 size={14} className="text-brand-500" />
                            <SelectValue placeholder="Todas as contas" />
                        </div>
                    </SelectTrigger>
                    <SelectContent className="bg-dark-card border-dark-border">
                        <SelectItem value="all" className="text-gray-200 hover:bg-dark-bg focus:bg-dark-bg">
                            Todas as contas
                        </SelectItem>
                        {adAccounts?.map((account: any) => (
                            <SelectItem
                                key={account.id}
                                value={account.id}
                                className="text-gray-200 hover:bg-dark-bg focus:bg-dark-bg"
                            >
                                {account.account_name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <div className="h-8 w-[1px] bg-dark-border mx-1"></div>

                {/* Level Selector */}
                <div className="flex bg-dark-bg border border-dark-border rounded-lg p-1">
                    <button
                        onClick={() => onLevelChange('campaign')}
                        className={`px-3 py-1.5 text-xs font-medium flex items-center gap-2 transition-all ${selectedLevel === 'campaign'
                            ? 'text-white bg-brand-600 rounded-md shadow-sm'
                            : 'text-gray-400 hover:text-gray-200'
                            }`}
                    >
                        <Layers size={14} /> Campanha
                    </button>
                    <button
                        onClick={() => onLevelChange('ad_set')}
                        className={`px-3 py-1.5 text-xs font-medium flex items-center gap-2 transition-all ${selectedLevel === 'ad_set'
                            ? 'text-white bg-brand-600 rounded-md shadow-sm'
                            : 'text-gray-400 hover:text-gray-200'
                            }`}
                    >
                        <Grid size={14} /> Conjunto
                    </button>
                    <button
                        onClick={() => onLevelChange('ad')}
                        className={`px-3 py-1.5 text-xs font-medium flex items-center gap-2 transition-all ${selectedLevel === 'ad'
                            ? 'text-white bg-brand-600 rounded-md shadow-sm'
                            : 'text-gray-400 hover:text-gray-200'
                            }`}
                    >
                        <Layout size={14} /> Anúncio
                    </button>
                </div>

                <div className="h-8 w-[1px] bg-dark-border mx-1"></div>

                <DateRangePicker
                    dateRange={dateRange}
                    onDateRangeChange={setDateRange}
                    placeholder="Selecione o período"
                    className="w-[240px]"
                />

                <SyncMetricsButton provider={provider} />
            </div>
        </div>
    );
};
