import { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
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
import { useCampaigns } from '@/hooks/useCampaigns';
import { Search, Facebook, Chrome } from 'lucide-react';
import { ExportReportButton } from '@/components/reports/ExportReportButton';
import { useExportReport } from '@/hooks/useExportReport';

export default function Campanhas() {
  const [search, setSearch] = useState('');
  const [provider, setProvider] = useState<'meta' | 'google' | 'all'>('all');
  const [status, setStatus] = useState<string>('all');

  const { data: campaigns, isLoading } = useCampaigns({
    provider: provider === 'all' ? undefined : provider,
    status: status === 'all' ? undefined : status,
    search,
  });

  const { exportReport, isExporting } = useExportReport();

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: any; label: string }> = {
      ACTIVE: { variant: 'default', label: 'Ativa' },
      PAUSED: { variant: 'secondary', label: 'Pausada' },
      DELETED: { variant: 'destructive', label: 'Deletada' },
    };

    const config = statusMap[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleExport = async () => {
    if (!campaigns || campaigns.length === 0) return;

    const totalBudget = campaigns.reduce(
      (sum, c) => sum + (c.daily_budget || c.lifetime_budget || 0),
      0
    );

    await exportReport({
      title: 'Relatório de Campanhas',
      period: 'Todas as campanhas',
      metrics: [
        { label: 'Total de Campanhas', value: `${campaigns.length}` },
        { label: 'Ativas', value: `${campaigns.filter(c => c.status === 'ACTIVE').length}` },
        { label: 'Pausadas', value: `${campaigns.filter(c => c.status === 'PAUSED').length}` },
        { label: 'Orçamento Total', value: formatCurrency(totalBudget) },
      ],
      campaigns: campaigns.map((c) => ({
        name: c.name,
        provider: c.ad_accounts.provider === 'meta' ? 'Meta Ads' : 'Google Ads',
        status: c.status === 'ACTIVE' ? 'Ativa' : c.status === 'PAUSED' ? 'Pausada' : 'Deletada',
        spend: '-',
        budget: formatCurrency(c.daily_budget || c.lifetime_budget),
      })),
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Campanhas</h1>
            <p className="text-muted-foreground mt-1">
              Visualize e gerencie todas as suas campanhas
            </p>
          </div>
          <ExportReportButton 
            onClick={handleExport} 
            isLoading={isExporting}
            label="Exportar Campanhas"
          />
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
            <CardDescription>Filtre as campanhas por diferentes critérios</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar campanhas..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>

              <Select value={provider} onValueChange={(v: any) => setProvider(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Plataforma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Plataformas</SelectItem>
                  <SelectItem value="meta">Meta Ads</SelectItem>
                  <SelectItem value="google">Google Ads</SelectItem>
                </SelectContent>
              </Select>

              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="ACTIVE">Ativas</SelectItem>
                  <SelectItem value="PAUSED">Pausadas</SelectItem>
                  <SelectItem value="DELETED">Deletadas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Campaigns Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              {campaigns?.length || 0} campanha(s) encontrada(s)
            </CardTitle>
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
                      <TableHead>Nome</TableHead>
                      <TableHead>Plataforma</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Objetivo</TableHead>
                      <TableHead className="text-right">Orçamento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaigns.map((campaign) => (
                      <TableRow key={campaign.id}>
                        <TableCell className="font-medium">{campaign.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {campaign.ad_accounts.provider === 'meta' ? (
                              <Facebook className="h-4 w-4 text-blue-500" />
                            ) : (
                              <Chrome className="h-4 w-4 text-red-500" />
                            )}
                            <span className="text-sm">
                              {campaign.ad_accounts.provider === 'meta' ? 'Meta' : 'Google'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {campaign.objective || '-'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(campaign.daily_budget || campaign.lifetime_budget)}
                        </TableCell>
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
    </DashboardLayout>
  );
}
