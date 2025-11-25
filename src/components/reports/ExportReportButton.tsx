import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ExportReportButtonProps {
  onClick: () => void;
  isLoading?: boolean;
  label?: string;
}

export const ExportReportButton = ({
  onClick,
  isLoading = false,
  label = 'Exportar PDF',
}: ExportReportButtonProps) => {
  return (
    <Button onClick={onClick} disabled={isLoading} variant="outline">
      <Download className="mr-2 h-4 w-4" />
      {isLoading ? 'Gerando...' : label}
    </Button>
  );
};
