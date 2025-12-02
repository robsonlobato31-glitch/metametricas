import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
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

interface PlatformDataItem {
  provider: string;
  spend: number;
  percentage: number;
}

interface DemographicDataItem {
  name: string;
  value: number;
  percentage?: number;
}

interface ExportChartsProps {
  budgetData: BudgetDataItem[];
  trendData: TrendDataItem[];
  showBudget: boolean;
  showTrend: boolean;
  platformData?: PlatformDataItem[];
  showPlatformPie?: boolean;
  ageData?: DemographicDataItem[];
  showAgeChart?: boolean;
  genderData?: DemographicDataItem[];
  showGenderChart?: boolean;
}

const PLATFORM_COLORS = ['#3b82f6', '#f97316', '#22c55e', '#8b5cf6'];
const AGE_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
const GENDER_COLORS = ['#3b82f6', '#ec4899', '#9ca3af'];

export const ExportCharts = ({
  budgetData,
  trendData,
  showBudget,
  showTrend,
  platformData = [],
  showPlatformPie = false,
  ageData = [],
  showAgeChart = false,
  genderData = [],
  showGenderChart = false,
}: ExportChartsProps) => {
  const hasAnyChart = showBudget || showTrend || showPlatformPie || showAgeChart || showGenderChart;
  
  if (!hasAnyChart) return null;

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

      {showPlatformPie && platformData.length > 0 && (
        <div
          id="platform-pie-chart"
          className="w-[800px] h-[400px] bg-white p-6"
          style={{ backgroundColor: 'white' }}
        >
          <h3 className="text-lg font-semibold mb-4 text-gray-900">
            Distribuição por Plataforma
          </h3>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={platformData}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={({ provider, percentage }) => `${provider}: ${percentage.toFixed(1)}%`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="spend"
                nameKey="provider"
              >
                {platformData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={PLATFORM_COLORS[index % PLATFORM_COLORS.length]} />
                ))}
              </Pie>
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
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {showAgeChart && ageData.length > 0 && (
        <div
          id="age-chart"
          className="w-[800px] h-[400px] bg-white p-6"
          style={{ backgroundColor: 'white' }}
        >
          <h3 className="text-lg font-semibold mb-4 text-gray-900">
            Distribuição por Faixa Etária
          </h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={ageData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                type="number"
                tick={{ fontSize: 12, fill: '#6b7280' }}
                tickLine={{ stroke: '#e5e7eb' }}
                tickFormatter={(value) =>
                  new Intl.NumberFormat('pt-BR', {
                    notation: 'compact',
                  }).format(value)
                }
              />
              <YAxis
                dataKey="name"
                type="category"
                tick={{ fontSize: 12, fill: '#6b7280' }}
                tickLine={{ stroke: '#e5e7eb' }}
                width={80}
              />
              <Tooltip
                formatter={(value: number) => value.toLocaleString('pt-BR')}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                }}
              />
              <Bar dataKey="value" name="Alcance/Cliques" radius={[0, 4, 4, 0]}>
                {ageData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={AGE_COLORS[index % AGE_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {showGenderChart && genderData.length > 0 && (
        <div
          id="gender-chart"
          className="w-[800px] h-[400px] bg-white p-6"
          style={{ backgroundColor: 'white' }}
        >
          <h3 className="text-lg font-semibold mb-4 text-gray-900">
            Distribuição por Gênero
          </h3>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={genderData}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={({ name, percentage }) => `${name}: ${(percentage || 0).toFixed(1)}%`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
              >
                {genderData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={GENDER_COLORS[index % GENDER_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => value.toLocaleString('pt-BR')}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
