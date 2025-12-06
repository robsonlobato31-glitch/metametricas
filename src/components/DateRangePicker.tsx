import * as React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface DateRangePickerProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  placeholder?: string;
  className?: string;
}

export function DateRangePicker({
  dateRange,
  onDateRangeChange,
  placeholder = 'Selecione o período',
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [tempDateRange, setTempDateRange] = React.useState<DateRange | undefined>(dateRange);

  // Sync temp range with prop only when opening
  React.useEffect(() => {
    if (open) {
      setTempDateRange(dateRange);
    }
  }, [open]); // Removed dateRange dependency to avoid overwriting user selection if parent updates

  const handleApply = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDateRangeChange(tempDateRange);
    setOpen(false);
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(false);
  };

  const handleSelect = (range: DateRange | undefined) => {
    setTempDateRange(range);
  };

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date-trigger"
            variant={'outline'}
            className={cn(
              'w-full justify-start text-left font-normal',
              !dateRange && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, 'dd/MM/yyyy', { locale: ptBR })} -{' '}
                  {format(dateRange.to, 'dd/MM/yyyy', { locale: ptBR })}
                </>
              ) : (
                format(dateRange.from, 'dd/MM/yyyy', { locale: ptBR })
              )
            ) : (
              <span>{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex flex-col">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={tempDateRange?.from}
              selected={tempDateRange}
              onSelect={handleSelect}
              numberOfMonths={2}
              locale={ptBR}
              disabled={(date) =>
                date > new Date() || date < new Date('2020-01-01')
              }
            />
            <div className="flex justify-end gap-2 p-3 border-t border-border bg-popover">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                type="button"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleApply}
                className="bg-brand-500 hover:bg-brand-600"
                type="button"
              >
                Aplicar
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
