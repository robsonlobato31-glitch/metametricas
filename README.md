# AdMetrics Dashboard

## 📋 Descrição Geral

**AdMetrics Dashboard** é uma plataforma SaaS completa para gestão, análise e otimização de campanhas de anúncios digitais, integrando **Meta Ads** e **Google Ads** em um único painel centralizado.

### Objetivo Principal
Fornecer aos anunciantes, agências e profissionais de marketing digital uma visão unificada e detalhada do desempenho de suas campanhas, com métricas em tempo real, alertas de orçamento, relatórios personalizados e dashboards configuráveis.

### Contexto de Criação
Desenvolvido para resolver a fragmentação de dados entre plataformas de anúncios, o projeto oferece:
- Sincronização automática de campanhas e métricas
- Análise comparativa entre plataformas
- Segmentação por idade, gênero e dispositivo
- Sistema de alertas e monitoramento de budget
- Workspaces colaborativos para equipes

---

## 🏗️ Arquitetura e Tecnologias

### Stack Tecnológico

**Frontend:**
- React 18.3.1 com TypeScript
- Vite (build tool)
- Tailwind CSS + shadcn/ui (design system)
- TanStack Query v5 (gerenciamento de estado e cache)
- React Router v6 (roteamento)
- Recharts (visualização de dados)
- jsPDF + html2canvas (exportação de relatórios)

**Backend:**
- Supabase (BaaS)
  - PostgreSQL (banco de dados)
  - Edge Functions (Deno runtime)
  - Auth (autenticação)
  - Row Level Security (RLS)
  - Realtime (subscriptions)

**Integrações Externas:**
- Meta Graph API v21.0
- Google Ads API (em implementação)
- Google OAuth 2.0

### Estrutura de Diretórios

```
📦 admetrics-dashboard/
├── 📁 src/
│   ├── 📁 components/
│   │   ├── 📁 dashboard/         # Widgets e grid customizável
│   │   ├── 📁 filters/           # Componentes de filtro
│   │   ├── 📁 onboarding/        # Tour guiado e checklist
│   │   ├── 📁 plans/             # Gerenciamento de planos
│   │   ├── 📁 reports/           # Exportação PDF
│   │   ├── 📁 settings/          # Configurações
│   │   └── 📁 ui/                # 40+ componentes shadcn/ui
│   ├── 📁 contexts/              # AuthContext, RealtimeAlertsContext
│   ├── 📁 hooks/                 # 25+ custom hooks
│   ├── 📁 integrations/supabase/ # Cliente Supabase
│   ├── 📁 lib/                   # Utilitários
│   ├── 📁 pages/                 # 18 páginas
│   └── 📁 types/                 # Tipos TypeScript
├── 📁 supabase/
│   ├── 📁 functions/             # 6 Edge Functions
│   └── 📁 migrations/            # Migrações SQL
```

---

## 🗄️ Banco de Dados (Supabase PostgreSQL)

### Tabelas Principais

- **integrations** - Conexões OAuth com Meta/Google
- **ad_accounts** - Contas de anúncios sincronizadas
- **campaigns** - Campanhas sincronizadas
- **metrics** - Métricas diárias por campanha
- **metric_breakdowns** - Métricas segmentadas (idade, gênero, dispositivo)
- **campaign_alerts** - Alertas de orçamento
- **user_plans** - Planos de assinatura
- **dashboard_layouts** - Layouts personalizados
- **user_column_preferences** - Preferências de colunas
- **workspaces** - Workspaces colaborativos
- **sync_logs** - Histórico de sincronizações

### Funções RPC

- `get_detailed_metrics` - Métricas agregadas por provider
- `get_user_plan` - Informações do plano do usuário
- `has_role` - Verificação de permissões

---

## ⚙️ Funcionalidades Implementadas

✅ Autenticação (Email/Password, Google OAuth)  
✅ Integração Meta Ads (campanhas e métricas)  
⚠️ Integração Google Ads (parcial)  
✅ Dashboard personalizável com 8 widgets  
✅ Análise de métricas com filtros avançados  
✅ Monitoramento de orçamento com alertas  
✅ Exportação de relatórios PDF  
✅ Workspaces colaborativos  
✅ Sistema de planos (Survival, Professional, Agency, Enterprise)  
✅ Agendamento de sincronizações  

---

## 🐛 Bugs Conhecidos

| Bug | Prioridade | Status |
|-----|-----------|--------|
| Google Ads metrics não sincronizam | Alta | Pendente |
| Metric breakdowns não populados | Média | Pendente |
| Secrets não configurados em produção | Alta | Pendente |

**Veja detalhes completos no arquivo principal.**

---

## 🚀 Instalação e Execução

### Pré-requisitos
- Node.js 18+
- Conta Supabase
- Meta for Developers App (opcional)
- Google Cloud Project (opcional)

### Quick Start

```bash
# 1. Clonar repositório
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# 2. Instalar dependências
npm install

# 3. Configurar .env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...

# 4. Executar
npm run dev
```

### Deploy

Acesse [Lovable](https://lovable.dev/projects/fcbd94ca-4420-40b3-914d-1035141bbabc) e clique em Share → Publish.

---

## 📚 Documentação Completa

Para documentação técnica detalhada, incluindo:
- Diagramas de arquitetura
- Fluxos de dados completos
- Guia de desenvolvimento
- Padrões de código
- Troubleshooting

**Consulte os arquivos de documentação adicionais no repositório.**

---

## 🗺️ Roadmap

Veja o arquivo `ROADMAP.md` para planejamento detalhado das próximas 10-13 semanas, incluindo:
- Fase 1: Correções Críticas (1-2 semanas)
- Fase 2: Melhorias UX/UI (2-3 semanas)
- Fase 3: Novas Funcionalidades (3-4 semanas)
- Fase 4: Otimização (2-3 semanas)

---

## 📄 Licença

MIT License

---

**URL do Projeto:** https://lovable.dev/projects/fcbd94ca-4420-40b3-914d-1035141bbabc  
**Última atualização:** 2025-01-25
