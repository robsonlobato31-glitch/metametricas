import { useState, useMemo } from 'react';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  FileText,
  Download,
  Plus,
  Settings2,
  Trash2,
  Play,
  Save,
  Calendar,
  Building2,
  Megaphone,
  Target,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAdAccounts } from '@/hooks/useAdAccounts';
import { useCampaigns } from '@/hooks/useCampaigns';
import { useSavedReportTemplates, SavedReportTemplate } from '@/hooks/useSavedReportTemplates';
import { useExportReport } from '@/hooks/useExportReport';
import { useCampaignMetrics } from '@/hooks/useCampaignMetrics';
import { ExportCharts } from '@/components/reports/ExportCharts';
import { ReportTemplateSettings } from '@/components/settings/ReportTemplateSettings';
import type { ExportConfig } from '@/components/reports/ExportReportDialog';

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

const DEFAULT_CONFIG: ExportConfig = {
  period: '30',
  provider: 'all',
  selectedAccountIds: [],
  selectedCampaignIds: [],
  selectedObjectives: [],
  includeSections: {
    metrics: true,
    budgetChart: true,
    trendChart: true,
    campaignTable: true,
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
};

const Relatorios = () => {
  const [config, setConfig] = useState<ExportConfig>(DEFAULT_CONFIG);
  const [showCharts, setShowCharts] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<SavedReportTemplate | null>(null);

  const { data: adAccounts } = useAdAccounts();
  const { data: campaigns } = useCampaigns();
  const { templates, isLoading: templatesLoading, createTemplate, updateTemplate, deleteTemplate } = useSavedReportTemplates();
  const { exportReport, isExporting } = useExportReport();
  const { data: metricsData } = useCampaignMetrics();

  // Get unique objectives from campaigns
  const availableObjectives = useMemo(() => {
    if (!campaigns) return [];
    const objectives = new Set<string>();
    campaigns.forEach((c) => {
      if (c.objective) objectives.add(c.objective);
    });
    return Array.from(objectives);
  }, [campaigns]);

  // Filter accounts by provider
  const filteredAccounts = useMemo(() => {
    if (!adAccounts) return [];
    if (config.provider === 'all') return adAccounts;
    return adAccounts.filter((a) => a.provider === config.provider);
  }, [adAccounts, config.provider]);

  // Filter campaigns by selected accounts, provider, and objectives
  const filteredCampaigns = useMemo(() => {
    if (!campaigns) return [];
    let filtered = campaigns;
    
    if (config.provider !== 'all') {
      filtered = filtered.filter((c) => c.ad_accounts?.provider === config.provider);
    }
    
    if (config.selectedAccountIds.length > 0) {
      filtered = filtered.filter((c) =>
        config.selectedAccountIds.includes(c.ad_account_id)
      );
    }
    
    if (config.selectedObjectives.length > 0) {
      filtered = filtered.filter((c) =>
        c.objective && config.selectedObjectives.includes(c.objective)
      );
    }
    
    return filtered;
  }, [campaigns, config.provider, config.selectedAccountIds, config.selectedObjectives]);

  const handleAccountToggle = (accountId: string) => {
    setConfig((prev) => {
      const isSelected = prev.selectedAccountIds.includes(accountId);
      return {
        ...prev,
        selectedAccountIds: isSelected
          ? prev.selectedAccountIds.filter((id) => id !== accountId)
          : [...prev.selectedAccountIds, accountId],
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

  const handleExport = async () => {
    // Show charts for capture
    setShowCharts(true);
    
    // Wait for charts to render
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    const days = parseInt(config.period);
    const dateFrom = subDays(new Date(), days);
    const dateTo = new Date();
    const periodText = `${format(dateFrom, 'dd/MM/yyyy', { locale: ptBR })} - ${format(dateTo, 'dd/MM/yyyy', { locale: ptBR })}`;

    // Filter campaigns for export
    let exportCampaigns = filteredCampaigns;
    if (config.selectedCampaignIds.length > 0) {
      exportCampaigns = exportCampaigns.filter((c) =>
        config.selectedCampaignIds.includes(c.campaign_id)
      );
    }

    // Calculate metrics
    const metrics: Array<{ label: string; value: string }> = [];
    if (config.selectedMetrics.impressions) {
      const total = metricsData?.reduce((acc, m) => acc + (m.impressions || 0), 0) || 0;
      metrics.push({ label: 'Impressões', value: total.toLocaleString('pt-BR') });
    }
    if (config.selectedMetrics.clicks) {
      const total = metricsData?.reduce((acc, m) => acc + (m.clicks || 0), 0) || 0;
      metrics.push({ label: 'Cliques', value: total.toLocaleString('pt-BR') });
    }
    if (config.selectedMetrics.spend) {
      const total = metricsData?.reduce((acc, m) => acc + (m.spend || 0), 0) || 0;
      metrics.push({ label: 'Gasto Total', value: `R$ ${total.toFixed(2)}` });
    }
    if (config.selectedMetrics.results) {
      const total = metricsData?.reduce((acc, m) => acc + (m.results || 0), 0) || 0;
      metrics.push({ label: 'Resultados', value: total.toLocaleString('pt-BR') });
    }
    if (config.selectedMetrics.messages) {
      const total = metricsData?.reduce((acc, m) => acc + (m.messages || 0), 0) || 0;
      metrics.push({ label: 'Mensagens', value: total.toLocaleString('pt-BR') });
    }

    await exportReport({
      title: 'Relatório de Campanhas',
      period: periodText,
      metrics,
      campaigns: exportCampaigns.map((c) => ({
        name: c.name,
        provider: c.ad_accounts?.provider || 'N/A',
        status: c.status,
        spend: `R$ ${(metricsData?.find((m) => m.campaign_id === c.id)?.spend || 0).toFixed(2)}`,
        budget: c.budget ? `R$ ${c.budget.toFixed(2)}` : 'N/A',
      })),
      chartIds: {
        budgetChart: config.includeSections.budgetChart ? 'budget-chart' : undefined,
        trendChart: config.includeSections.trendChart ? 'trend-chart' : undefined,
      },
    });

    setShowCharts(false);
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) return;
    
    if (editingTemplate) {
      await updateTemplate.mutateAsync({
        id: editingTemplate.id,
        name: templateName,
        description: templateDescription,
        config,
      });
    } else {
      await createTemplate.mutateAsync({
        name: templateName,
        description: templateDescription,
        config,
      });
    }
    
    setSaveDialogOpen(false);
    setTemplateName('');
    setTemplateDescription('');
    setEditingTemplate(null);
  };

  const handleApplyTemplate = (template: SavedReportTemplate) => {
    setConfig(template.config);
  };

  const handleEditTemplate = (template: SavedReportTemplate) => {
    setEditingTemplate(template);
    setTemplateName(template.name);
    setTemplateDescription(template.description || '');
    setConfig(template.config);
    setSaveDialogOpen(true);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
          <p className="text-muted-foreground">
            Gere e gerencie relatórios personalizados de campanhas
          </p>
        </div>
        <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" onClick={() => setEditingTemplate(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Template
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? 'Editar Template' : 'Salvar Template'}
              </DialogTitle>
              <DialogDescription>
                Salve a configuração atual como um template reutilizável.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nome do Template</Label>
                <Input
                  id="name"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Ex: Relatório Mensal Meta Ads"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Textarea
                  id="description"
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  placeholder="Descreva o propósito deste template..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSaveTemplate}
                disabled={!templateName.trim() || createTemplate.isPending || updateTemplate.isPending}
              >
                <Save className="mr-2 h-4 w-4" />
                {editingTemplate ? 'Atualizar' : 'Salvar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Configuration Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Configurar Relatório
            </CardTitle>
            <CardDescription>
              Escolha as opções para personalizar seu relatório PDF.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] pr-4">
              <div className="grid gap-4">
                {/* Period */}
                <div className="grid gap-2">
                  <Label>
                    <Calendar className="inline mr-2 h-4 w-4" />
                    Período
                  </Label>
                  <Select
                    value={config.period}
                    onValueChange={(value: '7' | '30' | '90') =>
                      setConfig({ ...config, period: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">Últimos 7 dias</SelectItem>
                      <SelectItem value="30">Últimos 30 dias</SelectItem>
                      <SelectItem value="90">Últimos 90 dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Provider */}
                <div className="grid gap-2">
                  <Label>Plataforma</Label>
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
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="meta">Meta Ads</SelectItem>
                      <SelectItem value="google">Google Ads</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Accounts */}
                {filteredAccounts.length > 0 && (
                  <div className="grid gap-2">
                    <Label>
                      <Building2 className="inline mr-2 h-4 w-4" />
                      Contas ({config.selectedAccountIds.length === 0 ? 'Todas' : config.selectedAccountIds.length})
                    </Label>
                    <div className="border rounded-md p-2 max-h-[120px] overflow-y-auto space-y-1">
                      {filteredAccounts.map((account) => (
                        <div key={account.id} className="flex items-center space-x-2 py-1">
                          <Checkbox
                            id={`account-${account.id}`}
                            checked={config.selectedAccountIds.includes(account.id)}
                            onCheckedChange={() => handleAccountToggle(account.id)}
                          />
                          <label
                            htmlFor={`account-${account.id}`}
                            className="text-sm font-medium cursor-pointer truncate flex-1"
                          >
                            {account.account_name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Objectives */}
                {availableObjectives.length > 0 && (
                  <div className="grid gap-2">
                    <Label>
                      <Target className="inline mr-2 h-4 w-4" />
                      Objetivos ({config.selectedObjectives.length === 0 ? 'Todos' : config.selectedObjectives.length})
                    </Label>
                    <div className="border rounded-md p-2 max-h-[120px] overflow-y-auto space-y-1">
                      {availableObjectives.map((objective) => (
                        <div key={objective} className="flex items-center space-x-2 py-1">
                          <Checkbox
                            id={`objective-${objective}`}
                            checked={config.selectedObjectives.includes(objective)}
                            onCheckedChange={() => handleObjectiveToggle(objective)}
                          />
                          <label
                            htmlFor={`objective-${objective}`}
                            className="text-sm font-medium cursor-pointer truncate flex-1"
                          >
                            {OBJECTIVE_LABELS[objective] || objective}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Campaigns */}
                {filteredCampaigns.length > 0 && (
                  <div className="grid gap-2">
                    <Label>
                      <Megaphone className="inline mr-2 h-4 w-4" />
                      Campanhas ({config.selectedCampaignIds.length === 0 ? 'Todas' : config.selectedCampaignIds.length})
                    </Label>
                    <div className="border rounded-md p-2 max-h-[120px] overflow-y-auto space-y-1">
                      {filteredCampaigns.map((campaign) => (
                        <div key={campaign.id} className="flex items-center space-x-2 py-1">
                          <Checkbox
                            id={`campaign-${campaign.id}`}
                            checked={config.selectedCampaignIds.includes(campaign.campaign_id)}
                            onCheckedChange={() => handleCampaignToggle(campaign.campaign_id)}
                          />
                          <label
                            htmlFor={`campaign-${campaign.id}`}
                            className="text-sm font-medium cursor-pointer truncate flex-1"
                          >
                            {campaign.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Sections */}
                <div className="grid gap-3">
                  <Label>Seções a Incluir</Label>
                  <div className="space-y-2">
                    {[
                      { key: 'metrics', label: 'Resumo de Métricas' },
                      { key: 'budgetChart', label: 'Gráfico de Orçamento' },
                      { key: 'trendChart', label: 'Gráfico de Evolução' },
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
                        <label htmlFor={key} className="text-sm font-medium cursor-pointer">
                          {label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Metrics */}
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
                        <label htmlFor={`metric-${key}`} className="text-xs font-medium cursor-pointer">
                          {label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>

            <div className="flex gap-2 mt-4 pt-4 border-t">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setEditingTemplate(null);
                  setTemplateName('');
                  setTemplateDescription('');
                  setSaveDialogOpen(true);
                }}
              >
                <Save className="mr-2 h-4 w-4" />
                Salvar Template
              </Button>
              <Button className="flex-1" onClick={handleExport} disabled={isExporting}>
                <Download className="mr-2 h-4 w-4" />
                {isExporting ? 'Gerando...' : 'Exportar PDF'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Templates Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Templates Salvos
            </CardTitle>
            <CardDescription>
              Reutilize configurações de exportação salvas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              {templatesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : templates && templates.length > 0 ? (
                <div className="space-y-3">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{template.name}</h4>
                        {template.description && (
                          <p className="text-sm text-muted-foreground truncate">
                            {template.description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(template.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleApplyTemplate(template)}
                          title="Aplicar template"
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditTemplate(template)}
                          title="Editar template"
                        >
                          <Settings2 className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" title="Excluir template">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir template?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. O template "{template.name}" será excluído permanentemente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteTemplate.mutate(template.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">Nenhum template salvo</p>
                  <p className="text-sm text-muted-foreground">
                    Configure um relatório e salve como template para reutilizar.
                  </p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Visual Customization Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Personalização Visual</CardTitle>
            <CardDescription>
              Configure o logo, cores e textos do cabeçalho e rodapé dos relatórios.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ReportTemplateSettings />
          </CardContent>
        </Card>
      </div>

      {/* Hidden charts for PDF export */}
      {showCharts && (
        <ExportCharts
          budgetData={metricsData?.map((m, index) => ({
            date: `day-${index}`,
            displayDate: m.campaign_name.substring(0, 15),
            spend: m.spend || 0,
            budget: m.budget || 0,
          })) || []}
          trendData={metricsData?.map((m, index) => ({
            date: `day-${index}`,
            displayDate: m.campaign_name.substring(0, 15),
            spend: m.spend || 0,
            impressions: m.impressions || 0,
            clicks: m.clicks || 0,
          })) || []}
          showBudget={config.includeSections.budgetChart}
          showTrend={config.includeSections.trendChart}
        />
      )}
    </div>
  );
};

export default Relatorios;
