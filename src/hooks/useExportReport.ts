import { useState } from 'react';
import { exportCampaignReport, IncludeSections } from '@/lib/pdfExport';
import { toast } from '@/hooks/use-toast';
import { useReportTemplate } from './useReportTemplate';

interface ExportReportOptions {
  title: string;
  period: string;
  metrics: Array<{ label: string; value: string; variation?: number; isPositive?: boolean }>;
  campaigns: Array<{
    name: string;
    provider: string;
    spend: string;
    budget: string;
  }>;
  chartIds?: {
    budgetChart?: string;
    trendChart?: string;
    platformPieChart?: string;
  };
  includeSections?: IncludeSections;
  comparisonData?: Array<{
    label: string;
    current: number;
    previous: number;
    format?: 'currency' | 'number' | 'percent';
  }>;
  platformData?: Array<{
    provider: string;
    impressions: number;
    clicks: number;
    spend: number;
    cpc: number;
    results: number;
    costPerResult: number;
  }>;
  topCampaigns?: Array<{
    name: string;
    provider: string;
    impressions: number;
    clicks: number;
    cpc: number;
    results: number;
    costPerResult: number;
    spend: number;
  }>;
}

export const useExportReport = () => {
  const [isExporting, setIsExporting] = useState(false);
  const { template } = useReportTemplate();

  const exportReport = async (options: ExportReportOptions) => {
    setIsExporting(true);
    try {
      await exportCampaignReport(
        options.title,
        options.period,
        options.metrics,
        options.campaigns,
        options.chartIds,
        template ? {
          logoUrl: template.logo_url || undefined,
          primaryColor: template.primary_color,
          secondaryColor: template.secondary_color,
          headerText: template.header_text,
          footerText: template.footer_text || undefined,
        } : undefined,
        options.includeSections,
        {
          comparisonData: options.comparisonData,
          platformData: options.platformData,
          topCampaigns: options.topCampaigns,
        }
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
