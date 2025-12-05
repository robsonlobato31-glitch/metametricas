import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar } from 'lucide-react';

interface TimelineData {
    date: string;
    spend: number;
    revenue: number;
}

interface TimelineChartProps {
    data: TimelineData[];
}

export const TimelineChart: React.FC<TimelineChartProps> = ({ data }) => {
    return (
        <div className="bg-dark-card border border-dark-border rounded-2xl p-6 h-[300px] relative overflow-hidden">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                    <div className="bg-brand-500/10 p-1.5 rounded-lg">
                        <Calendar size={16} className="text-brand-500" />
                    </div>
                    <h2 className="font-bold text-gray-100 text-sm">Linha do Tempo</h2>
                </div>
            </div>

            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 30 }}>
                    <defs>
                        <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2E37" vertical={false} />
                    <XAxis
                        dataKey="date"
                        stroke="#6b7280"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                    />
                    <YAxis
                        stroke="#6b7280"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `R$${value}`}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#161920',
                            borderColor: '#2A2E37',
                            borderRadius: '8px',
                            color: '#e5e7eb'
                        }}
                        itemStyle={{ fontSize: '12px' }}
                    />
                    <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#10b981"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorRevenue)"
                        name="Receita"
                    />
                    <Area
                        type="monotone"
                        dataKey="spend"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorSpend)"
                        name="Valor Gasto"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};
