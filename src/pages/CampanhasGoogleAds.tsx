import { useState } from 'react';
import { useGoogleAdsCampaigns } from '@/hooks/useGoogleAdsCampaigns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/DateRangePicker';
import { Loader2, Search, Filter, TrendingUp, MousePointer, DollarSign, Eye } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { addDays } from 'date-fns';

export default function CampanhasGoogleAds() {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
        from: addDays(new Date(), -30),
        to: new Date(),
    });

    const { data: campaigns, isLoading } = useGoogleAdsCampaigns({
        search,
        status: statusFilter,
        dateRange,
    });

    // Calcular métricas agregadas
    const totalSpend = campaigns?.reduce((acc, c) =>
        acc + c.metrics.reduce((mAcc, m) => mAcc + m.spend, 0), 0) || 0;

    const totalImpressions = campaigns?.reduce((acc, c) =>
        acc + c.metrics.reduce((mAcc, m) => mAcc + m.impressions, 0), 0) || 0;

    const totalClicks = campaigns?.reduce((acc, c) =>
        acc + c.metrics.reduce((mAcc, m) => mAcc + m.clicks, 0), 0) || 0;

    const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Campanhas Google Ads</h1>
                    <p className="text-muted-foreground">
                        Gerencie e monitore suas campanhas do Google Ads
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <DateRangePicker 
                        dateRange={dateRange}
                        onDateRangeChange={(range) => setDateRange({
                            from: range?.from || new Date(),
                            to: range?.to || new Date()
                        })}
                    />
                </div>
            </div>

            {/* Cards de Resumo */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Gasto Total</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totalSpend)}</div>
                        <p className="text-xs text-muted-foreground">
                            No período selecionado
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Impressões</CardTitle>
                        <Eye className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalImpressions.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Cliques</CardTitle>
                        <MousePointer className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalClicks.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">CTR Médio</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{avgCtr.toFixed(2)}%</div>
                    </CardContent>
                </Card>
            </div>

            {/* Filtros */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <div className="relative flex-1 md:max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar campanhas..."
                        className="pl-8"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                        <Filter className="mr-2 h-4 w-4" />
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos os Status</SelectItem>
                        <SelectItem value="ACTIVE">Ativas</SelectItem>
                        <SelectItem value="PAUSED">Pausadas</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Lista de Campanhas */}
            <Card>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex items-center justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : campaigns?.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-8 text-center">
                            <p className="text-muted-foreground">Nenhuma campanha encontrada</p>
                            <Button variant="link" className="mt-2">
                                Sincronizar Agora
                            </Button>
                        </div>
                    ) : (
                        <div className="relative w-full overflow-auto">
                            <table className="w-full caption-bottom text-sm">
                                <thead className="[&_tr]:border-b">
                                    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Campanha</th>
                                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                                        <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Budget Diário</th>
                                        <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Gasto</th>
                                        <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Impr.</th>
                                        <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Cliques</th>
                                        <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">CTR</th>
                                        <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">CPC Médio</th>
                                    </tr>
                                </thead>
                                <tbody className="[&_tr:last-child]:border-0">
                                    {campaigns?.map((campaign) => {
                                        // Métricas da campanha no período
                                        const campaignSpend = campaign.metrics.reduce((acc, m) => acc + m.spend, 0);
                                        const campaignImpressions = campaign.metrics.reduce((acc, m) => acc + m.impressions, 0);
                                        const campaignClicks = campaign.metrics.reduce((acc, m) => acc + m.clicks, 0);
                                        const campaignCtr = campaignImpressions > 0 ? (campaignClicks / campaignImpressions) * 100 : 0;
                                        const campaignCpc = campaignClicks > 0 ? campaignSpend / campaignClicks : 0;

                                        return (
                                            <tr key={campaign.id} className="border-b transition-colors hover:bg-muted/50">
                                                <td className="p-4 align-middle font-medium">
                                                    <div className="flex flex-col">
                                                        <span>{campaign.name}</span>
                                                        <span className="text-xs text-muted-foreground">{campaign.ad_accounts.account_name}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 align-middle">
                                                    <Badge
                                                        variant={campaign.status === 'ACTIVE' ? 'default' : 'secondary'}
                                                        className={campaign.status === 'ACTIVE' ? 'bg-green-500 hover:bg-green-600' : ''}
                                                    >
                                                        {campaign.status === 'ACTIVE' ? 'Ativa' : 'Pausada'}
                                                    </Badge>
                                                </td>
                                                <td className="p-4 align-middle text-right">
                                                    {campaign.daily_budget ? formatCurrency(campaign.daily_budget) : '-'}
                                                </td>
                                                <td className="p-4 align-middle text-right font-medium">
                                                    {formatCurrency(campaignSpend)}
                                                </td>
                                                <td className="p-4 align-middle text-right">
                                                    {campaignImpressions.toLocaleString()}
                                                </td>
                                                <td className="p-4 align-middle text-right">
                                                    {campaignClicks.toLocaleString()}
                                                </td>
                                                <td className="p-4 align-middle text-right">
                                                    {campaignCtr.toFixed(2)}%
                                                </td>
                                                <td className="p-4 align-middle text-right">
                                                    {formatCurrency(campaignCpc)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
