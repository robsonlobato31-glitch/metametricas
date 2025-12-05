import React from 'react';
import { KPI } from './types';

interface KPIGridProps {
    data: KPI[];
}

export const KPIGrid: React.FC<KPIGridProps> = ({ data }) => {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {data.map((kpi, idx) => {
                const Icon = kpi.icon;
                return (
                    <div key={idx} className="bg-dark-card border border-dark-border/60 rounded-xl p-4 relative overflow-hidden group hover:border-brand-500/30 transition-all">
                        <div className="flex justify-between items-start mb-3">
                            <h3 className="text-gray-400 text-[10px] font-bold uppercase tracking-wider border-b border-dashed border-gray-700 pb-1">{kpi.label}</h3>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-dark-bg border border-dark-border flex items-center justify-center text-brand-500 group-hover:scale-105 transition-transform">
                                {Icon && <Icon size={20} />}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-lg font-bold text-white tracking-tight">{kpi.value}</span>
                            </div>
                        </div>
                        <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-brand-500/5 rounded-full blur-xl group-hover:bg-brand-500/10 transition-colors"></div>
                    </div>
                );
            })}
        </div>
    );
};
