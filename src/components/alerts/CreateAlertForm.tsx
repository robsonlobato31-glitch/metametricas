import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSpendingAlerts, CreateSpendingAlertInput } from '@/hooks/useSpendingAlerts';
import { useAdAccounts } from '@/hooks/useAdAccounts';
import { useCampaigns } from '@/hooks/useCampaigns';
import { Plus } from 'lucide-react';

const METRIC_TYPES = [
  { value: 'daily_spend', label: 'Gasto Diário' },
  { value: 'monthly_spend', label: 'Gasto Mensal' },
  { value: 'cpc', label: 'CPC (Custo por Clique)' },
  { value: 'ctr', label: 'CTR (Taxa de Cliques)' },
  { value: 'cpm', label: 'CPM (Custo por Mil)' },
];

const CONDITIONS = [
  { value: 'greater_than', label: 'Maior que' },
  { value: 'less_than', label: 'Menor que' },
];

const PLATFORMS = [
  { value: 'all', label: 'Todas as Plataformas' },
  { value: 'meta', label: 'Meta Ads' },
  { value: 'google', label: 'Google Ads' },
];

export const CreateAlertForm = () => {
  const { createAlert } = useSpendingAlerts();
  const { data: adAccounts = [] } = useAdAccounts();
  const { data: campaigns = [] } = useCampaigns();

  const [metricType, setMetricType] = useState<string>('daily_spend');
  const [condition, setCondition] = useState<string>('greater_than');
  const [threshold, setThreshold] = useState<string>('');
  const [provider, setProvider] = useState<string>('all');
  const [adAccountId, setAdAccountId] = useState<string>('all');
  const [campaignId, setCampaignId] = useState<string>('all');
  const [sendEmail, setSendEmail] = useState(false);

  // Filter accounts based on selected provider
  const filteredAccounts = adAccounts.filter(
    (acc) => provider === 'all' || acc.provider === provider
  );

  // Filter campaigns based on selected account
  const filteredCampaigns = campaigns.filter(
    (camp) => adAccountId === 'all' || camp.ad_account_id === adAccountId
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!threshold || parseFloat(threshold) <= 0) {
      return;
    }

    const conditionLabel = CONDITIONS.find((c) => c.value === condition)?.label || '';
    const metricLabel = METRIC_TYPES.find((m) => m.value === metricType)?.label || '';
    const alertName = `${metricLabel} ${conditionLabel.toLowerCase()} R$ ${threshold}`;

    const input: CreateSpendingAlertInput = {
      name: alertName,
      metric_type: metricType as CreateSpendingAlertInput['metric_type'],
      condition: condition as CreateSpendingAlertInput['condition'],
      threshold_amount: parseFloat(threshold),
      provider: provider === 'all' ? null : (provider as 'meta' | 'google'),
      ad_account_id: adAccountId === 'all' ? null : adAccountId,
      campaign_id: campaignId === 'all' ? null : campaignId,
      send_email: sendEmail,
    };

    createAlert.mutate(input, {
      onSuccess: () => {
        // Reset form
        setThreshold('');
        setMetricType('daily_spend');
        setCondition('greater_than');
        setProvider('all');
        setAdAccountId('all');
        setCampaignId('all');
        setSendEmail(false);
      },
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Criar Novo Alerta</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Row 1: Tipo de Métrica + Condição */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm">Tipo de Métrica</Label>
              <Select value={metricType} onValueChange={setMetricType}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Selecione a métrica" />
                </SelectTrigger>
                <SelectContent>
                  {METRIC_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Condição</Label>
              <Select value={condition} onValueChange={setCondition}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Selecione a condição" />
                </SelectTrigger>
                <SelectContent>
                  {CONDITIONS.map((cond) => (
                    <SelectItem key={cond.value} value={cond.value}>
                      {cond.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: Limite + Plataforma */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm">Limite (R$)</Label>
              <Input
                type="number"
                placeholder="Ex: 500"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                min="0"
                step="0.01"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Plataforma</Label>
              <Select value={provider} onValueChange={(v) => {
                setProvider(v);
                setAdAccountId('all');
                setCampaignId('all');
              }}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Selecione a plataforma" />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((plat) => (
                    <SelectItem key={plat.value} value={plat.value}>
                      {plat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 3: Conta de Anúncios + Campanha */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm">Conta (opcional)</Label>
              <Select value={adAccountId} onValueChange={(v) => {
                setAdAccountId(v);
                setCampaignId('all');
              }}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todas as contas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as contas</SelectItem>
                  {filteredAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Campanha (opcional)</Label>
              <Select value={campaignId} onValueChange={setCampaignId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todas as campanhas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as campanhas</SelectItem>
                  {filteredCampaigns.map((camp) => (
                    <SelectItem key={camp.id} value={camp.id}>
                      {camp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 4: Email + Botão */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <Switch
                id="send-email"
                checked={sendEmail}
                onCheckedChange={setSendEmail}
              />
              <Label htmlFor="send-email" className="text-sm cursor-pointer">
                Enviar email
              </Label>
            </div>
            <Button
              type="submit"
              size="sm"
              disabled={createAlert.isPending || !threshold}
            >
              <Plus className="h-4 w-4 mr-1" />
              {createAlert.isPending ? 'Criando...' : 'Criar Alerta'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};