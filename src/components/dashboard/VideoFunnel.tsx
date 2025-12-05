import React from 'react';
import { PlayCircle } from 'lucide-react';

interface VideoMetric {
    label: string;
    percentage: number;
    value: string;
}

interface VideoFunnelProps {
    data?: VideoMetric[];
}

export const VideoFunnel: React.FC<VideoFunnelProps> = ({ data }) => {
    // Default data if none provided
    const metrics = data || [
        { label: 'VV 100%', percentage: 7.57, value: '7.57%' },
        { label: 'VV 75%', percentage: 4.63, value: '4.63%' },
        { label: 'VV 50%', percentage: 2.57, value: '2.57%' },
        { label: 'VV 25%', percentage: 1.87, value: '1.87%' },
    ];

    return (
        <div className="bg-dark-card border border-dark-border rounded-2xl p-6">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <div className="bg-brand-500/10 p-1.5 rounded-lg">
                        <PlayCircle size={16} className="text-brand-500" />
                    </div>
                    <h2 className="font-bold text-gray-100 text-sm">Funil de Vídeo</h2>
                </div>
            </div>

            <div className="space-y-4">
                {metrics.map((metric, index) => (
                    <div key={index} className="space-y-1">
                        <div className="flex justify-between text-xs text-gray-400">
                            <span>{metric.label}</span>
                            <span className="font-bold text-gray-200">{metric.value}</span>
                        </div>
                        <div className="h-2 bg-dark-bg rounded-full overflow-hidden border border-dark-border/50">
                            <div
                                className="h-full bg-brand-500 rounded-full"
                                style={{ width: `${metric.percentage * 10}%` }} // Scaling for visualization
                            ></div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-4 pt-4 border-t border-dark-border flex justify-between items-center">
                <span className="text-xs text-gray-500">VV 100%</span>
                <span className="text-xs font-bold text-brand-400">1,57%</span>
            </div>
        </div>
    );
};
