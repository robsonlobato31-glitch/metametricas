import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface LastSyncIndicatorProps {
  lastSyncAt: Date | null;
  status?: string | null;
  isLoading?: boolean;
}

export const LastSyncIndicator = ({ lastSyncAt, status, isLoading }: LastSyncIndicatorProps) => {
  if (isLoading) {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground animate-pulse">
        <Clock className="h-3 w-3" />
        <span>Carregando...</span>
      </div>
    );
  }

  if (!lastSyncAt) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 text-xs text-muted-foreground cursor-help">
              <AlertCircle className="h-3 w-3 text-yellow-500" />
              <span>Nunca sincronizado</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Clique em sincronizar para atualizar os dados</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const timeAgo = formatDistanceToNow(lastSyncAt, { addSuffix: true, locale: ptBR });

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1 text-xs text-muted-foreground cursor-help">
            <CheckCircle2 className="h-3 w-3 text-green-500" />
            <span>Atualizado {timeAgo}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Última sincronização: {lastSyncAt.toLocaleString('pt-BR')}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
