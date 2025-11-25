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

export const generateReportHeader = (
  doc: jsPDF,
  title: string,
  period: string,
  startY: number = 20
): number => {
  doc.setFontSize(20);
  doc.setTextColor(30, 30, 30);
  doc.text(title, 20, startY);

  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text(period, 20, startY + 8);

  const now = new Date();
  const generatedText = `Gerado em: ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR')}`;
  doc.text(generatedText, 20, startY + 14);

  doc.setDrawColor(200, 200, 200);
  doc.line(20, startY + 18, 190, startY + 18);

  return startY + 25;
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
  }
) => {
  const doc = new jsPDF();

  let currentY = generateReportHeader(doc, title, period);

  currentY = addMetricsSection(doc, metrics, currentY);

  if (chartIds?.budgetChart) {
    currentY = await addChartImage(doc, chartIds.budgetChart, 'Gasto vs Orçamento', currentY);
  }

  if (chartIds?.trendChart) {
    currentY = await addChartImage(doc, chartIds.trendChart, 'Evolução de Gastos', currentY);
  }

  addCampaignsTable(doc, campaigns, currentY);

  const fileName = `relatorio-campanhas-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};
