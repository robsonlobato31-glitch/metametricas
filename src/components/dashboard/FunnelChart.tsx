import React from 'react';
import { Filter } from 'lucide-react';
import { FunnelStep } from './types';

interface FunnelChartProps {
    data: FunnelStep[];
}

export const FunnelChart: React.FC<FunnelChartProps> = ({ data }) => {
    return (
        <div className="bg-dark-card border border-dark-border rounded-2xl p-6 h-full flex flex-col relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-500 to-transparent opacity-30"></div>

            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                    <div className="bg-brand-500/10 p-2 rounded-lg border border-brand-500/10">
                        <Filter size={18} className="text-brand-500" />
                    </div>
                    <h2 className="font-bold text-gray-100 text-sm">Funil Geral</h2>
                </div>
                <div className="text-[10px] text-gray-500 bg-dark-bg px-2 py-1 rounded border border-dark-border">Infoproduto</div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-start gap-1 py-4">
                {data.map((step, index) => {
                    const widths = ['100%', '85%', '70%', '55%', '40%'];
                    const width = widths[index] || '40%';
                    const isLast = index === data.length - 1;

                    return (
                        <div key={index} className="w-full flex flex-col items-center relative group">
                            <div
                                className="relative h-20 bg-gradient-to-b from-brand-500 to-brand-600 flex flex-col items-center justify-center text-white shadow-xl shadow-brand-900/30 transition-transform hover:scale-[1.02] z-10"
                                style={{
                                    width: width,
                                    clipPath: isLast
                                        ? 'polygon(0 0, 100% 0, 100% 100%, 0 100%)'
                                        : 'polygon(0 0, 100% 0, 85% 100%, 15% 100%)',
                                    marginBottom: '-4px'
                                }}
                            >
                                <span className="text-[10px] text-brand-100 font-medium uppercase tracking-wider mb-0.5">{step.label}</span>
                                <span className="text-2xl font-bold drop-shadow-sm">{step.value}</span>
                            </div>
                            <div className="absolute left-[50%] ml-[60%] top-6 flex items-center w-full opacity-0 group-hover:opacity-100 xl:opacity-100 transition-opacity">
                                <div className="h-[1px] w-8 bg-gray-700 mr-2"></div>
                                <div className="text-left">
                                    <span className="block text-[10px] text-gray-400">{step.subLabel}</span>
                                    {step.percent && <span className="block text-xs font-bold text-brand-400">{step.percent}</span>}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
