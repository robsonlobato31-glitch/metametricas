import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { PlanConfig } from '@/hooks/usePlanConfigs';

type EditPlanDialogProps = {
  plan: PlanConfig | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (config: Partial<PlanConfig> & { id: string }) => void;
};

export function EditPlanDialog({ plan, open, onOpenChange, onSave }: EditPlanDialogProps) {
  const [formData, setFormData] = useState<Partial<PlanConfig>>({});
  const [newFeature, setNewFeature] = useState('');

  if (!plan) return null;

  const currentData = { ...plan, ...formData };
  const features = formData.features ?? plan.features ?? [];

  const handleSave = () => {
    onSave({ id: plan.id, ...formData });
    setFormData({});
    onOpenChange(false);
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      setFormData({
        ...formData,
        features: [...features, newFeature.trim()],
      });
      setNewFeature('');
    }
  };

  const removeFeature = (index: number) => {
    setFormData({
      ...formData,
      features: features.filter((_, i) => i !== index),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">👑</span>
            Editar Plano {plan.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Plano</Label>
              <Input
                id="name"
                value={formData.name ?? plan.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price_display">Preço (Display)</Label>
              <Input
                id="price_display"
                placeholder="R$ 97"
                value={formData.price_display ?? plan.price_display}
                onChange={(e) => setFormData({ ...formData, price_display: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price_amount">Valor (Numérico)</Label>
              <Input
                id="price_amount"
                type="number"
                step="0.01"
                value={formData.price_amount ?? plan.price_amount}
                onChange={(e) => setFormData({ ...formData, price_amount: parseFloat(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="display_order">Ordem de Exibição</Label>
              <Input
                id="display_order"
                type="number"
                value={formData.display_order ?? plan.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              rows={2}
              value={formData.description ?? plan.description ?? ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hotmart_url">URL Hotmart</Label>
            <Input
              id="hotmart_url"
              placeholder="https://pay.hotmart.com/..."
              value={formData.hotmart_url ?? plan.hotmart_url ?? ''}
              onChange={(e) => setFormData({ ...formData, hotmart_url: e.target.value })}
            />
          </div>

          <div className="space-y-3">
            <Label>Recursos Inclusos</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Adicionar recurso"
                value={newFeature}
                onChange={(e) => setNewFeature(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addFeature()}
              />
              <Button type="button" onClick={addFeature}>
                Adicionar
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {features.map((feature, index) => (
                <Badge key={index} variant="secondary" className="gap-1">
                  {feature}
                  <button
                    onClick={() => removeFeature(index)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label>Destacar Plano</Label>
              <p className="text-sm text-muted-foreground">
                Mostrar borda especial e destaque visual
              </p>
            </div>
            <Switch
              checked={formData.is_highlighted ?? plan.is_highlighted}
              onCheckedChange={(checked) => setFormData({ ...formData, is_highlighted: checked })}
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label>Status</Label>
              <p className="text-sm text-muted-foreground">
                Plano ativo e visível para usuários
              </p>
            </div>
            <Switch
              checked={formData.is_active ?? plan.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
