import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useWorkspaceBranding } from '@/hooks/useWorkspaceBranding';
import { ArrowLeft, Save, Palette } from 'lucide-react';

export default function WorkspaceSettings() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const { branding, updateBranding } = useWorkspaceBranding(workspaceId);

  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#3B82F6');
  const [secondaryColor, setSecondaryColor] = useState('#64748B');
  const [companyName, setCompanyName] = useState('');
  const [customDomain, setCustomDomain] = useState('');

  useEffect(() => {
    if (branding) {
      setLogoUrl(branding.logo_url || '');
      setPrimaryColor(branding.primary_color || '#3B82F6');
      setSecondaryColor(branding.secondary_color || '#64748B');
      setCompanyName(branding.company_name || '');
      setCustomDomain(branding.custom_domain || '');
    }
  }, [branding]);

  const handleSave = () => {
    updateBranding({
      logo_url: logoUrl,
      primary_color: primaryColor,
      secondary_color: secondaryColor,
      company_name: companyName,
      custom_domain: customDomain,
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/workspaces')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Configurações do Workspace</h1>
          <p className="text-muted-foreground mt-1">
            Personalize a marca e aparência
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              White Label
            </CardTitle>
            <CardDescription>
              Personalize a marca do seu workspace
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="companyName">Nome da Empresa</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Sua Empresa"
              />
            </div>
            <div>
              <Label htmlFor="logoUrl">URL do Logo</Label>
              <Input
                id="logoUrl"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://exemplo.com/logo.png"
              />
            </div>
            <div>
              <Label htmlFor="customDomain">Domínio Personalizado</Label>
              <Input
                id="customDomain"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                placeholder="app.suaempresa.com"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Configure o DNS para apontar para nossos servidores
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cores</CardTitle>
            <CardDescription>
              Defina as cores da sua marca
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="primaryColor">Cor Primária</Label>
              <div className="flex gap-2">
                <Input
                  id="primaryColor"
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-20 h-10"
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  placeholder="#3B82F6"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="secondaryColor">Cor Secundária</Label>
              <div className="flex gap-2">
                <Input
                  id="secondaryColor"
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="w-20 h-10"
                />
                <Input
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  placeholder="#64748B"
                />
              </div>
            </div>
            <div className="p-4 border rounded-lg" style={{ backgroundColor: primaryColor }}>
              <p className="text-white font-medium">Preview das Cores</p>
              <p className="text-white/80 text-sm" style={{ color: secondaryColor }}>
                Texto secundário
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} size="lg">
          <Save className="h-4 w-4 mr-2" />
          Salvar Alterações
        </Button>
      </div>
    </div>
  );
}
