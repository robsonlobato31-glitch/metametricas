export type WidgetType = 
  | 'metric-spend' 
  | 'metric-impressions' 
  | 'metric-clicks' 
  | 'metric-conversions'
  | 'metric-results'
  | 'metric-messages'
  | 'metric-cost-per-result'
  | 'chart-performance'
  | 'chart-budget'
  | 'campaign-list'
  | 'alerts-list'
  | 'quick-actions';

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  config?: Record<string, any>;
}

export interface LayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  static?: boolean;
}

export interface DashboardLayout {
  layouts: {
    lg: LayoutItem[];
    md: LayoutItem[];
    sm: LayoutItem[];
  };
  widgets: DashboardWidget[];
}

export const DEFAULT_WIDGETS: DashboardWidget[] = [
  { id: 'spend', type: 'metric-spend', title: 'Total Gasto' },
  { id: 'impressions', type: 'metric-impressions', title: 'Impressões' },
  { id: 'clicks', type: 'metric-clicks', title: 'Cliques' },
  { id: 'conversions', type: 'metric-conversions', title: 'Conversões' },
  { id: 'performance', type: 'chart-performance', title: 'Performance' },
  { id: 'campaigns', type: 'campaign-list', title: 'Campanhas' },
  { id: 'alerts', type: 'alerts-list', title: 'Alertas' },
  { id: 'actions', type: 'quick-actions', title: 'Ações Rápidas' },
];

export const DEFAULT_LAYOUT: DashboardLayout = {
  layouts: {
    lg: [
      { i: 'spend', x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      { i: 'impressions', x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      { i: 'clicks', x: 6, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      { i: 'conversions', x: 9, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      { i: 'performance', x: 0, y: 2, w: 6, h: 4, minW: 4, minH: 3 },
      { i: 'campaigns', x: 6, y: 2, w: 6, h: 4, minW: 4, minH: 3 },
      { i: 'alerts', x: 0, y: 6, w: 6, h: 3, minW: 4, minH: 2 },
      { i: 'actions', x: 6, y: 6, w: 6, h: 3, minW: 4, minH: 2 },
    ],
    md: [
      { i: 'spend', x: 0, y: 0, w: 6, h: 2, minW: 3, minH: 2 },
      { i: 'impressions', x: 6, y: 0, w: 6, h: 2, minW: 3, minH: 2 },
      { i: 'clicks', x: 0, y: 2, w: 6, h: 2, minW: 3, minH: 2 },
      { i: 'conversions', x: 6, y: 2, w: 6, h: 2, minW: 3, minH: 2 },
      { i: 'performance', x: 0, y: 4, w: 12, h: 4, minW: 6, minH: 3 },
      { i: 'campaigns', x: 0, y: 8, w: 12, h: 4, minW: 6, minH: 3 },
      { i: 'alerts', x: 0, y: 12, w: 12, h: 3, minW: 6, minH: 2 },
      { i: 'actions', x: 0, y: 15, w: 12, h: 3, minW: 6, minH: 2 },
    ],
    sm: [
      { i: 'spend', x: 0, y: 0, w: 6, h: 2, minW: 3, minH: 2 },
      { i: 'impressions', x: 0, y: 2, w: 6, h: 2, minW: 3, minH: 2 },
      { i: 'clicks', x: 0, y: 4, w: 6, h: 2, minW: 3, minH: 2 },
      { i: 'conversions', x: 0, y: 6, w: 6, h: 2, minW: 3, minH: 2 },
      { i: 'performance', x: 0, y: 8, w: 6, h: 4, minW: 3, minH: 3 },
      { i: 'campaigns', x: 0, y: 12, w: 6, h: 4, minW: 3, minH: 3 },
      { i: 'alerts', x: 0, y: 16, w: 6, h: 3, minW: 3, minH: 2 },
      { i: 'actions', x: 0, y: 19, w: 6, h: 3, minW: 3, minH: 2 },
    ],
  },
  widgets: DEFAULT_WIDGETS,
};
