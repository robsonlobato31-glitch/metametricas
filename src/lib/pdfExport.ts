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

// Load image as base64 to avoid CORS issues with timeout
const loadImageAsBase64 = async (url: string, timeout = 10000): Promise<string | null> => {
  try {
    console.log('Loading logo from URL:', url);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(url, { 
      signal: controller.signal,
      mode: 'cors',
      cache: 'no-cache',
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.error('Failed to fetch image:', response.status, response.statusText);
      return null;
    }
    
    const blob = await response.blob();
    console.log('Image blob size:', blob.size, 'type:', blob.type);
    
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        console.log('Image loaded as base64 successfully');
        resolve(reader.result as string);
      };
      reader.onerror = (error) => {
        console.error('FileReader error:', error);
        resolve(null);
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('Logo loading timed out after', timeout, 'ms');
    } else {
      console.error('Error loading logo:', error);
    }
    return null;
  }
};

// Add page numbers to all pages
const addPageNumbers = (doc: jsPDF) => {
  const pageCount = (doc as any).internal.getNumberOfPages();
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - 25, pageHeight - 10);
  }
};

// Add footer to all pages
const addFooterToAllPages = (doc: jsPDF, footerText: string) => {
  const pageCount = (doc as any).internal.getNumberOfPages();
  const pageHeight = doc.internal.pageSize.height;
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    const footerLines = doc.splitTextToSize(footerText, 140);
    doc.text(footerLines, 20, pageHeight - 10);
  }
};

// NEW: Add professional cover page
export const addCoverPage = async (
  doc: jsPDF,
  options: {
    logoUrl?: string;
    companyName?: string;
    reportTitle: string;
    period: string;
    primaryColor?: string;
  }
): Promise<void> => {
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const primaryColor = options.primaryColor || '#3B82F6';
  const rgb = hexToRgb(primaryColor);

  // Background gradient effect (subtle)
  doc.setFillColor(245, 247, 250);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Top accent bar
  doc.setFillColor(...rgb);
  doc.rect(0, 0, pageWidth, 8, 'F');

  // Logo (centered, larger)
  let logoY = 60;
  if (options.logoUrl) {
    const logoBase64 = await loadImageAsBase64(options.logoUrl);
    if (logoBase64) {
      try {
        let imageFormat = 'PNG';
        if (logoBase64.includes('data:image/jpeg') || logoBase64.includes('data:image/jpg')) {
          imageFormat = 'JPEG';
        }
        // Centered logo, larger size
        doc.addImage(logoBase64, imageFormat, (pageWidth - 60) / 2, logoY, 60, 60);
        logoY = 135;
      } catch (error) {
        console.error('Error adding logo to cover:', error);
      }
    }
  }

  // Company name
  if (options.companyName) {
    doc.setFontSize(16);
    doc.setTextColor(100, 100, 100);
    doc.text(options.companyName, pageWidth / 2, logoY, { align: 'center' });
    logoY += 20;
  }

  // Report title
  doc.setFontSize(28);
  doc.setTextColor(...rgb);
  doc.text(options.reportTitle, pageWidth / 2, logoY + 20, { align: 'center' });

  // Period box
  doc.setFillColor(...rgb);
  const periodBoxWidth = 120;
  const periodBoxX = (pageWidth - periodBoxWidth) / 2;
  doc.roundedRect(periodBoxX, logoY + 35, periodBoxWidth, 25, 3, 3, 'F');
  
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(options.period, pageWidth / 2, logoY + 51, { align: 'center' });

  // Generation date
  const now = new Date();
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text(
    `Gerado em: ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR')}`,
    pageWidth / 2,
    pageHeight - 30,
    { align: 'center' }
  );

  // Bottom accent bar
  doc.setFillColor(...rgb);
  doc.rect(0, pageHeight - 8, pageWidth, 8, 'F');
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
  
  let logoXOffset = 20;
  
  // Add logo if provided
  if (options?.logoUrl) {
    console.log('Attempting to load logo for PDF:', options.logoUrl);
    const logoBase64 = await loadImageAsBase64(options.logoUrl);
    if (logoBase64) {
      try {
        let imageFormat = 'PNG';
        if (logoBase64.includes('data:image/jpeg') || logoBase64.includes('data:image/jpg')) {
          imageFormat = 'JPEG';
        } else if (logoBase64.includes('data:image/gif')) {
          imageFormat = 'GIF';
        }
        
        doc.addImage(logoBase64, imageFormat, 20, startY, 25, 25);
        logoXOffset = 50;
        console.log('Logo added to PDF successfully');
      } catch (error) {
        console.error('Error adding logo to PDF:', error);
      }
    }
  }

  // Header text with custom color
  doc.setFontSize(18);
  doc.setTextColor(...rgb);
  const displayHeaderText = options?.headerText || title;
  doc.text(displayHeaderText, logoXOffset, startY + 8);

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(period, logoXOffset, startY + 16);

  doc.setDrawColor(...rgb);
  doc.setLineWidth(0.5);
  doc.line(20, startY + 28, 190, startY + 28);

  return startY + 35;
};

// NEW: Metric cards with variation indicators
export const addMetricCardsWithVariation = (
  doc: jsPDF,
  metrics: Array<{
    label: string;
    value: string;
    variation?: number;
    isPositive?: boolean;
  }>,
  startY: number,
  primaryColor: string = '#3B82F6'
): number => {
  const rgb = hexToRgb(primaryColor);
  
  doc.setFontSize(14);
  doc.setTextColor(...rgb);
  doc.text('Resumo de Métricas', 20, startY);

  const cardWidth = 55;
  const cardHeight = 32;
  const cardsPerRow = 3;
  let currentY = startY + 8;

  metrics.forEach((metric, index) => {
    const col = index % cardsPerRow;
    const row = Math.floor(index / cardsPerRow);
    const x = 20 + col * (cardWidth + 3);
    const y = currentY + row * (cardHeight + 3);

    // Card background
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'F');

    // Card border
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'S');

    // Label
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(metric.label, x + 4, y + 8);

    // Value
    doc.setFontSize(13);
    doc.setTextColor(30, 41, 59);
    doc.text(metric.value, x + 4, y + 18);

    // Variation indicator
    if (metric.variation !== undefined) {
      const variationText = `${metric.variation >= 0 ? '↑' : '↓'} ${Math.abs(metric.variation).toFixed(1)}%`;
      doc.setFontSize(9);
      if (metric.isPositive) {
        doc.setTextColor(22, 163, 74); // Green
      } else {
        doc.setTextColor(220, 38, 38); // Red
      }
      doc.text(variationText, x + 4, y + 27);
    }
  });

  const totalRows = Math.ceil(metrics.length / cardsPerRow);
  return currentY + totalRows * (cardHeight + 3) + 10;
};

// Original metrics section (kept for compatibility)
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

// NEW: Period comparison section
export const addPeriodComparison = (
  doc: jsPDF,
  comparisons: Array<{
    label: string;
    current: number;
    previous: number;
    format?: 'currency' | 'number' | 'percent';
  }>,
  startY: number,
  primaryColor: string = '#3B82F6'
): number => {
  if (startY > 220) {
    doc.addPage();
    startY = 20;
  }

  const rgb = hexToRgb(primaryColor);
  
  doc.setFontSize(14);
  doc.setTextColor(...rgb);
  doc.text('Comparativo com Período Anterior', 20, startY);

  let currentY = startY + 12;
  const barWidth = 80;
  const barHeight = 8;

  comparisons.forEach((comp) => {
    const maxValue = Math.max(comp.current, comp.previous, 1);
    const currentWidth = (comp.current / maxValue) * barWidth;
    const previousWidth = (comp.previous / maxValue) * barWidth;

    // Format value
    const formatValue = (val: number) => {
      if (comp.format === 'currency') return `R$ ${val.toFixed(2)}`;
      if (comp.format === 'percent') return `${val.toFixed(2)}%`;
      return val.toLocaleString('pt-BR');
    };

    // Label
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(comp.label, 20, currentY);

    // Current period bar
    doc.setFillColor(...rgb);
    doc.roundedRect(20, currentY + 2, currentWidth, barHeight, 1, 1, 'F');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text(formatValue(comp.current), 105, currentY + 7);

    // Previous period bar
    doc.setFillColor(203, 213, 225);
    doc.roundedRect(20, currentY + 12, previousWidth, barHeight, 1, 1, 'F');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(formatValue(comp.previous), 105, currentY + 17);

    // Variation
    const variation = comp.previous !== 0 
      ? ((comp.current - comp.previous) / comp.previous * 100) 
      : 0;
    const variationText = `${variation >= 0 ? '+' : ''}${variation.toFixed(1)}%`;
    doc.setFontSize(9);
    if (variation >= 0) {
      doc.setTextColor(22, 163, 74);
    } else {
      doc.setTextColor(220, 38, 38);
    }
    doc.text(variationText, 140, currentY + 12);

    currentY += 30;
  });

  return currentY + 5;
};

// NEW: Platform results table
export const addPlatformResultsTable = (
  doc: jsPDF,
  platforms: Array<{
    provider: string;
    impressions: number;
    clicks: number;
    spend: number;
    cpc: number;
    results: number;
    costPerResult: number;
  }>,
  startY: number,
  primaryColor: string = '#3B82F6'
): number => {
  if (startY > 220) {
    doc.addPage();
    startY = 20;
  }

  const rgb = hexToRgb(primaryColor);
  
  doc.setFontSize(14);
  doc.setTextColor(...rgb);
  doc.text('Resultados por Plataforma', 20, startY);

  autoTable(doc, {
    startY: startY + 5,
    head: [['Plataforma', 'Impressões', 'Cliques', 'CPC', 'Resultados', 'Custo/Res.', 'Gasto']],
    body: platforms.map(p => [
      p.provider,
      p.impressions.toLocaleString('pt-BR'),
      p.clicks.toLocaleString('pt-BR'),
      `R$ ${p.cpc.toFixed(2)}`,
      p.results.toLocaleString('pt-BR'),
      `R$ ${p.costPerResult.toFixed(2)}`,
      `R$ ${p.spend.toFixed(2)}`,
    ]),
    theme: 'striped',
    headStyles: {
      fillColor: rgb,
      textColor: 255,
      fontSize: 9,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: 50,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
    },
    margin: { left: 20, right: 20 },
  });

  return (doc as any).lastAutoTable.finalY + 10;
};

export const addChartImage = async (
  doc: jsPDF,
  elementId: string,
  title: string,
  startY: number,
  primaryColor: string = '#3B82F6'
): Promise<number> => {
  const imageData = await captureChartAsImage(elementId);
  if (!imageData) return startY;

  if (startY > 200) {
    doc.addPage();
    startY = 20;
  }

  const rgb = hexToRgb(primaryColor);
  
  doc.setFontSize(14);
  doc.setTextColor(...rgb);
  doc.text(title, 20, startY);

  const imgWidth = 170;
  const imgHeight = 75;
  doc.addImage(imageData, 'PNG', 20, startY + 5, imgWidth, imgHeight);

  return startY + imgHeight + 15;
};

export const addCampaignsTable = (
  doc: jsPDF,
  campaigns: Array<{
    name: string;
    provider: string;
    spend: string;
    budget: string;
  }>,
  startY: number,
  primaryColor: string = '#3B82F6'
): number => {
  if (startY > 220) {
    doc.addPage();
    startY = 20;
  }

  const rgb = hexToRgb(primaryColor);

  doc.setFontSize(14);
  doc.setTextColor(...rgb);
  doc.text('Campanhas', 20, startY);

  autoTable(doc, {
    startY: startY + 5,
    head: [['Nome', 'Plataforma', 'Gasto', 'Orçamento']],
    body: campaigns.map(c => [c.name, c.provider, c.spend, c.budget]),
    theme: 'striped',
    headStyles: {
      fillColor: rgb,
      textColor: 255,
      fontSize: 10,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 9,
      textColor: 50,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 70 },
      2: { halign: 'right' },
      3: { halign: 'right' },
    },
    margin: { left: 20, right: 20 },
  });

  return (doc as any).lastAutoTable.finalY + 10;
};

// NEW: Top campaigns table with more details
export const addTopCampaignsTable = (
  doc: jsPDF,
  campaigns: Array<{
    name: string;
    provider: string;
    impressions: number;
    clicks: number;
    cpc: number;
    results: number;
    costPerResult: number;
    spend: number;
  }>,
  startY: number,
  primaryColor: string = '#3B82F6'
): number => {
  if (startY > 200) {
    doc.addPage();
    startY = 20;
  }

  const rgb = hexToRgb(primaryColor);

  doc.setFontSize(14);
  doc.setTextColor(...rgb);
  doc.text('Principais Campanhas', 20, startY);

  autoTable(doc, {
    startY: startY + 5,
    head: [['Campanha', 'Plat.', 'Impr.', 'Cliques', 'CPC', 'Result.', 'Custo/Res.', 'Gasto']],
    body: campaigns.slice(0, 10).map(c => [
      c.name.length > 25 ? c.name.substring(0, 25) + '...' : c.name,
      c.provider === 'Meta Ads' ? 'Meta' : c.provider === 'Google Ads' ? 'Google' : c.provider,
      c.impressions.toLocaleString('pt-BR'),
      c.clicks.toLocaleString('pt-BR'),
      `R$ ${c.cpc.toFixed(2)}`,
      c.results.toLocaleString('pt-BR'),
      `R$ ${c.costPerResult.toFixed(2)}`,
      `R$ ${c.spend.toFixed(2)}`,
    ]),
    theme: 'striped',
    headStyles: {
      fillColor: rgb,
      textColor: 255,
      fontSize: 8,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 7,
      textColor: 50,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 15 },
      2: { halign: 'right', cellWidth: 18 },
      3: { halign: 'right', cellWidth: 18 },
      4: { halign: 'right', cellWidth: 18 },
      5: { halign: 'right', cellWidth: 15 },
      6: { halign: 'right', cellWidth: 22 },
      7: { halign: 'right', cellWidth: 22 },
    },
    margin: { left: 20, right: 20 },
  });

  return (doc as any).lastAutoTable.finalY + 10;
};

export interface IncludeSections {
  coverPage?: boolean;
  metrics: boolean;
  metricsComparison?: boolean;
  platformBreakdown?: boolean;
  budgetChart: boolean;
  trendChart: boolean;
  platformPieChart?: boolean;
  ageChart?: boolean;
  genderChart?: boolean;
  campaignTable: boolean;
  topCampaignsTable?: boolean;
}

export const exportCampaignReport = async (
  title: string,
  period: string,
  metrics: Array<{ label: string; value: string; variation?: number; isPositive?: boolean }>,
  campaigns: Array<{
    name: string;
    provider: string;
    spend: string;
    budget: string;
  }>,
  chartIds?: {
    budgetChart?: string;
    trendChart?: string;
    platformPieChart?: string;
    ageChart?: string;
    genderChart?: string;
  },
  template?: {
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    headerText?: string;
    footerText?: string;
    companyName?: string;
  },
  includeSections?: IncludeSections,
  extraData?: {
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
) => {
  const doc = new jsPDF();
  const primaryColor = template?.primaryColor || '#3B82F6';

  // Cover page
  if (includeSections?.coverPage !== false) {
    await addCoverPage(doc, {
      logoUrl: template?.logoUrl,
      companyName: template?.companyName,
      reportTitle: template?.headerText || title,
      period,
      primaryColor,
    });
    doc.addPage();
  }

  let currentY = await generateReportHeader(doc, title, period, 20, {
    logoUrl: template?.logoUrl,
    primaryColor,
    headerText: template?.headerText,
  });

  // Metrics section with variation
  if (includeSections?.metrics !== false && metrics.length > 0) {
    const hasVariation = metrics.some(m => m.variation !== undefined);
    if (hasVariation) {
      currentY = addMetricCardsWithVariation(doc, metrics, currentY, primaryColor);
    } else {
      currentY = addMetricsSection(doc, metrics, currentY);
    }
  }

  // Period comparison
  if (includeSections?.metricsComparison && extraData?.comparisonData && extraData.comparisonData.length > 0) {
    currentY = addPeriodComparison(doc, extraData.comparisonData, currentY, primaryColor);
  }

  // Platform breakdown table
  if (includeSections?.platformBreakdown && extraData?.platformData && extraData.platformData.length > 0) {
    currentY = addPlatformResultsTable(doc, extraData.platformData, currentY, primaryColor);
  }

  // Budget chart
  if (includeSections?.budgetChart !== false && chartIds?.budgetChart) {
    currentY = await addChartImage(doc, chartIds.budgetChart, 'Gasto vs Orçamento', currentY, primaryColor);
  }

  // Trend chart
  if (includeSections?.trendChart !== false && chartIds?.trendChart) {
    currentY = await addChartImage(doc, chartIds.trendChart, 'Evolução de Métricas', currentY, primaryColor);
  }

  // Platform pie chart
  if (includeSections?.platformPieChart && chartIds?.platformPieChart) {
    currentY = await addChartImage(doc, chartIds.platformPieChart, 'Distribuição por Plataforma', currentY, primaryColor);
  }

  // Age chart
  if (includeSections?.ageChart && chartIds?.ageChart) {
    currentY = await addChartImage(doc, chartIds.ageChart, 'Distribuição por Faixa Etária', currentY, primaryColor);
  }

  // Gender chart
  if (includeSections?.genderChart && chartIds?.genderChart) {
    currentY = await addChartImage(doc, chartIds.genderChart, 'Distribuição por Gênero', currentY, primaryColor);
  }

  // Top campaigns table
  if (includeSections?.topCampaignsTable && extraData?.topCampaigns && extraData.topCampaigns.length > 0) {
    currentY = addTopCampaignsTable(doc, extraData.topCampaigns, currentY, primaryColor);
  }

  // Campaign table
  if (includeSections?.campaignTable !== false && campaigns.length > 0) {
    currentY = addCampaignsTable(doc, campaigns, currentY, primaryColor);
  }

  // Add page numbers
  addPageNumbers(doc);

  // Add footer to ALL pages if provided
  if (template?.footerText) {
    addFooterToAllPages(doc, template.footerText);
  }

  const fileName = `relatorio-campanhas-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};
