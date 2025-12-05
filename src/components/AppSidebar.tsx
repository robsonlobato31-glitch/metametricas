import {
  LayoutDashboard,
  Target,
  BarChart3,
  Facebook,
  Chrome,
  Bell,
  Settings,
  Users,
  LogOut,
  Building2,
  CreditCard,
  FileText,
  Megaphone
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useRealtimeAlertsContext } from '@/contexts/RealtimeAlertsContext';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

const mainItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Métricas', url: '/metricas', icon: BarChart3 },
  { title: 'Relatórios', url: '/relatorios', icon: FileText },
];

const integrationItems = [
  { title: 'Meta Ads', url: '/meta-ads', icon: Facebook },
  { title: 'Campanhas Meta Ads', url: '/campanhas', icon: Target },
  { title: 'Google Ads', url: '/google-ads', icon: Chrome },
  { title: 'Campanhas Google Ads', url: '/google-ads/campanhas', icon: Megaphone },
];


// Menu items configuration
const settingsItems = [
  { title: 'Alertas', url: '/alerta-gasto', icon: Bell },
  { title: 'Dashboard Orçamento', url: '/budget-dashboard', icon: BarChart3 },
  { title: 'Workspaces', url: '/workspaces', icon: Building2 },
  { title: 'Planos', url: '/plans', icon: CreditCard },
  { title: 'Configurações', url: '/settings', icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { isSuperAdmin, isAdmin } = useUserRole();
  const { newAlertsCount } = useRealtimeAlertsContext();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;
  const collapsed = state === 'collapsed';

  const userInitials = user?.email?.[0]?.toUpperCase() || 'U';

  return (
    <Sidebar collapsible="icon" className={collapsed ? 'w-16' : 'w-60'}>
      {/* Header com logo */}
      <div className="flex items-center justify-center h-14 border-b px-3">
        {collapsed ? (
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <LayoutDashboard className="h-5 w-5 text-primary-foreground" />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <LayoutDashboard className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">Dashboard</span>
              <span className="text-xs text-muted-foreground">Meta Ads</span>
            </div>
          </div>
        )}
      </div>

      <SidebarContent>
        {/* Menu Principal */}
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="hover:bg-muted/50"
                      activeClassName="bg-muted text-primary font-medium"
                      data-tour={item.title === 'Campanhas' ? 'campaigns' : undefined}
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Integrações */}
        <SidebarGroup data-tour="integrations">
          <SidebarGroupLabel>Integrações</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {integrationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="hover:bg-muted/50"
                      activeClassName="bg-muted text-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Configurações */}
        <SidebarGroup>
          <SidebarGroupLabel>Configurações</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="hover:bg-muted/50"
                      activeClassName="bg-muted text-primary font-medium"
                      data-tour={
                        item.title === 'Alertas' ? 'alerts' :
                          item.title === 'Configurações' ? 'settings' :
                            undefined
                      }
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </div>
                      {item.url === '/alerta-gasto' && newAlertsCount > 0 && !collapsed && (
                        <span className="ml-auto bg-destructive text-destructive-foreground text-xs font-semibold px-2 py-0.5 rounded-full">
                          {newAlertsCount}
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* Admin Link */}
              {(isSuperAdmin || isAdmin) && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/admin/users"
                      end
                      className="hover:bg-muted/50"
                      activeClassName="bg-muted text-primary font-medium"
                    >
                      <Users className="h-4 w-4" />
                      {!collapsed && <span>Usuários (Admin)</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer com usuário */}
      <SidebarFooter className="border-t p-3">
        <div className={cn("flex items-center gap-2", collapsed && "justify-center")}>
          <Avatar className="h-8 w-8">
            <AvatarFallback>{userInitials}</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user?.email}
                </p>
                {isSuperAdmin && (
                  <p className="text-xs text-muted-foreground">Super Admin</p>
                )}
                {isAdmin && !isSuperAdmin && (
                  <p className="text-xs text-muted-foreground">Admin</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={signOut}
                title="Sair"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
