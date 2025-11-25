import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';
import { useWorkspaceInvites } from '@/hooks/useWorkspaceInvites';
import { ArrowLeft, Mail, Trash2, UserPlus } from 'lucide-react';

export default function WorkspaceMembers() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const { members, updateMemberRole, removeMember } = useWorkspaceMembers(workspaceId);
  const { invites, createInvite, cancelInvite } = useWorkspaceInvites(workspaceId);
  
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'owner' | 'admin' | 'editor' | 'viewer'>('viewer');

  const handleInvite = () => {
    if (!inviteEmail) return;
    createInvite({ email: inviteEmail, role: inviteRole });
    setInviteOpen(false);
    setInviteEmail('');
    setInviteRole('viewer');
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner': return 'default';
      case 'admin': return 'secondary';
      case 'editor': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'accepted': return 'default';
      case 'declined': return 'destructive';
      case 'expired': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/workspaces')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Membros do Workspace</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie membros e convites
          </p>
        </div>
      </div>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">Membros</TabsTrigger>
          <TabsTrigger value="invites">Convites</TabsTrigger>
        </TabsList>

        <TabsContent value="members">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Membros Ativos</CardTitle>
                  <CardDescription>
                    {members.length} {members.length === 1 ? 'membro' : 'membros'}
                  </CardDescription>
                </div>
                <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Convidar
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Convidar Membro</DialogTitle>
                      <DialogDescription>
                        Envie um convite para adicionar um novo membro
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder="email@exemplo.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="role">Permissão</Label>
                        <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as 'owner' | 'admin' | 'editor' | 'viewer')}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="viewer">Viewer - Visualizar</SelectItem>
                            <SelectItem value="editor">Editor - Editar</SelectItem>
                            <SelectItem value="admin">Admin - Administrar</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setInviteOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleInvite} disabled={!inviteEmail}>
                        <Mail className="h-4 w-4 mr-2" />
                        Enviar Convite
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Permissão</TableHead>
                    <TableHead>Desde</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>{member.user_id}</TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(member.role)}>
                          {member.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(member.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right">
                        {member.role !== 'owner' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm('Remover este membro?')) {
                                removeMember(member.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invites">
          <Card>
            <CardHeader>
              <CardTitle>Convites Pendentes</CardTitle>
              <CardDescription>
                {invites.length} {invites.length === 1 ? 'convite' : 'convites'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Permissão</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expira em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invites.map((invite) => (
                    <TableRow key={invite.id}>
                      <TableCell>{invite.email}</TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(invite.role)}>
                          {invite.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(invite.status)}>
                          {invite.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(invite.expires_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right">
                        {invite.status === 'pending' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => cancelInvite(invite.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {invites.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Nenhum convite pendente
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
