import { useState, useEffect } from 'react';
import { Settings2, GripVertical, Save, Trash2, Star, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useColumnPreferences, type PageName } from '@/hooks/useColumnPreferences';
import { useColumnPresets, type ColumnPreset } from '@/hooks/useColumnPresets';

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
  const {
    presets,
    defaultPreset,
    createPreset,
    updatePreset,
    deletePreset,
    isCreating,
    isDeleting,
  } = useColumnPresets(pageName);

  const [open, setOpen] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [showSavePreset, setShowSavePreset] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');

  useEffect(() => {
    if (!initialized) {
      // First check for default preset
      if (defaultPreset?.visible_columns && defaultPreset.visible_columns.length > 0) {
        setSelectedColumns(defaultPreset.visible_columns);
        onColumnsChange?.(defaultPreset.visible_columns);
        setSelectedPresetId(defaultPreset.id);
      } else if (preferences?.visible_columns && preferences.visible_columns.length > 0) {
        setSelectedColumns(preferences.visible_columns);
        onColumnsChange?.(preferences.visible_columns);
      } else {
        const allColumns = availableColumns.map((col) => col.id);
        setSelectedColumns(allColumns);
        onColumnsChange?.(allColumns);
      }
      setInitialized(true);
    }
  }, [preferences, defaultPreset, initialized, availableColumns, onColumnsChange]);

  const handleToggleColumn = (columnId: string) => {
    const column = availableColumns.find((col) => col.id === columnId);
    if (column?.required) return;

    setSelectedColumns((prev) =>
      prev.includes(columnId)
        ? prev.filter((id) => id !== columnId)
        : [...prev, columnId]
    );
    setSelectedPresetId(''); // Clear preset selection when manually changing
  };

  const handleSave = () => {
    savePreferences({ visibleColumns: selectedColumns });
    onColumnsChange?.(selectedColumns);
    setOpen(false);
  };

  const handleReset = () => {
    const allColumns = availableColumns.map((col) => col.id);
    setSelectedColumns(allColumns);
    setSelectedPresetId('');
  };

  const handleSaveNewPreset = () => {
    if (!newPresetName.trim()) return;
    createPreset({
      presetName: newPresetName.trim(),
      visibleColumns: selectedColumns,
    });
    setNewPresetName('');
    setShowSavePreset(false);
  };

  const handleApplyPreset = (preset: ColumnPreset) => {
    setSelectedColumns(preset.visible_columns);
    setSelectedPresetId(preset.id);
  };

  const handleSetDefaultPreset = (presetId: string) => {
    updatePreset({ id: presetId, isDefault: true });
  };

  const handleDeletePreset = (presetId: string) => {
    deletePreset(presetId);
    if (selectedPresetId === presetId) {
      setSelectedPresetId('');
    }
  };

  const handlePresetSelectChange = (value: string) => {
    if (value === 'none') {
      handleReset();
      return;
    }
    const preset = presets.find((p) => p.id === value);
    if (preset) {
      handleApplyPreset(preset);
    }
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
            Selecione as colunas e salve presets para acesso rápido
          </DialogDescription>
        </DialogHeader>

        {/* Presets Section */}
        {presets.length > 0 && (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">Presets Salvos</label>
              <Select
                value={selectedPresetId || 'none'}
                onValueChange={handlePresetSelectChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar preset..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Todas as colunas</SelectItem>
                  {presets.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id}>
                      <div className="flex items-center gap-2">
                        {preset.preset_name}
                        {preset.is_default && (
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Preset Actions */}
              {selectedPresetId && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSetDefaultPreset(selectedPresetId)}
                    className="flex-1"
                  >
                    <Star className="h-3 w-3 mr-1" />
                    Definir Padrão
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeletePreset(selectedPresetId)}
                    disabled={isDeleting}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
            <Separator />
          </>
        )}

        {/* Columns Selection */}
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-3">
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

        <Separator />

        {/* Save New Preset */}
        {showSavePreset ? (
          <div className="flex gap-2">
            <Input
              placeholder="Nome do preset..."
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveNewPreset()}
              autoFocus
            />
            <Button
              size="sm"
              onClick={handleSaveNewPreset}
              disabled={!newPresetName.trim() || isCreating}
            >
              <Save className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowSavePreset(false);
                setNewPresetName('');
              }}
            >
              Cancelar
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSavePreset(true)}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Salvar como Preset
          </Button>
        )}

        {/* Footer Actions */}
        <div className="flex justify-between gap-2 pt-2">
          <Button variant="outline" onClick={handleReset} size="sm">
            Restaurar Padrão
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} size="sm">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving} size="sm">
              {isSaving ? 'Salvando...' : 'Aplicar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
