import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileText, TrendingUp, TrendingDown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import type { ExportConfig } from '@/components/reports/ExportReportDialog';
import { useReportTemplate } from '@/hooks/useReportTemplate';

interface Campaign {
  id: string;
  name: string;
  status: string;
  budget?: number | null;
  campaign_id: string;
  ad_accounts?: {
    provider: string;
  } | null;
}

interface MetricData {
  campaign_id: string;
  campaign_name: string;
  spend?: number | null;
  impressions?: number | null;
  clicks?: number | null;
  budget?: number | null;
  results?: number | null;
  messages?: number | null;
  conversions?: number | null;
  ctr?: number | null;
  cpc?: number | null;
  cost_per_result?: number | null;
  cost_per_message?: number | null;
}

interface ReportPreviewProps {
  config: ExportConfig;
  campaigns: Campaign[];
  metricsData: MetricData[];
}

const PLATFORM_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

export const ReportPreview = ({ config, campaigns, metricsData }: ReportPreviewProps) => {
  const { template } = useReportTemplate();
  
  const days = parseInt(config.period);
  const dateFrom = subDays(new Date(), days);
  const dateTo = new Date();
  const periodText = `${format(dateFrom, 'dd/MM/yyyy', { locale: ptBR })} - ${format(dateTo, 'dd/MM/yyyy', { locale: ptBR })}`;

  // Filter campaigns based on config
  let displayCampaigns = campaigns;
  if (config.selectedCampaignIds.length > 0) {
    displayCampaigns = campaigns.filter((c) =>
      config.selectedCampaignIds.includes(c.campaign_id)
    );
  }

  // Calculate ALL metrics based on selection
  const calculateMetrics = () => {
    const metrics: Array<{ label: string; value: string }> = [];
    
    const totalImpressions = metricsData?.reduce((acc, m) => acc + (m.impressions || 0), 0) || 0;
    const totalClicks = metricsData?.reduce((acc, m) => acc + (m.clicks || 0), 0) || 0;
    const totalSpend = metricsData?.reduce((acc, m) => acc + (m.spend || 0), 0) || 0;
    const totalResults = metricsData?.reduce((acc, m) => acc + (m.results || 0), 0) || 0;
    const totalMessages = metricsData?.reduce((acc, m) => acc + (m.messages || 0), 0) || 0;
    const totalConversions = metricsData?.reduce((acc, m) => acc + (m.conversions || 0), 0) || 0;
    
    if (config.selectedMetrics.impressions) {
      metrics.push({ label: 'Impressões', value: totalImpressions.toLocaleString('pt-BR') });
    }
    if (config.selectedMetrics.clicks) {
      metrics.push({ label: 'Cliques', value: totalClicks.toLocaleString('pt-BR') });
    }
    if (config.selectedMetrics.ctr) {
      const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions * 100) : 0;
      metrics.push({ label: 'CTR', value: `${ctr.toFixed(2)}%` });
    }
    if (config.selectedMetrics.cpc) {
      const cpc = totalClicks > 0 ? (totalSpend / totalClicks) : 0;
      metrics.push({ label: 'CPC', value: `R$ ${cpc.toFixed(2)}` });
    }
    if (config.selectedMetrics.spend) {
      metrics.push({ label: 'Gasto Total', value: `R$ ${totalSpend.toFixed(2)}` });
    }
    if (config.selectedMetrics.conversions) {
      metrics.push({ label: 'Conversões', value: totalConversions.toLocaleString('pt-BR') });
    }
    if (config.selectedMetrics.results) {
      metrics.push({ label: 'Resultados', value: totalResults.toLocaleString('pt-BR') });
    }
    if (config.selectedMetrics.cost_per_result) {
      const cpr = totalResults > 0 ? (totalSpend / totalResults) : 0;
      metrics.push({ label: 'Custo/Resultado', value: `R$ ${cpr.toFixed(2)}` });
    }
    if (config.selectedMetrics.messages) {
      metrics.push({ label: 'Mensagens', value: totalMessages.toLocaleString('pt-BR') });
    }
    if (config.selectedMetrics.cost_per_message) {
      const cpm = totalMessages > 0 ? (totalSpend / totalMessages) : 0;
      metrics.push({ label: 'Custo/Mensagem', value: `R$ ${cpm.toFixed(2)}` });
    }
    
    return metrics;
  };

  const metrics = calculateMetrics();

  // Chart data
  const chartData = metricsData?.slice(0, 8).map((m) => ({
    name: m.campaign_name.substring(0, 12) + (m.campaign_name.length > 12 ? '...' : ''),
    spend: m.spend || 0,
    budget: m.budget || 0,
    impressions: m.impressions || 0,
    clicks: m.clicks || 0,
  })) || [];

  // Platform pie chart data
  const platformData = campaigns.reduce((acc, c) => {
    const provider = c.ad_accounts?.provider || 'unknown';
    const spend = metricsData?.find(m => m.campaign_id === c.id)?.spend || 0;
    const existing = acc.find(p => p.name === provider);
    if (existing) {
      existing.value += spend;
    } else {
      acc.push({ name: provider === 'meta' ? 'Meta Ads' : provider === 'google' ? 'Google Ads' : provider, value: spend });
    }
    return acc;
  }, [] as Array<{ name: string; value: number }>);

  const primaryColor = template?.primary_color || '#3B82F6';
  const secondaryColor = template?.secondary_color || '#10B981';

  const hasAnySectionEnabled = config.includeSections.metrics || 
    config.includeSections.budgetChart || 
    config.includeSections.trendChart || 
    config.includeSections.campaignTable ||
    config.includeSections.coverPage ||
    config.includeSections.metricsComparison ||
    config.includeSections.platformBreakdown ||
    config.includeSections.platformPieChart ||
    config.includeSections.topCampaignsTable;

  return (
    <ScrollArea className="h-[600px] w-full">
      <div className="bg-white text-black p-6 min-h-full" style={{ fontFamily: 'Arial, sans-serif' }}>
        {/* Cover Page Preview */}
        {config.includeSections.coverPage && (
          <div className="mb-6 p-8 border-2 rounded-lg text-center" style={{ borderColor: primaryColor, backgroundColor: '#f8fafc' }}>
            {template?.logo_url && (
              <img src={template.logo_url} alt="Logo" className="h-16 w-auto mx-auto mb-4 object-contain" />
            )}
            <h1 className="text-2xl font-bold mb-2" style={{ color: primaryColor }}>
              {template?.header_text || 'Relatório de Campanhas'}
            </h1>
            <div className="inline-block px-6 py-2 rounded text-white" style={{ backgroundColor: primaryColor }}>
              {periodText}
            </div>
          </div>
        )}

        {/* PDF Header Simulation */}
        <div className="mb-6 pb-4 border-b-2" style={{ borderColor: primaryColor }}>
          <div className="flex items-center gap-4">
            {template?.logo_url && (
              <img src={template.logo_url} alt="Logo" className="h-10 w-auto object-contain" />
            )}
            <div>
              <h1 className="text-xl font-bold" style={{ color: primaryColor }}>
                {template?.header_text || 'Relatório de Campanhas'}
              </h1>
              <p className="text-sm text-gray-600">Período: {periodText}</p>
            </div>
          </div>
        </div>

        {/* Metrics Section */}
        {config.includeSections.metrics && metrics.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3" style={{ color: primaryColor }}>
              Resumo de Métricas
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {metrics.map((metric, index) => (
                <Card key={index} className="p-3 bg-gray-50">
                  <p className="text-xs text-gray-500">{metric.label}</p>
                  <p className="text-lg font-bold" style={{ color: primaryColor }}>
                    {metric.value}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Platform Pie Chart */}
        {config.includeSections.platformPieChart && platformData.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3" style={{ color: primaryColor }}>
              Distribuição por Plataforma
            </h2>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={platformData}
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {platformData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PLATFORM_COLORS[index % PLATFORM_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `R$ ${value.toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Budget Chart */}
        {config.includeSections.budgetChart && chartData.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3" style={{ color: primaryColor }}>
              Orçamento vs Gasto
            </h2>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="spend" name="Gasto" fill={primaryColor} />
                  <Bar dataKey="budget" name="Orçamento" fill={secondaryColor} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Trend Chart */}
        {config.includeSections.trendChart && chartData.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3" style={{ color: primaryColor }}>
              Evolução de Métricas
            </h2>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="impressions" name="Impressões" stroke={primaryColor} />
                  <Line yAxisId="left" type="monotone" dataKey="clicks" name="Cliques" stroke={secondaryColor} />
                  <Line yAxisId="right" type="monotone" dataKey="spend" name="Gasto" stroke="#F59E0B" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Campaigns Table */}
        {config.includeSections.campaignTable && displayCampaigns.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3" style={{ color: primaryColor }}>
              Campanhas
            </h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-black">Campanha</TableHead>
                  <TableHead className="text-black">Plataforma</TableHead>
                  <TableHead className="text-black text-right">Gasto</TableHead>
                  <TableHead className="text-black text-right">Orçamento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayCampaigns.slice(0, 10).map((campaign) => {
                  const campaignMetrics = metricsData?.find(m => m.campaign_id === campaign.id);
                  return (
                    <TableRow key={campaign.id}>
                      <TableCell className="font-medium text-black">{campaign.name}</TableCell>
                      <TableCell className="text-black">{campaign.ad_accounts?.provider || 'N/A'}</TableCell>
                      <TableCell className="text-right text-black">
                        R$ {(campaignMetrics?.spend || 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-black">
                        {campaign.budget ? `R$ ${campaign.budget.toFixed(2)}` : 'N/A'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Footer */}
        {template?.footer_text && (
          <div className="mt-8 pt-4 border-t text-center">
            <p className="text-xs text-gray-500">{template.footer_text}</p>
          </div>
        )}

        {/* Empty State */}
        {!hasAnySectionEnabled && (
          <div className="flex flex-col items-center justify-center py-12">
            <FileText className="h-16 w-16 text-gray-300 mb-4" />
            <p className="text-gray-500">Selecione pelo menos uma seção para incluir no relatório.</p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
};
