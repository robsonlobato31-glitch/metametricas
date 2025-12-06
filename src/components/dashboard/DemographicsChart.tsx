import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Users } from 'lucide-react';

interface DemographicData {
    name: string;
    value: number;
    color: string;
}

interface DemographicsChartProps {
    data: DemographicData[];
}

export const DemographicsChart: React.FC<DemographicsChartProps> = ({ data }) => {
    return (
        <div className="bg-dark-card border border-dark-border rounded-2xl p-6 h-[300px] relative">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <div className="bg-brand-500/10 p-1.5 rounded-lg">
                        <Users size={16} className="text-brand-500" />
                    </div>
                    <h2 className="font-bold text-gray-100 text-sm">Demográficos</h2>
                </div>
            </div>

            <div className="h-[200px] relative">
                {data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                                stroke="none"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#161920',
                                    borderColor: '#2A2E37',
                                    borderRadius: '8px',
                                    color: '#e5e7eb'
                                }}
                                itemStyle={{ fontSize: '12px' }}
                            />
                            <Legend
                                verticalAlign="bottom"
                                height={36}
                                iconType="circle"
                                formatter={(value) => <span className="text-xs text-gray-400 ml-1">{value}</span>}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <Users className="w-8 h-8 mb-2 opacity-20" />
                        <span className="text-xs">Nenhum dado disponível</span>
                    </div>
                )}

                {/* Center Icon - Only show if there is data */}
                {data.length > 0 && (
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 -mt-4">
                        <Users className="text-gray-600 w-6 h-6" />
                    </div>
                )}
            </div>
        </div>
    );
};
