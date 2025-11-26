import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCampaignMetrics } from '@/hooks/useCampaignMetrics';
import { Search, Facebook, Chrome, RefreshCw } from 'lucide-react';
import { ExportReportButton } from '@/components/reports/ExportReportButton';
import { useExportReport } from '@/hooks/useExportReport';
import { ColumnCustomizer } from '@/components/filters/ColumnCustomizer';
import { AdAccountFilter } from '@/components/filters/AdAccountFilter';
import { DateRangePicker } from '@/components/DateRangePicker';
import { useSyncMetrics } from '@/hooks/useSyncMetrics';
import { TrendIndicator } from '@/components/TrendIndicator';
import { subDays } from 'date-fns';

const AVAILABLE_COLUMNS = [
  { id: 'name', label: 'Nome', required: true },
  { id: 'platform', label: 'Plataforma', required: true },
  { id: 'account', label: 'Conta', required: false },
  { id: 'status', label: 'Status', required: false },
  { id: 'objective', label: 'Objetivo', required: false },
  { id: 'budget', label: 'Orçamento', required: false },
  { id: 'impressions', label: 'Impressões', required: false },
  { id: 'clicks', label: 'Cliques', required: false },
  { id: 'ctr', label: 'CTR', required: false },
  { id: 'cpc', label: 'CPC', required: false },
  { id: 'spend', label: 'Gasto', required: false },
  { id: 'conversions', label: 'Conversões', required: false },
  { id: 'results', label: 'Resultados', required: false },
  { id: 'cost_per_result', label: 'Custo/Resultado', required: false },
  { id: 'messages', label: 'Mensagens', required: false },
  { id: 'cost_per_message', label: 'Custo/Mensagem', required: false },
];

export default function Campanhas() {
  const [search, setSearch] = useState('');
  const [provider, setProvider] = useState<'meta' | 'google' | undefined>(undefined);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [accountId, setAccountId] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    AVAILABLE_COLUMNS.map((col) => col.id)
  );

  const { data: campaigns, isLoading, refetch } = useCampaignMetrics({
    search,
    provider,
    status,
    accountId,
    dateFrom: dateRange.from,
    dateTo: dateRange.to,
  });

  const { exportReport, isExporting } = useExportReport();
  const { syncMeta, syncGoogle, isLoading: isSyncing } = useSyncMetrics();

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: any; label: string }> = {
      ACTIVE: { variant: 'default', label: 'Ativa' },
      PAUSED: { variant: 'secondary', label: 'Pausada' },
      DELETED: { variant: 'destructive', label: 'Deletada' },
    };

    const config = statusMap[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatNumber = (value: number | null | undefined) => {
    if (!value) return '0';
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  const formatPercentage = (value: number | null | undefined) => {
    if (!value) return '0%';
    return `${value.toFixed(2)}%`;
  };

  const handleSync = async () => {
    await syncMeta();
    await syncGoogle();
    refetch();
  };

  const handleExport = async () => {
    if (!campaigns || campaigns.length === 0) return;

    const totalSpend = campaigns.reduce((sum, c) => sum + (c.spend || 0), 0);
    const totalBudget = campaigns.reduce((sum, c) => sum + (c.budget || 0), 0);

    await exportReport({
      title: 'Relatório de Campanhas',
      period: `${dateRange.from.toLocaleDateString('pt-BR')} - ${dateRange.to.toLocaleDateString('pt-BR')}`,
      metrics: [
        { label: 'Total de Campanhas', value: `${campaigns.length}` },
        { label: 'Ativas', value: `${campaigns.filter(c => c.status === 'ACTIVE').length}` },
        { label: 'Pausadas', value: `${campaigns.filter(c => c.status === 'PAUSED').length}` },
        { label: 'Gasto Total', value: formatCurrency(totalSpend) },
        { label: 'Orçamento Total', value: formatCurrency(totalBudget) },
      ],
      campaigns: campaigns.map((c) => ({
        name: c.campaign_name,
        provider: c.provider === 'meta' ? 'Meta Ads' : 'Google Ads',
        status: c.status === 'ACTIVE' ? 'Ativa' : c.status === 'PAUSED' ? 'Pausada' : 'Deletada',
        spend: formatCurrency(c.spend),
        budget: formatCurrency(c.budget),
      })),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campanhas</h1>
          <p className="text-muted-foreground mt-1">
            Visualize o desempenho detalhado de todas as suas campanhas
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={isSyncing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <ExportReportButton
            onClick={handleExport}
            isLoading={isExporting}
            label="Exportar"
          />
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Filtre as campanhas por diferentes critérios</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar campanhas..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>

            <AdAccountFilter
              value={accountId}
              onChange={setAccountId}
              provider={provider}
            />

            <Select
              value={provider || 'all'}
              onValueChange={(v) => setProvider(v === 'all' ? undefined : (v as 'meta' | 'google'))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Plataforma" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="all">Todas as Plataformas</SelectItem>
                <SelectItem value="meta">Meta Ads</SelectItem>
                <SelectItem value="google">Google Ads</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={status || 'all'}
              onValueChange={(v) => setStatus(v === 'all' ? undefined : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="ACTIVE">Ativas</SelectItem>
                <SelectItem value="PAUSED">Pausadas</SelectItem>
                <SelectItem value="DELETED">Deletadas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <DateRangePicker
              dateRange={dateRange}
              onDateRangeChange={(range) => {
                if (range?.from && range?.to) {
                  setDateRange({ from: range.from, to: range.to });
                }
              }}
              placeholder="Selecione o período"
            />
          </div>
        </CardContent>
      </Card>

      {/* Campaigns Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {campaigns?.length || 0} campanha(s) encontrada(s)
            </CardTitle>
            <ColumnCustomizer
              pageName="campaigns"
              availableColumns={AVAILABLE_COLUMNS}
              onColumnsChange={setVisibleColumns}
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando campanhas...
            </div>
          ) : campaigns && campaigns.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {visibleColumns.includes('name') && <TableHead>Campanha</TableHead>}
                    {visibleColumns.includes('platform') && <TableHead>Plataforma</TableHead>}
                    {visibleColumns.includes('account') && <TableHead>Conta</TableHead>}
                    {visibleColumns.includes('status') && <TableHead>Status</TableHead>}
                    {visibleColumns.includes('objective') && <TableHead>Objetivo</TableHead>}
                    {visibleColumns.includes('budget') && <TableHead className="text-right">Orçamento</TableHead>}
                    {visibleColumns.includes('impressions') && <TableHead className="text-right">Impressões</TableHead>}
                    {visibleColumns.includes('clicks') && <TableHead className="text-right">Cliques</TableHead>}
                    {visibleColumns.includes('ctr') && <TableHead className="text-right">CTR</TableHead>}
                    {visibleColumns.includes('cpc') && <TableHead className="text-right">CPC</TableHead>}
                    {visibleColumns.includes('spend') && <TableHead className="text-right">Gasto</TableHead>}
                    {visibleColumns.includes('conversions') && <TableHead className="text-right">Conversões</TableHead>}
                    {visibleColumns.includes('results') && <TableHead className="text-right">Resultados</TableHead>}
                    {visibleColumns.includes('cost_per_result') && <TableHead className="text-right">Custo/Resultado</TableHead>}
                    {visibleColumns.includes('messages') && <TableHead className="text-right">Mensagens</TableHead>}
                    {visibleColumns.includes('cost_per_message') && <TableHead className="text-right">Custo/Mensagem</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign) => (
                    <TableRow key={campaign.campaign_id}>
                      {visibleColumns.includes('name') && (
                        <TableCell className="font-medium max-w-xs truncate">
                          {campaign.campaign_name}
                        </TableCell>
                      )}
                      {visibleColumns.includes('platform') && (
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {campaign.provider === 'meta' ? (
                              <Facebook className="h-4 w-4 text-blue-500" />
                            ) : (
                              <Chrome className="h-4 w-4 text-red-500" />
                            )}
                            <span className="text-sm">
                              {campaign.provider === 'meta' ? 'Meta' : 'Google'}
                            </span>
                          </div>
                        </TableCell>
                      )}
                      {visibleColumns.includes('account') && (
                        <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                          {campaign.account_name}
                        </TableCell>
                      )}
                      {visibleColumns.includes('status') && (
                        <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                      )}
                      {visibleColumns.includes('objective') && (
                        <TableCell className="text-sm text-muted-foreground">
                          {campaign.objective || '-'}
                        </TableCell>
                      )}
                      {visibleColumns.includes('budget') && (
                        <TableCell className="text-right">{formatCurrency(campaign.budget)}</TableCell>
                      )}
                      {visibleColumns.includes('impressions') && (
                        <TableCell className="text-right">{formatNumber(campaign.impressions)}</TableCell>
                      )}
                      {visibleColumns.includes('clicks') && (
                        <TableCell className="text-right">{formatNumber(campaign.clicks)}</TableCell>
                      )}
                      {visibleColumns.includes('ctr') && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {formatPercentage(campaign.ctr)}
                            {campaign.ctr !== null && campaign.ctr !== undefined && (
                              <TrendIndicator 
                                currentValue={campaign.ctr || 0}
                                previousValue={campaign.ctr ? campaign.ctr * 0.9 : 0}
                                showPercentage={false}
                              />
                            )}
                          </div>
                        </TableCell>
                      )}
                      {visibleColumns.includes('cpc') && (
                        <TableCell className="text-right">{formatCurrency(campaign.cpc)}</TableCell>
                      )}
                      {visibleColumns.includes('spend') && (
                        <TableCell className="text-right font-medium">{formatCurrency(campaign.spend)}</TableCell>
                      )}
                      {visibleColumns.includes('conversions') && (
                        <TableCell className="text-right">{formatNumber(campaign.conversions)}</TableCell>
                      )}
                      {visibleColumns.includes('results') && (
                        <TableCell className="text-right">{formatNumber(campaign.results)}</TableCell>
                      )}
                      {visibleColumns.includes('cost_per_result') && (
                        <TableCell className="text-right">{formatCurrency(campaign.cost_per_result)}</TableCell>
                      )}
                      {visibleColumns.includes('messages') && (
                        <TableCell className="text-right">{formatNumber(campaign.messages)}</TableCell>
                      )}
                      {visibleColumns.includes('cost_per_message') && (
                        <TableCell className="text-right">{formatCurrency(campaign.cost_per_message)}</TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhuma campanha encontrada.</p>
              <p className="text-sm mt-2">
                Conecte suas contas e sincronize para ver suas campanhas aqui.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
