import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAdAccounts } from '@/hooks/useAdAccounts';

interface AdAccountFilterProps {
  value?: string;
  onChange: (value?: string) => void;
  provider?: 'meta' | 'google';
}

export const AdAccountFilter = ({ value, onChange, provider }: AdAccountFilterProps) => {
  const { data: accounts, isLoading } = useAdAccounts(provider);

  return (
    <div className="space-y-2">
      <Label htmlFor="ad-account">Conta de Anúncios</Label>
      <Select value={value || ''} onValueChange={(val) => onChange(val || undefined)}>
        <SelectTrigger id="ad-account">
          <SelectValue placeholder={isLoading ? 'Carregando...' : 'Todas as contas'} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">Todas as contas</SelectItem>
          {accounts?.map((account) => (
            <SelectItem key={account.id} value={account.id}>
              {account.account_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
