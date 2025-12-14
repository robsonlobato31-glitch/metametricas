import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Image, AlertCircle, RefreshCw, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { LastSyncIndicator } from '@/components/dashboard/LastSyncIndicator';

interface CreativeData {
  id: string;
  name: string;
  budget: number;
  messages: number;
  cost_per_message: number;
  spend: number;
  ctr: number;
  cpm: number;
  creative_url?: string | null;
}

interface CreativeTableProps {
  creatives: CreativeData[];
  needsSync?: boolean;
  onSyncClick?: () => void;
  isSyncing?: boolean;
  mode?: 'ads' | 'campaigns';
  lastSyncAt?: Date | null;
  lastSyncLoading?: boolean;
}

export const CreativeTable: React.FC<CreativeTableProps> = ({
  creatives,
  needsSync = false,
  onSyncClick,
  isSyncing = false,
  mode = 'ads',
  lastSyncAt,
  lastSyncLoading = false,
}) => {
  const title = mode === 'campaigns' ? 'Top Campanhas' : 'Criativos Destaques';
  const itemLabel = mode === 'campaigns' ? 'Campanha' : 'Anúncio';

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-1.5 rounded-lg">
            <Image size={16} className="text-primary" />
          </div>
          <h2 className="font-bold text-foreground text-sm">{title}</h2>
          {mode === 'campaigns' && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info size={12} className="text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Sincronize campanhas para ver anúncios individuais</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onSyncClick && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSyncClick}
              disabled={isSyncing}
              className="gap-1 text-xs"
            >
              <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
              {isSyncing ? 'Sync...' : 'Sync'}
            </Button>
          )}
        </div>
      </div>
      
      <div className="mb-4">
        <LastSyncIndicator lastSyncAt={lastSyncAt} isLoading={lastSyncLoading} />
      </div>

      {needsSync ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="text-muted-foreground mb-3" size={32} />
          <p className="text-muted-foreground text-sm mb-4">
            Sincronize os anúncios para visualizar os criativos destaques
          </p>
          {onSyncClick && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSyncClick}
              disabled={isSyncing}
            >
              <RefreshCw size={14} className={`mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Sincronizando...' : 'Sincronizar Campanhas'}
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="border-border">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground text-[10px] uppercase font-bold">{itemLabel}</TableHead>
                <TableHead className="text-muted-foreground text-[10px] uppercase font-bold text-right">Msgs</TableHead>
                <TableHead className="text-muted-foreground text-[10px] uppercase font-bold text-right">
                  Custo/Msg
                </TableHead>
                <TableHead className="text-muted-foreground text-[10px] uppercase font-bold text-right">Gasto</TableHead>
                <TableHead className="text-muted-foreground text-[10px] uppercase font-bold text-right">CTR</TableHead>
                <TableHead className="text-muted-foreground text-[10px] uppercase font-bold text-right">CPM</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {creatives.map((creative) => (
                <TableRow key={creative.id} className="border-border hover:bg-muted/50 transition-colors">
                  <TableCell className="font-medium text-foreground text-xs py-3">
                    <div className="flex items-center gap-2">
                      {creative.creative_url ? (
                        <img
                          src={creative.creative_url}
                          alt={creative.name}
                          className="w-8 h-8 rounded object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                          <Image size={12} className="text-muted-foreground" />
                        </div>
                      )}
                      <span className="truncate max-w-[120px] block">{creative.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-foreground text-xs py-3">{creative.messages}</TableCell>
                  <TableCell className="text-right text-foreground text-xs py-3">
                    R$ {(creative.cost_per_message || 0).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right text-foreground text-xs py-3">
                    R$ {(creative.spend || 0).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right text-foreground text-xs py-3">
                    {(creative.ctr || 0).toFixed(2)}%
                  </TableCell>
                  <TableCell className="text-right text-foreground text-xs py-3">
                    R$ {(creative.cpm || 0).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
              {creatives.length === 0 && !needsSync && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhum criativo com métricas encontrado no período
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};
