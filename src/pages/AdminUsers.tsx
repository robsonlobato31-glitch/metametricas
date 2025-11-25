import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Shield, User, Loader2, Calendar, Settings } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];
type PlanType = Database['public']['Enums']['plan_type'];
type PlanStatus = Database['public']['Enums']['plan_status'];

type UserData = {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  roles: string[];
  plan_type: string | null;
  plan_status: string | null;
  plan_max_accounts: number | null;
  plan_expires_at: string | null;
};

const roleColors: Record<string, string> = {
  super_admin: 'destructive',
  admin: 'default',
  user: 'secondary',
};

const planColors: Record<string, string> = {
  survival: 'secondary',
  professional: 'default',
  agency: 'default',
  enterprise: 'destructive',
};

const AdminUsers = () => {
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_all_users');
      if (error) throw error;
      return data as UserData[];
    },
  });

  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase.rpc('assign_user_role', {
        p_user_id: userId,
        p_role: role,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Role atribuída com sucesso!');
      setIsRoleDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error('Erro ao atribuir role', { description: error.message });
    },
  });

  const removeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase.rpc('remove_user_role', {
        p_user_id: userId,
        p_role: role,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Role removida com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao remover role', { description: error.message });
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: async ({
      userId,
      planType,
      maxAccounts,
      status,
      expiresAt,
    }: {
      userId: string;
      planType: PlanType;
      maxAccounts: number;
      status: PlanStatus;
      expiresAt: string | null;
    }) => {
      const { error } = await supabase.rpc('update_user_plan', {
        p_user_id: userId,
        p_plan_type: planType,
        p_max_accounts: maxAccounts,
        p_status: status,
        p_expires_at: expiresAt,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Plano atualizado com sucesso!');
      setIsPlanDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar plano', { description: error.message });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gerenciamento de Usuários</h1>
          <p className="text-muted-foreground mt-1">Gerencie roles e planos dos usuários</p>
        </div>
        <Badge variant="outline" className="text-sm">
          <Shield className="h-4 w-4 mr-1" />
          Super Admin
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usuários do Sistema</CardTitle>
          <CardDescription>
            Total de {users?.length || 0} usuários cadastrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Último Login</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {user.roles.length > 0 ? (
                          user.roles.map((role) => (
                            <Badge
                              key={role}
                              variant={roleColors[role] as any}
                              className="text-xs"
                            >
                              {role}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            Sem role
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.plan_type ? (
                        <Badge variant={planColors[user.plan_type] as any} className="text-xs">
                          {user.plan_type}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          Sem plano
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.plan_status ? (
                        <Badge
                          variant={user.plan_status === 'active' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {user.plan_status}
                        </Badge>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {user.last_sign_in_at ? (
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(user.last_sign_in_at), 'dd/MM/yyyy HH:mm', {
                            locale: ptBR,
                          })}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Nunca</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Dialog
                          open={isRoleDialogOpen && selectedUser?.id === user.id}
                          onOpenChange={(open) => {
                            setIsRoleDialogOpen(open);
                            if (open) setSelectedUser(user);
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <User className="h-4 w-4 mr-1" />
                              Roles
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Gerenciar Roles</DialogTitle>
                              <DialogDescription>
                                Atribuir ou remover roles para {user.email}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label>Roles Atuais</Label>
                                <div className="flex gap-2 flex-wrap">
                                  {user.roles.map((role) => (
                                    <Badge
                                      key={role}
                                      variant={roleColors[role] as any}
                                      className="cursor-pointer hover:opacity-80"
                                      onClick={() =>
                                        removeRoleMutation.mutate({ userId: user.id, role: role as AppRole })
                                      }
                                    >
                                      {role} ✕
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label>Adicionar Role</Label>
                                <Select
                                  onValueChange={(role: AppRole) =>
                                    assignRoleMutation.mutate({ userId: user.id, role })
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione uma role" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="user">user</SelectItem>
                                    <SelectItem value="admin">admin</SelectItem>
                                    <SelectItem value="super_admin">super_admin</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>

                        <Dialog
                          open={isPlanDialogOpen && selectedUser?.id === user.id}
                          onOpenChange={(open) => {
                            setIsPlanDialogOpen(open);
                            if (open) setSelectedUser(user);
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Settings className="h-4 w-4 mr-1" />
                              Plano
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Atualizar Plano</DialogTitle>
                              <DialogDescription>
                                Modificar o plano de {user.email}
                              </DialogDescription>
                            </DialogHeader>
                            <PlanForm
                              user={user}
                              onSubmit={(values) =>
                                updatePlanMutation.mutate({ userId: user.id, ...values })
                              }
                              isLoading={updatePlanMutation.isPending}
                            />
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const PlanForm = ({
  user,
  onSubmit,
  isLoading,
}: {
  user: UserData;
  onSubmit: (values: any) => void;
  isLoading: boolean;
}) => {
  const [planType, setPlanType] = useState<PlanType>((user.plan_type as PlanType) || 'survival');
  const [status, setStatus] = useState<PlanStatus>((user.plan_status as PlanStatus) || 'active');
  const [maxAccounts, setMaxAccounts] = useState(user.plan_max_accounts?.toString() || '2');

  const planLimits: Record<PlanType, number> = {
    survival: 2,
    professional: 5,
    agency: 20,
    enterprise: 999,
  };

  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label>Tipo de Plano</Label>
        <Select value={planType} onValueChange={(value) => {
          const newPlanType = value as PlanType;
          setPlanType(newPlanType);
          setMaxAccounts(planLimits[newPlanType].toString());
        }}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="survival">Survival (2 contas)</SelectItem>
            <SelectItem value="professional">Professional (5 contas)</SelectItem>
            <SelectItem value="agency">Agency (20 contas)</SelectItem>
            <SelectItem value="enterprise">Enterprise (ilimitado)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Status</Label>
        <Select value={status} onValueChange={(value) => setStatus(value as PlanStatus)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="expired">Expirado</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
            <SelectItem value="suspended">Suspenso</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Máximo de Contas</Label>
        <input
          type="number"
          value={maxAccounts}
          onChange={(e) => setMaxAccounts(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          min="1"
        />
      </div>

      <Button
        onClick={() =>
          onSubmit({
            planType,
            maxAccounts: parseInt(maxAccounts),
            status,
            expiresAt: null,
          })
        }
        disabled={isLoading}
        className="w-full"
      >
        {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Atualizar Plano
      </Button>
    </div>
  );
};

export default AdminUsers;
