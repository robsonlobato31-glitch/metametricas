import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import autoTable from 'jspdf-autotable';

export const captureChartAsImage = async (elementId: string): Promise<string | null> => {
  const element = document.getElementById(elementId);
  if (!element) return null;

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
    });
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Error capturing chart:', error);
    return null;
  }
};

const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [59, 130, 246]; // Default blue
};

export const generateReportHeader = async (
  doc: jsPDF,
  title: string,
  period: string,
  startY: number = 20,
  options?: {
    logoUrl?: string;
    primaryColor?: string;
    headerText?: string;
  }
): Promise<number> => {
  const primaryColor = options?.primaryColor || '#3B82F6';
  const rgb = hexToRgb(primaryColor);
  
  // Add logo if provided
  if (options?.logoUrl) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = options.logoUrl!;
      });
      doc.addImage(img, 'PNG', 20, startY, 30, 30);
    } catch (error) {
      console.error('Error loading logo:', error);
    }
  }

  // Header text with custom color
  doc.setFontSize(20);
  doc.setTextColor(...rgb);
  const headerText = options?.headerText || title;
  doc.text(headerText, options?.logoUrl ? 55 : 20, startY + 10);

  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text(period, options?.logoUrl ? 55 : 20, startY + 18);

  const now = new Date();
  const generatedText = `Gerado em: ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR')}`;
  doc.text(generatedText, options?.logoUrl ? 55 : 20, startY + 24);

  doc.setDrawColor(...rgb);
  doc.line(20, startY + 32, 190, startY + 32);

  return startY + 38;
};

export const addMetricsSection = (
  doc: jsPDF,
  metrics: {
    label: string;
    value: string;
  }[],
  startY: number
): number => {
  doc.setFontSize(14);
  doc.setTextColor(30, 30, 30);
  doc.text('Resumo de Métricas', 20, startY);

  const metricsPerRow = 3;
  const colWidth = 56;
  let currentY = startY + 10;

  metrics.forEach((metric, index) => {
    const col = index % metricsPerRow;
    const row = Math.floor(index / metricsPerRow);
    const x = 20 + col * colWidth;
    const y = currentY + row * 20;

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(metric.label, x, y);

    doc.setFontSize(14);
    doc.setTextColor(30, 30, 30);
    doc.text(metric.value, x, y + 6);
  });

  const totalRows = Math.ceil(metrics.length / metricsPerRow);
  return currentY + totalRows * 20 + 10;
};

export const addChartImage = async (
  doc: jsPDF,
  elementId: string,
  title: string,
  startY: number
): Promise<number> => {
  const imageData = await captureChartAsImage(elementId);
  if (!imageData) return startY;

  // Check if we need a new page
  if (startY > 220) {
    doc.addPage();
    startY = 20;
  }

  doc.setFontSize(14);
  doc.setTextColor(30, 30, 30);
  doc.text(title, 20, startY);

  const imgWidth = 170;
  const imgHeight = 80;
  doc.addImage(imageData, 'PNG', 20, startY + 5, imgWidth, imgHeight);

  return startY + imgHeight + 15;
};

export const addCampaignsTable = (
  doc: jsPDF,
  campaigns: Array<{
    name: string;
    provider: string;
    status: string;
    spend: string;
    budget: string;
  }>,
  startY: number
): number => {
  if (startY > 220) {
    doc.addPage();
    startY = 20;
  }

  doc.setFontSize(14);
  doc.setTextColor(30, 30, 30);
  doc.text('Campanhas', 20, startY);

  autoTable(doc, {
    startY: startY + 5,
    head: [['Nome', 'Plataforma', 'Status', 'Gasto', 'Orçamento']],
    body: campaigns.map(c => [c.name, c.provider, c.status, c.spend, c.budget]),
    theme: 'striped',
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontSize: 10,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 9,
      textColor: 50,
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
    margin: { left: 20, right: 20 },
  });

  return (doc as any).lastAutoTable.finalY + 10;
};

export const exportCampaignReport = async (
  title: string,
  period: string,
  metrics: Array<{ label: string; value: string }>,
  campaigns: Array<{
    name: string;
    provider: string;
    status: string;
    spend: string;
    budget: string;
  }>,
  chartIds?: {
    budgetChart?: string;
    trendChart?: string;
  },
  template?: {
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    headerText?: string;
    footerText?: string;
  }
) => {
  const doc = new jsPDF();
  const primaryRgb = template?.primaryColor ? hexToRgb(template.primaryColor) : [59, 130, 246];

  let currentY = await generateReportHeader(doc, title, period, 20, {
    logoUrl: template?.logoUrl || undefined,
    primaryColor: template?.primaryColor,
    headerText: template?.headerText,
  });

  currentY = addMetricsSection(doc, metrics, currentY);

  if (chartIds?.budgetChart) {
    currentY = await addChartImage(doc, chartIds.budgetChart, 'Gasto vs Orçamento', currentY);
  }

  if (chartIds?.trendChart) {
    currentY = await addChartImage(doc, chartIds.trendChart, 'Evolução de Gastos', currentY);
  }

  currentY = addCampaignsTable(doc, campaigns, currentY);

  // Add footer if provided
  if (template?.footerText) {
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    const footerLines = doc.splitTextToSize(template.footerText, 170);
    doc.text(footerLines, 105, pageHeight - 15, { align: 'center' });
  }

  const fileName = `relatorio-campanhas-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};
