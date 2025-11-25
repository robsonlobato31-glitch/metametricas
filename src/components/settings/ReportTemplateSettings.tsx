import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Upload, Image as ImageIcon, Palette } from 'lucide-react';
import { useReportTemplate } from '@/hooks/useReportTemplate';

export const ReportTemplateSettings = () => {
  const { template, isLoading, updateTemplate, uploadLogo, isUpdating } = useReportTemplate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    primary_color: template?.primary_color || '#3B82F6',
    secondary_color: template?.secondary_color || '#64748B',
    header_text: template?.header_text || 'Relatório de Campanhas',
    footer_text: template?.footer_text || '',
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('O arquivo deve ter no máximo 2MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        alert('Por favor, selecione uma imagem');
        return;
      }
      uploadLogo(file);
    }
  };

  const handleSave = () => {
    updateTemplate(formData);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Template de Relatórios
        </CardTitle>
        <CardDescription>
          Personalize o visual dos seus relatórios PDF com logo e cores da sua empresa
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Logo Upload */}
        <div className="space-y-3">
          <Label>Logo da Empresa</Label>
          <div className="flex items-center gap-4">
            {template?.logo_url ? (
              <div className="relative h-20 w-20 border rounded-lg overflow-hidden bg-muted">
                <img
                  src={template.logo_url}
                  alt="Logo"
                  className="h-full w-full object-contain"
                />
              </div>
            ) : (
              <div className="h-20 w-20 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted">
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUpdating}
              >
                <Upload className="mr-2 h-4 w-4" />
                {template?.logo_url ? 'Alterar Logo' : 'Fazer Upload'}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                PNG, JPG ou SVG até 2MB. Recomendado: 200x200px
              </p>
            </div>
          </div>
        </div>

        {/* Colors */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="primary_color">Cor Primária</Label>
            <div className="flex gap-2">
              <Input
                id="primary_color"
                type="color"
                value={formData.primary_color}
                onChange={(e) =>
                  setFormData({ ...formData, primary_color: e.target.value })
                }
                className="w-20 h-10 cursor-pointer"
              />
              <Input
                type="text"
                value={formData.primary_color}
                onChange={(e) =>
                  setFormData({ ...formData, primary_color: e.target.value })
                }
                placeholder="#3B82F6"
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="secondary_color">Cor Secundária</Label>
            <div className="flex gap-2">
              <Input
                id="secondary_color"
                type="color"
                value={formData.secondary_color}
                onChange={(e) =>
                  setFormData({ ...formData, secondary_color: e.target.value })
                }
                className="w-20 h-10 cursor-pointer"
              />
              <Input
                type="text"
                value={formData.secondary_color}
                onChange={(e) =>
                  setFormData({ ...formData, secondary_color: e.target.value })
                }
                placeholder="#64748B"
                className="flex-1"
              />
            </div>
          </div>
        </div>

        {/* Header and Footer Text */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="header_text">Texto do Cabeçalho</Label>
            <Input
              id="header_text"
              value={formData.header_text}
              onChange={(e) =>
                setFormData({ ...formData, header_text: e.target.value })
              }
              placeholder="Relatório de Campanhas"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="footer_text">Texto do Rodapé (Opcional)</Label>
            <Textarea
              id="footer_text"
              value={formData.footer_text}
              onChange={(e) =>
                setFormData({ ...formData, footer_text: e.target.value })
              }
              placeholder="© 2025 Sua Empresa. Todos os direitos reservados."
              rows={2}
            />
          </div>
        </div>

        {/* Preview */}
        <div className="space-y-2">
          <Label>Prévia</Label>
          <div className="border rounded-lg p-4 space-y-2">
            <div
              className="h-16 rounded-md flex items-center justify-between px-4"
              style={{ backgroundColor: formData.primary_color + '20' }}
            >
              {template?.logo_url && (
                <img
                  src={template.logo_url}
                  alt="Logo preview"
                  className="h-10 object-contain"
                />
              )}
              <span
                className="font-semibold"
                style={{ color: formData.primary_color }}
              >
                {formData.header_text}
              </span>
            </div>
            {formData.footer_text && (
              <div className="text-xs text-center pt-2 border-t">
                <p style={{ color: formData.secondary_color }}>
                  {formData.footer_text}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        <Button onClick={handleSave} disabled={isUpdating} className="w-full">
          {isUpdating ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </CardContent>
    </Card>
  );
};
