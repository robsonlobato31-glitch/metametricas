import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { Plus, Settings, Users, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Workspaces() {
  const { workspaces, isLoading, createWorkspace, deleteWorkspace } = useWorkspaces();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const navigate = useNavigate();

  const handleCreate = () => {
    if (!name || !slug) return;
    createWorkspace({ name, slug });
    setOpen(false);
    setName('');
    setSlug('');
  };

  const generateSlug = (value: string) => {
    const slug = value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setSlug(slug);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Workspaces</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie seus workspaces e organize seus clientes
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Workspace
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Workspace</DialogTitle>
              <DialogDescription>
                Crie um novo workspace para organizar seus projetos
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    generateSlug(e.target.value);
                  }}
                  placeholder="Meu Workspace"
                />
              </div>
              <div>
                <Label htmlFor="slug">Slug (URL)</Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="meu-workspace"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  URL amigável para seu workspace
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={!name || !slug}>
                Criar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Carregando...</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((workspace) => (
            <Card key={workspace.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{workspace.name}</CardTitle>
                    <CardDescription className="mt-1">
                      @{workspace.slug}
                    </CardDescription>
                  </div>
                  <Badge variant="outline">
                    {workspace.workspace_members[0]?.role || 'member'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/workspaces/${workspace.id}/members`)}
                    className="flex-1"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Membros
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/workspaces/${workspace.id}/settings`)}
                    className="flex-1"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Config
                  </Button>
                  {workspace.workspace_members[0]?.role === 'owner' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm('Tem certeza que deseja excluir este workspace?')) {
                          deleteWorkspace(workspace.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
