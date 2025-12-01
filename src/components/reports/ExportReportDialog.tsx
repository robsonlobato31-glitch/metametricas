import { useState } from 'react';
import { Calendar, Download } from 'lucide-react';
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

interface ExportReportDialogProps {
  onExport: (config: ExportConfig) => void;
  isLoading?: boolean;
}

export interface ExportConfig {
  period: '7' | '30' | '90';
  provider: 'all' | 'meta' | 'google';
  includeSections: {
    metrics: boolean;
    budgetChart: boolean;
    trendChart: boolean;
    campaignTable: boolean;
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

export const ExportReportDialog = ({ onExport, isLoading }: ExportReportDialogProps) => {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<ExportConfig>({
    period: '30',
    provider: 'all',
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
  });

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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Configurar Relatório PDF</DialogTitle>
          <DialogDescription>
            Escolha as opções para personalizar seu relatório.
          </DialogDescription>
        </DialogHeader>
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
                setConfig({ ...config, provider: value })
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

          <div className="grid gap-3">
            <Label>Seções a Incluir</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="metrics"
                  checked={config.includeSections.metrics}
                  onCheckedChange={(checked) =>
                    setConfig({
                      ...config,
                      includeSections: { ...config.includeSections, metrics: !!checked },
                    })
                  }
                />
                <label
                  htmlFor="metrics"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Resumo de Métricas
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="budgetChart"
                  checked={config.includeSections.budgetChart}
                  onCheckedChange={(checked) =>
                    setConfig({
                      ...config,
                      includeSections: { ...config.includeSections, budgetChart: !!checked },
                    })
                  }
                />
                <label
                  htmlFor="budgetChart"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Gráfico de Orçamento
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="trendChart"
                  checked={config.includeSections.trendChart}
                  onCheckedChange={(checked) =>
                    setConfig({
                      ...config,
                      includeSections: { ...config.includeSections, trendChart: !!checked },
                    })
                  }
                />
                <label
                  htmlFor="trendChart"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Gráfico de Evolução
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="campaignTable"
                  checked={config.includeSections.campaignTable}
                  onCheckedChange={(checked) =>
                    setConfig({
                      ...config,
                      includeSections: { ...config.includeSections, campaignTable: !!checked },
                    })
                  }
                />
                <label
                  htmlFor="campaignTable"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Tabela de Campanhas
                </label>
              </div>
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
                    id={key}
                    checked={config.selectedMetrics[key as keyof typeof config.selectedMetrics]}
                    onCheckedChange={(checked) =>
                      setConfig({
                        ...config,
                        selectedMetrics: { 
                          ...config.selectedMetrics, 
                          [key]: !!checked 
                        },
                      })
                    }
                  />
                  <label
                    htmlFor={key}
                    className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {label}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleExport} disabled={isLoading}>
            {isLoading ? 'Gerando...' : 'Gerar PDF'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
