import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { MapPin } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface RegionData {
  breakdown_value: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
}

interface RegionChartProps {
  data: RegionData[];
}

type MetricType = 'impressions' | 'clicks' | 'spend';

const METRIC_LABELS: Record<MetricType, string> = {
  impressions: 'Impressões',
  clicks: 'Cliques',
  spend: 'Gasto',
};

const formatNumber = (value: number) => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value);
};

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'];

export const RegionChart: React.FC<RegionChartProps> = ({ data }) => {
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('impressions');

  // Sort data by selected metric and take top 10
  const sortedData = [...data]
    .sort((a, b) => b[selectedMetric] - a[selectedMetric])
    .slice(0, 10);

  const chartData = sortedData.map((item, index) => ({
    name: item.breakdown_value,
    value: item[selectedMetric],
    impressions: item.impressions,
    clicks: item.clicks,
    spend: item.spend,
    conversions: item.conversions,
    color: COLORS[index % COLORS.length],
  }));

  const formatValue = (value: number) => {
    if (selectedMetric === 'spend') {
      return formatCurrency(value);
    }
    return formatNumber(value);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-dark-card border border-dark-border rounded-lg p-3 shadow-xl">
          <p className="text-gray-100 font-semibold text-sm mb-2">{item.name}</p>
          <div className="space-y-1 text-xs">
            <p className="text-gray-400">
              Impressões: <span className="text-gray-200">{formatNumber(item.impressions)}</span>
            </p>
            <p className="text-gray-400">
              Cliques: <span className="text-gray-200">{formatNumber(item.clicks)}</span>
            </p>
            <p className="text-gray-400">
              Gasto: <span className="text-gray-200">{formatCurrency(item.spend)}</span>
            </p>
            <p className="text-gray-400">
              Conversões: <span className="text-gray-200">{item.conversions}</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-dark-card border border-dark-border rounded-2xl p-6 h-[300px] relative">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <div className="bg-emerald-500/10 p-1.5 rounded-lg">
            <MapPin size={16} className="text-emerald-500" />
          </div>
          <h2 className="font-bold text-gray-100 text-sm">Região</h2>
        </div>
        <Select value={selectedMetric} onValueChange={(value) => setSelectedMetric(value as MetricType)}>
          <SelectTrigger className="w-[120px] h-7 text-xs bg-dark-card border-dark-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-dark-card border-dark-border">
            {(Object.keys(METRIC_LABELS) as MetricType[]).map((metric) => (
              <SelectItem key={metric} value={metric} className="text-xs">
                {METRIC_LABELS[metric]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="h-[220px] relative">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            >
              <XAxis 
                type="number" 
                tickFormatter={(value) => selectedMetric === 'spend' ? `R$${formatNumber(value)}` : formatNumber(value)}
                tick={{ fill: '#6b7280', fontSize: 10 }}
                axisLine={{ stroke: '#374151' }}
                tickLine={{ stroke: '#374151' }}
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={80}
                tick={{ fill: '#9ca3af', fontSize: 10 }}
                axisLine={{ stroke: '#374151' }}
                tickLine={false}
                tickFormatter={(value) => value.length > 12 ? `${value.substring(0, 12)}...` : value}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <MapPin className="w-8 h-8 mb-2 opacity-20" />
            <span className="text-xs">Nenhum dado de região disponível</span>
            <span className="text-[10px] text-gray-600 mt-1">Sincronize métricas para ver dados por região</span>
          </div>
        )}
      </div>
    </div>
  );
};
