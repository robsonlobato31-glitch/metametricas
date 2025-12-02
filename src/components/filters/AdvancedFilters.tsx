import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Filter, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export interface AdvancedFiltersConfig {
  objective?: string;
  budgetMin?: number;
  budgetMax?: number;
  ctrMin?: number;
  ctrMax?: number;
  cpcMin?: number;
  cpcMax?: number;
  costPerResultMin?: number;
  costPerResultMax?: number;
}

interface AdvancedFiltersProps {
  filters: AdvancedFiltersConfig;
  onChange: (filters: AdvancedFiltersConfig) => void;
}

export const AdvancedFilters = ({ filters, onChange }: AdvancedFiltersProps) => {
  const [localFilters, setLocalFilters] = useState<AdvancedFiltersConfig>(filters);
  const [isOpen, setIsOpen] = useState(false);

  const handleApply = () => {
    onChange(localFilters);
    setIsOpen(false);
  };

  const handleReset = () => {
    const emptyFilters = {};
    setLocalFilters(emptyFilters);
    onChange(emptyFilters);
  };

  const activeFiltersCount = Object.keys(filters).filter(key => 
    filters[key as keyof AdvancedFiltersConfig] !== undefined
  ).length;

  const objectives = [
    { value: 'OUTCOME_TRAFFIC', label: 'Tráfego' },
    { value: 'OUTCOME_AWARENESS', label: 'Reconhecimento' },
    { value: 'OUTCOME_ENGAGEMENT', label: 'Engajamento' },
    { value: 'OUTCOME_LEADS', label: 'Geração de Leads' },
    { value: 'OUTCOME_SALES', label: 'Vendas' },
    { value: 'OUTCOME_APP_PROMOTION', label: 'Promoção de App' },
  ];

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="relative">
          <Filter className="h-4 w-4 mr-2" />
          Filtros Avançados
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Filtros Avançados</h4>
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="h-8 px-2"
              >
                <X className="h-4 w-4 mr-1" />
                Limpar
              </Button>
            )}
          </div>

          {/* Objective Filter */}
          <div className="space-y-2">
            <Label>Objetivo da Campanha</Label>
            <Select
              value={localFilters.objective || 'all'}
              onValueChange={(value) =>
                setLocalFilters({ ...localFilters, objective: value === 'all' ? undefined : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os objetivos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os objetivos</SelectItem>
                {objectives.map((obj) => (
                  <SelectItem key={obj.value} value={obj.value}>
                    {obj.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Budget Range */}
          <div className="space-y-2">
            <Label>Faixa de Orçamento (R$)</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Input
                  type="number"
                  placeholder="Mínimo"
                  value={localFilters.budgetMin || ''}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      budgetMin: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                />
              </div>
              <div>
                <Input
                  type="number"
                  placeholder="Máximo"
                  value={localFilters.budgetMax || ''}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      budgetMax: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                />
              </div>
            </div>
          </div>

          {/* CTR Range */}
          <div className="space-y-2">
            <Label>CTR (%)</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="Mínimo"
                  value={localFilters.ctrMin || ''}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      ctrMin: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                />
              </div>
              <div>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="Máximo"
                  value={localFilters.ctrMax || ''}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      ctrMax: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                />
              </div>
            </div>
          </div>

          {/* CPC Range */}
          <div className="space-y-2">
            <Label>CPC (R$)</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Mínimo"
                  value={localFilters.cpcMin || ''}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      cpcMin: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                />
              </div>
              <div>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Máximo"
                  value={localFilters.cpcMax || ''}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      cpcMax: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                />
              </div>
            </div>
          </div>

          {/* Cost per Result Range */}
          <div className="space-y-2">
            <Label>Custo por Resultado (R$)</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Mínimo"
                  value={localFilters.costPerResultMin || ''}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      costPerResultMin: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                />
              </div>
              <div>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Máximo"
                  value={localFilters.costPerResultMax || ''}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      costPerResultMax: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button onClick={handleApply} className="flex-1">
              Aplicar Filtros
            </Button>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
