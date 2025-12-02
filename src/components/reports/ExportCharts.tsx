import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface BudgetDataItem {
  date: string;
  displayDate: string;
  spend: number;
  budget: number;
}

interface TrendDataItem {
  date: string;
  displayDate: string;
  spend: number;
  impressions: number;
  clicks: number;
}

interface ExportChartsProps {
  budgetData: BudgetDataItem[];
  trendData: TrendDataItem[];
  showBudget: boolean;
  showTrend: boolean;
}

export const ExportCharts = ({
  budgetData,
  trendData,
  showBudget,
  showTrend,
}: ExportChartsProps) => {
  if (!showBudget && !showTrend) return null;

  return (
    <div className="fixed -left-[9999px] top-0 pointer-events-none">
      {showBudget && budgetData.length > 0 && (
        <div
          id="budget-chart"
          className="w-[800px] h-[400px] bg-white p-6"
          style={{ backgroundColor: 'white' }}
        >
          <h3 className="text-lg font-semibold mb-4 text-gray-900">
            Gasto vs Orçamento
          </h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={budgetData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="displayDate"
                tick={{ fontSize: 12, fill: '#6b7280' }}
                tickLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#6b7280' }}
                tickLine={{ stroke: '#e5e7eb' }}
                tickFormatter={(value) =>
                  new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                    notation: 'compact',
                  }).format(value)
                }
              />
              <Tooltip
                formatter={(value: number) =>
                  new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(value)
                }
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                }}
              />
              <Legend />
              <Bar
                dataKey="spend"
                name="Gasto"
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="budget"
                name="Orçamento"
                fill="#22c55e"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {showTrend && trendData.length > 0 && (
        <div
          id="trend-chart"
          className="w-[800px] h-[400px] bg-white p-6"
          style={{ backgroundColor: 'white' }}
        >
          <h3 className="text-lg font-semibold mb-4 text-gray-900">
            Evolução de Métricas
          </h3>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="displayDate"
                tick={{ fontSize: 12, fill: '#6b7280' }}
                tickLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 12, fill: '#6b7280' }}
                tickLine={{ stroke: '#e5e7eb' }}
                tickFormatter={(value) =>
                  new Intl.NumberFormat('pt-BR', {
                    notation: 'compact',
                  }).format(value)
                }
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 12, fill: '#6b7280' }}
                tickLine={{ stroke: '#e5e7eb' }}
                tickFormatter={(value) =>
                  new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                    notation: 'compact',
                  }).format(value)
                }
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                }}
              />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="impressions"
                name="Impressões"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="clicks"
                name="Cliques"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="spend"
                name="Gasto"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
