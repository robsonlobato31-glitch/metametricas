import { useState, useMemo } from 'react';
import { Calendar, Download, Building2, Megaphone, Target } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

const OBJECTIVE_LABELS: Record<string, string> = {
  REACH: 'Alcance',
  OUTCOME_TRAFFIC: 'Tráfego',
  OUTCOME_SALES: 'Vendas',
  OUTCOME_ENGAGEMENT: 'Engajamento',
  OUTCOME_LEADS: 'Leads',
  PAGE_LIKES: 'Curtidas na Página',
  VIDEO_VIEWS: 'Visualizações de Vídeo',
  LINK_CLICKS: 'Cliques no Link',
  CONVERSIONS: 'Conversões',
  POST_ENGAGEMENT: 'Engajamento no Post',
  LEAD_GENERATION: 'Geração de Leads',
  OUTCOME_AWARENESS: 'Reconhecimento',
  BRAND_AWARENESS: 'Reconhecimento de Marca',
  MESSAGES: 'Mensagens',
};

interface AdAccount {
  id: string;
  name: string;
  provider: string;
}

interface Campaign {
  id: string;
  name: string;
  accountId?: string;
  objective?: string;
}

interface ExportReportDialogProps {
  onExport: (config: ExportConfig) => void;
  isLoading?: boolean;
  availableAccounts?: AdAccount[];
  availableCampaigns?: Campaign[];
  availableObjectives?: string[];
}

export interface ExportConfig {
  period: '7' | '30' | '90';
  provider: 'all' | 'meta' | 'google';
  selectedAccountIds: string[];
  selectedCampaignIds: string[];
  selectedObjectives: string[];
  includeSections: {
    coverPage: boolean;
    metrics: boolean;
    metricsComparison: boolean;
    platformBreakdown: boolean;
    budgetChart: boolean;
    trendChart: boolean;
    platformPieChart: boolean;
    campaignTable: boolean;
    topCampaignsTable: boolean;
  };
  selectedMetrics: {
    impressions: boolean;
    clicks: boolean;
    ctr: boolean;
    cpc: boolean;
    spend: boolean;
    conversions: boolean;
    results: boolean;
    cost_per_result: boolean;
    messages: boolean;
    cost_per_message: boolean;
  };
}

export const ExportReportDialog = ({
  onExport,
  isLoading,
  availableAccounts = [],
  availableCampaigns = [],
  availableObjectives = [],
}: ExportReportDialogProps) => {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<ExportConfig>({
    period: '30',
    provider: 'all',
    selectedAccountIds: [],
    selectedCampaignIds: [],
    selectedObjectives: [],
    includeSections: {
      coverPage: true,
      metrics: true,
      metricsComparison: true,
      platformBreakdown: true,
      budgetChart: true,
      trendChart: true,
      platformPieChart: true,
      campaignTable: true,
      topCampaignsTable: true,
    },
    selectedMetrics: {
      impressions: true,
      clicks: true,
      ctr: true,
      cpc: true,
      spend: true,
      conversions: true,
      results: true,
      cost_per_result: true,
      messages: true,
      cost_per_message: true,
    },
  });

  // Filter accounts by provider
  const filteredAccounts = useMemo(() => {
    if (config.provider === 'all') return availableAccounts;
    return availableAccounts.filter((a) => a.provider === config.provider);
  }, [availableAccounts, config.provider]);

  // Filter campaigns by selected accounts, provider, and objectives
  const filteredCampaigns = useMemo(() => {
    let filtered = availableCampaigns;
    if (config.selectedAccountIds.length > 0) {
      filtered = filtered.filter((c) =>
        config.selectedAccountIds.includes(c.accountId || '')
      );
    }
    if (config.selectedObjectives.length > 0) {
      filtered = filtered.filter((c) =>
        c.objective && config.selectedObjectives.includes(c.objective)
      );
    }
    return filtered;
  }, [availableCampaigns, config.selectedAccountIds, config.selectedObjectives]);

  const handleObjectiveToggle = (objective: string) => {
    setConfig((prev) => {
      const isSelected = prev.selectedObjectives.includes(objective);
      return {
        ...prev,
        selectedObjectives: isSelected
          ? prev.selectedObjectives.filter((o) => o !== objective)
          : [...prev.selectedObjectives, objective],
        selectedCampaignIds: [],
      };
    });
  };

  const handleSelectAllObjectives = () => {
    setConfig((prev) => ({
      ...prev,
      selectedObjectives:
        prev.selectedObjectives.length === availableObjectives.length
          ? []
          : [...availableObjectives],
      selectedCampaignIds: [],
    }));
  };

  const handleAccountToggle = (accountId: string) => {
    setConfig((prev) => {
      const isSelected = prev.selectedAccountIds.includes(accountId);
      const newAccountIds = isSelected
        ? prev.selectedAccountIds.filter((id) => id !== accountId)
        : [...prev.selectedAccountIds, accountId];
      
      return {
        ...prev,
        selectedAccountIds: newAccountIds,
        selectedCampaignIds: [],
      };
    });
  };

  const handleCampaignToggle = (campaignId: string) => {
    setConfig((prev) => {
      const isSelected = prev.selectedCampaignIds.includes(campaignId);
      return {
        ...prev,
        selectedCampaignIds: isSelected
          ? prev.selectedCampaignIds.filter((id) => id !== campaignId)
          : [...prev.selectedCampaignIds, campaignId],
      };
    });
  };

  const handleSelectAllAccounts = () => {
    setConfig((prev) => ({
      ...prev,
      selectedAccountIds:
        prev.selectedAccountIds.length === filteredAccounts.length
          ? []
          : filteredAccounts.map((a) => a.id),
      selectedCampaignIds: [],
    }));
  };

  const handleSelectAllCampaigns = () => {
    setConfig((prev) => ({
      ...prev,
      selectedCampaignIds:
        prev.selectedCampaignIds.length === filteredCampaigns.length
          ? []
          : filteredCampaigns.map((c) => c.id),
    }));
  };

  const handleExport = () => {
    onExport(config);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Exportar Relatório
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Configurar Relatório PDF</DialogTitle>
          <DialogDescription>
            Escolha as opções para personalizar seu relatório.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="period">
                <Calendar className="inline mr-2 h-4 w-4" />
                Período
              </Label>
              <Select
                value={config.period}
                onValueChange={(value: '7' | '30' | '90') =>
                  setConfig({ ...config, period: value })
                }
              >
                <SelectTrigger id="period">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="90">Últimos 90 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="provider">Plataforma</Label>
              <Select
                value={config.provider}
                onValueChange={(value: 'all' | 'meta' | 'google') =>
                  setConfig({
                    ...config,
                    provider: value,
                    selectedAccountIds: [],
                    selectedCampaignIds: [],
                  })
                }
              >
                <SelectTrigger id="provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="meta">Meta Ads</SelectItem>
                  <SelectItem value="google">Google Ads</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Account Selection */}
            {filteredAccounts.length > 0 && (
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label>
                    <Building2 className="inline mr-2 h-4 w-4" />
                    Contas ({config.selectedAccountIds.length === 0 ? 'Todas' : config.selectedAccountIds.length})
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={handleSelectAllAccounts}
                  >
                    {config.selectedAccountIds.length === filteredAccounts.length
                      ? 'Desmarcar todas'
                      : 'Selecionar todas'}
                  </Button>
                </div>
                <div className="border rounded-md p-2 max-h-[120px] overflow-y-auto space-y-1">
                  {filteredAccounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center space-x-2 py-1"
                    >
                      <Checkbox
                        id={`account-${account.id}`}
                        checked={config.selectedAccountIds.includes(account.id)}
                        onCheckedChange={() => handleAccountToggle(account.id)}
                      />
                      <label
                        htmlFor={`account-${account.id}`}
                        className="text-sm font-medium leading-none cursor-pointer truncate flex-1"
                      >
                        {account.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Objective Selection */}
            {availableObjectives.length > 0 && (
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label>
                    <Target className="inline mr-2 h-4 w-4" />
                    Objetivos ({config.selectedObjectives.length === 0 ? 'Todos' : config.selectedObjectives.length})
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={handleSelectAllObjectives}
                  >
                    {config.selectedObjectives.length === availableObjectives.length
                      ? 'Desmarcar todos'
                      : 'Selecionar todos'}
                  </Button>
                </div>
                <div className="border rounded-md p-2 max-h-[120px] overflow-y-auto space-y-1">
                  {availableObjectives.map((objective) => (
                    <div
                      key={objective}
                      className="flex items-center space-x-2 py-1"
                    >
                      <Checkbox
                        id={`objective-${objective}`}
                        checked={config.selectedObjectives.includes(objective)}
                        onCheckedChange={() => handleObjectiveToggle(objective)}
                      />
                      <label
                        htmlFor={`objective-${objective}`}
                        className="text-sm font-medium leading-none cursor-pointer truncate flex-1"
                      >
                        {OBJECTIVE_LABELS[objective] || objective}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Campaign Selection */}
            {filteredCampaigns.length > 0 && (
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label>
                    <Megaphone className="inline mr-2 h-4 w-4" />
                    Campanhas ({config.selectedCampaignIds.length === 0 ? 'Todas' : config.selectedCampaignIds.length})
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={handleSelectAllCampaigns}
                  >
                    {config.selectedCampaignIds.length === filteredCampaigns.length
                      ? 'Desmarcar todas'
                      : 'Selecionar todas'}
                  </Button>
                </div>
                <div className="border rounded-md p-2 max-h-[120px] overflow-y-auto space-y-1">
                  {filteredCampaigns.map((campaign) => (
                    <div
                      key={campaign.id}
                      className="flex items-center space-x-2 py-1"
                    >
                      <Checkbox
                        id={`campaign-${campaign.id}`}
                        checked={config.selectedCampaignIds.includes(campaign.id)}
                        onCheckedChange={() => handleCampaignToggle(campaign.id)}
                      />
                      <label
                        htmlFor={`campaign-${campaign.id}`}
                        className="text-sm font-medium leading-none cursor-pointer truncate flex-1"
                      >
                        {campaign.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-3">
              <Label>Seções a Incluir</Label>
              <div className="space-y-2">
                {[
                  { key: 'coverPage', label: 'Página de Capa' },
                  { key: 'metrics', label: 'Resumo de Métricas' },
                  { key: 'metricsComparison', label: 'Comparativo com Período Anterior' },
                  { key: 'platformBreakdown', label: 'Resultados por Plataforma' },
                  { key: 'budgetChart', label: 'Gráfico de Orçamento' },
                  { key: 'trendChart', label: 'Gráfico de Evolução' },
                  { key: 'platformPieChart', label: 'Gráfico de Distribuição (Pizza)' },
                  { key: 'topCampaignsTable', label: 'Principais Campanhas (Detalhada)' },
                  { key: 'campaignTable', label: 'Tabela de Campanhas' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center space-x-2">
                    <Checkbox
                      id={key}
                      checked={config.includeSections[key as keyof typeof config.includeSections]}
                      onCheckedChange={(checked) =>
                        setConfig({
                          ...config,
                          includeSections: {
                            ...config.includeSections,
                            [key]: !!checked,
                          },
                        })
                      }
                    />
                    <label
                      htmlFor={key}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3">
              <Label>Métricas a Incluir</Label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries({
                  impressions: 'Impressões',
                  clicks: 'Cliques',
                  ctr: 'CTR',
                  cpc: 'CPC',
                  spend: 'Gasto',
                  conversions: 'Conversões',
                  results: 'Resultados',
                  cost_per_result: 'Custo/Resultado',
                  messages: 'Mensagens',
                  cost_per_message: 'Custo/Mensagem',
                }).map(([key, label]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <Checkbox
                      id={`metric-${key}`}
                      checked={config.selectedMetrics[key as keyof typeof config.selectedMetrics]}
                      onCheckedChange={(checked) =>
                        setConfig({
                          ...config,
                          selectedMetrics: {
                            ...config.selectedMetrics,
                            [key]: !!checked,
                          },
                        })
                      }
                    />
                    <label
                      htmlFor={`metric-${key}`}
                      className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleExport} disabled={isLoading}>
            <Download className="mr-2 h-4 w-4" />
            {isLoading ? 'Gerando...' : 'Exportar PDF'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
