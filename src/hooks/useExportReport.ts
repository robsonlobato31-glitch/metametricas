import { useState } from 'react';
import { exportCampaignReport } from '@/lib/pdfExport';
import { toast } from '@/hooks/use-toast';

interface ExportReportOptions {
  title: string;
  period: string;
  metrics: Array<{ label: string; value: string }>;
  campaigns: Array<{
    name: string;
    provider: string;
    status: string;
    spend: string;
    budget: string;
  }>;
  chartIds?: {
    budgetChart?: string;
    trendChart?: string;
  };
}

export const useExportReport = () => {
  const [isExporting, setIsExporting] = useState(false);

  const exportReport = async (options: ExportReportOptions) => {
    setIsExporting(true);
    try {
      await exportCampaignReport(
        options.title,
        options.period,
        options.metrics,
        options.campaigns,
        options.chartIds
      );
      toast({
        title: 'Relatório exportado',
        description: 'O relatório PDF foi gerado com sucesso.',
      });
    } catch (error) {
      console.error('Error exporting report:', error);
      toast({
        title: 'Erro ao exportar',
        description: 'Não foi possível gerar o relatório. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return { exportReport, isExporting };
};
