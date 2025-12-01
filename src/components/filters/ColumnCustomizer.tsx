import { useState, useEffect, useRef } from 'react';
import { Settings2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useColumnPreferences, type PageName } from '@/hooks/useColumnPreferences';

interface Column {
  id: string;
  label: string;
  required?: boolean;
}

interface ColumnCustomizerProps {
  pageName: PageName;
  availableColumns: Column[];
  onColumnsChange?: (visibleColumns: string[]) => void;
}

export const ColumnCustomizer = ({
  pageName,
  availableColumns,
  onColumnsChange,
}: ColumnCustomizerProps) => {
  const { preferences, savePreferences, isSaving } = useColumnPreferences(pageName);
  const [open, setOpen] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Só atualiza uma vez quando as preferências carregam
    if (!initialized) {
      if (preferences?.visible_columns && preferences.visible_columns.length > 0) {
        setSelectedColumns(preferences.visible_columns);
        onColumnsChange?.(preferences.visible_columns);
      } else {
        // Default: all columns visible
        const allColumns = availableColumns.map((col) => col.id);
        setSelectedColumns(allColumns);
        onColumnsChange?.(allColumns);
      }
      setInitialized(true);
    }
  }, [preferences, initialized, availableColumns, onColumnsChange]);

  const handleToggleColumn = (columnId: string) => {
    const column = availableColumns.find((col) => col.id === columnId);
    if (column?.required) return;

    setSelectedColumns((prev) =>
      prev.includes(columnId)
        ? prev.filter((id) => id !== columnId)
        : [...prev, columnId]
    );
  };

  const handleSave = () => {
    savePreferences({ visibleColumns: selectedColumns });
    onColumnsChange?.(selectedColumns);
    setOpen(false);
  };

  const handleReset = () => {
    const allColumns = availableColumns.map((col) => col.id);
    setSelectedColumns(allColumns);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="h-4 w-4 mr-2" />
          Personalizar Colunas
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Personalizar Colunas</DialogTitle>
          <DialogDescription>
            Selecione as colunas que deseja visualizar na tabela
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {availableColumns.map((column) => (
              <div key={column.id} className="flex items-center space-x-3">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <Checkbox
                  id={column.id}
                  checked={selectedColumns.includes(column.id)}
                  onCheckedChange={() => handleToggleColumn(column.id)}
                  disabled={column.required}
                />
                <label
                  htmlFor={column.id}
                  className="flex-1 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {column.label}
                  {column.required && (
                    <span className="ml-2 text-xs text-muted-foreground">(obrigatório)</span>
                  )}
                </label>
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="flex justify-between gap-2 pt-4">
          <Button variant="outline" onClick={handleReset} size="sm">
            Restaurar Padrão
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} size="sm">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving} size="sm">
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
