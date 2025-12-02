import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Loader2 } from 'lucide-react';

interface ChartWidgetProps {
  title: string;
  data: any[];
  isLoading?: boolean;
}

const ChartLoadingSkeleton = () => (
  <div className="h-[200px] w-full flex flex-col">
    <div className="flex items-center justify-center gap-2 mb-4">
      <Loader2 className="h-4 w-4 animate-spin text-primary" />
      <span className="text-sm text-muted-foreground">Carregando dados...</span>
    </div>
    <div className="flex-1 flex items-end gap-2 px-4">
      {[40, 65, 45, 80, 55, 70, 50].map((height, i) => (
        <div
          key={i}
          className="flex-1 bg-primary/10 rounded-t animate-pulse"
          style={{ 
            height: `${height}%`,
            animationDelay: `${i * 100}ms`
          }}
        />
      ))}
    </div>
    <div className="flex justify-between px-4 mt-2">
      {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, i) => (
        <Skeleton key={i} className="h-3 w-6" />
      ))}
    </div>
  </div>
);

export const ChartWidget = ({ title, data, isLoading }: ChartWidgetProps) => {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <ChartLoadingSkeleton />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="name" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--primary))"
                fillOpacity={1}
                fill="url(#colorValue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};
