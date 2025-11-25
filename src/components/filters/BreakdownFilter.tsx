import { Filter } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { type BreakdownType } from '@/hooks/useMetricBreakdowns';

interface BreakdownFilterProps {
  breakdownType?: BreakdownType;
  breakdownValue?: string;
  onBreakdownTypeChange: (type?: BreakdownType) => void;
  onBreakdownValueChange: (value?: string) => void;
}

const AGE_RANGES = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
const GENDERS = ['male', 'female', 'unknown'];
const DEVICES = ['mobile', 'desktop', 'tablet'];
const PLATFORMS = ['facebook', 'instagram', 'audience_network', 'messenger'];

export const BreakdownFilter = ({
  breakdownType,
  breakdownValue,
  onBreakdownTypeChange,
  onBreakdownValueChange,
}: BreakdownFilterProps) => {
  const getValueOptions = () => {
    switch (breakdownType) {
      case 'age':
        return AGE_RANGES;
      case 'gender':
        return GENDERS;
      case 'device_platform':
        return DEVICES;
      case 'publisher_platform':
        return PLATFORMS;
      default:
        return [];
    }
  };

  const getValueLabel = (value: string) => {
    if (breakdownType === 'gender') {
      return value === 'male' ? 'Masculino' : value === 'female' ? 'Feminino' : 'Desconhecido';
    }
    if (breakdownType === 'device_platform') {
      return value === 'mobile' ? 'Mobile' : value === 'desktop' ? 'Desktop' : 'Tablet';
    }
    if (breakdownType === 'publisher_platform') {
      return value.charAt(0).toUpperCase() + value.slice(1);
    }
    return value;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">Segmentação</h3>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="breakdown-type">Tipo de Segmentação</Label>
          <Select
            value={breakdownType || ''}
            onValueChange={(value) =>
              onBreakdownTypeChange(value ? (value as BreakdownType) : undefined)
            }
          >
            <SelectTrigger id="breakdown-type">
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              <SelectItem value="age">Idade</SelectItem>
              <SelectItem value="gender">Gênero</SelectItem>
              <SelectItem value="device_platform">Dispositivo</SelectItem>
              <SelectItem value="publisher_platform">Plataforma</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {breakdownType && (
          <div className="space-y-2">
            <Label htmlFor="breakdown-value">Valor</Label>
            <Select
              value={breakdownValue || ''}
              onValueChange={(value) => onBreakdownValueChange(value || undefined)}
            >
              <SelectTrigger id="breakdown-value">
                <SelectValue placeholder="Selecione o valor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                {getValueOptions().map((option) => (
                  <SelectItem key={option} value={option}>
                    {getValueLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
};
