# 🗺️ ROADMAP - AdMetrics Dashboard

## 📋 Visão Geral do Planejamento

Este documento descreve o planejamento estratégico para o desenvolvimento contínuo do **AdMetrics Dashboard**. O roadmap está dividido em 4 fases principais, com duração total estimada de **10-13 semanas**.

### Objetivos Estratégicos
1. **Estabilidade:** Corrigir bugs críticos e garantir confiabilidade
2. **Experiência:** Melhorar UX/UI e responsividade
3. **Expansão:** Adicionar novas funcionalidades e integrações
4. **Escalabilidade:** Otimizar performance e preparar para crescimento

---

## 🎯 Fase 1: Correções Críticas e Estabilização

**Duração:** 1-2 semanas  
**Prioridade:** CRÍTICA  
**Objetivo:** Resolver bugs que impedem funcionalidades core

### 1.1 Implementar Sincronização Google Ads Metrics
**Problema:** Edge function `sync-google-ads-metrics` não faz chamadas reais à API.

**Tarefas:**
- [ ] **[Backend]** Implementar query GAQL (Google Ads Query Language)
  - Endpoint: `https://googleads.googleapis.com/v17/customers/{customer_id}/googleAds:searchStream`
  - Campos: campaign.id, metrics.impressions, metrics.clicks, metrics.cost_micros, segments.date
  - Período: últimos 30 dias
- [ ] **[Backend]** Mapear métricas Google → schema interno
  - cost_micros → spend (converter de micros para unidade)
  - Calcular CTR e CPC
- [ ] **[Backend]** Implementar tratamento de erros e retry logic
- [ ] **[Testes]** Testar com conta Google Ads real
- [ ] **[Documentação]** Atualizar README com setup Google Ads

**Recursos Necessários:**
- Developer Token Google Ads (solicitar aprovação se não tiver)
- Conta Google Ads de testes com campanhas ativas
- 1 desenvolvedor backend (8-12 horas)

**Critério de Sucesso:**
- Métricas Google Ads aparecem no dashboard
- Sincronização sem erros em sync_logs
- Comparação Meta vs Google funcional

---

### 1.2 Criar Edge Function para Metric Breakdowns
**Problema:** Tabela `metric_breakdowns` criada mas não populada.

**Tarefas:**
- [ ] **[Backend]** Criar `sync-meta-metrics-breakdown/index.ts`
  - Fazer 3 chamadas separadas (age, gender, device_platform)
  - Endpoint: `{campaign_id}/insights?breakdowns={type}`
  - Inserir em `metric_breakdowns` com UPSERT
- [ ] **[Backend]** Adicionar aos scheduled syncs
- [ ] **[Frontend]** Testar filtros de breakdown na página Métricas
- [ ] **[Testes]** Validar dados de todas as segmentações

**Recursos Necessários:**
- 1 desenvolvedor fullstack (6-8 horas)
- Conta Meta Ads com campanhas com segmentação configurada

**Critério de Sucesso:**
- Filtros de breakdown retornam dados reais
- Tabela `metric_breakdowns` populada
- Performance aceitável (< 2s para carregar)

---

### 1.3 Configurar Secrets do Supabase
**Problema:** Secrets Facebook/Google não configurados em produção.

**Tarefas:**
- [ ] **[DevOps]** Configurar secrets via Supabase Dashboard
  ```bash
  FACEBOOK_APP_ID=xxxxx
  FACEBOOK_APP_SECRET=xxxxx
  GOOGLE_CLIENT_ID=xxxxx
  GOOGLE_CLIENT_SECRET=xxxxx
  GOOGLE_ADS_DEVELOPER_TOKEN=xxxxx
  GOOGLE_ADS_REFRESH_TOKEN=xxxxx (se necessário)
  ```
- [ ] **[Segurança]** Validar que tokens não estão expostos no código
- [ ] **[Testes]** Testar OAuth flow em staging e produção

**Recursos Necessários:**
- Acesso admin ao Supabase
- Apps configurados em Meta/Google

**Critério de Sucesso:**
- Integrações funcionam em produção
- Nenhum erro de "missing secret" em logs

---

### 1.4 Testes de Integração Completos
**Problema:** Fluxo completo de sincronização não testado end-to-end.

**Tarefas:**
- [ ] **[QA]** Criar plano de testes
  - Conectar conta Meta → sincronizar → validar dados
  - Conectar conta Google → sincronizar → validar dados
  - Testar token refresh automático
- [ ] **[QA]** Executar testes manuais em staging
- [ ] **[Dev]** Corrigir bugs encontrados
- [ ] **[Docs]** Documentar fluxos testados

**Recursos Necessários:**
- 1 QA (4-6 horas)
- Ambiente staging funcional
- Contas de teste Meta/Google

**Critério de Sucesso:**
- 100% dos fluxos críticos funcionando
- Documento de casos de teste criado

---

## 🎨 Fase 2: Melhorias de UX/UI

**Duração:** 2-3 semanas  
**Prioridade:** ALTA  
**Objetivo:** Melhorar experiência do usuário e interface

### 2.1 Gráficos Comparativos por Segmentação
**Descrição:** Adicionar gráficos que comparam performance entre segmentos.

**Tarefas:**
- [ ] **[Frontend]** Criar componente `BreakdownComparisonChart`
  - Gráfico de barras comparando age ranges
  - Gráfico de pizza para gender
  - Linha do tempo por device
- [ ] **[Frontend]** Adicionar ao dashboard como novo widget
- [ ] **[Design]** Criar mockups das visualizações
- [ ] **[Frontend]** Implementar tooltips informativos

**Recursos Necessários:**
- 1 desenvolvedor frontend (10-12 horas)
- 1 designer UI/UX (4 horas)
- Biblioteca: Recharts (já instalada)

**Critério de Sucesso:**
- Usuário consegue comparar performance por segmento visualmente
- Gráficos responsivos e acessíveis

---

### 2.2 Notificações em Tempo Real
**Descrição:** Implementar sistema de notificações push para alertas.

**Tarefas:**
- [ ] **[Frontend]** Integrar Supabase Realtime em todos os contextos
- [ ] **[Frontend]** Criar componente `NotificationCenter`
  - Badge com contador
  - Lista de notificações não lidas
  - Marcar como lida
- [ ] **[Backend]** Criar trigger em `campaign_alerts` para enviar notification
- [ ] **[Frontend]** Adicionar som/vibração (opcional)

**Recursos Necessários:**
- 1 desenvolvedor fullstack (8-10 horas)
- Supabase Realtime habilitado

**Critério de Sucesso:**
- Notificações aparecem instantaneamente
- Usuário pode marcar como lidas
- Performance não impactada

---

### 2.3 Responsividade Mobile
**Descrição:** Otimizar experiência em dispositivos móveis.

**Tarefas:**
- [ ] **[Auditoria]** Testar todas as páginas em mobile (360px, 375px, 414px)
- [ ] **[Frontend]** Ajustar layouts com breakpoints Tailwind
  - Dashboard: stacks widgets em mobile
  - Tabelas: scroll horizontal ou cards
  - Filtros: collapse em accordion
- [ ] **[Frontend]** Adicionar navegação mobile (hamburger menu)
- [ ] **[Testes]** Testar em dispositivos reais (iOS/Android)

**Recursos Necessários:**
- 1 desenvolvedor frontend (12-16 horas)
- Dispositivos de teste (ou BrowserStack)

**Critério de Sucesso:**
- 100% das funcionalidades acessíveis em mobile
- Performance (Lighthouse) > 80 em mobile

---

### 2.4 Skeleton Loaders e Estados de Loading
**Descrição:** Melhorar percepção de performance com loaders.

**Tarefas:**
- [ ] **[Frontend]** Criar componentes skeleton para:
  - Dashboard widgets
  - Tabelas de campanhas
  - Gráficos de métricas
- [ ] **[Frontend]** Implementar estados de erro amigáveis
- [ ] **[Design]** Criar animações de loading suaves

**Recursos Necessários:**
- 1 desenvolvedor frontend (6-8 horas)
- Componentes shadcn/ui `Skeleton`

**Critério de Sucesso:**
- Nenhum estado vazio sem feedback visual
- Transições suaves entre loading e conteúdo

---

## 🚀 Fase 3: Novas Funcionalidades

**Duração:** 3-4 semanas  
**Prioridade:** MÉDIA  
**Objetivo:** Expandir capacidades da plataforma

### 3.1 Relatórios Automáticos por Email
**Descrição:** Enviar relatórios semanais/mensais automaticamente.

**Tarefas:**
- [ ] **[Backend]** Criar edge function `send-scheduled-reports`
  - Gerar PDF via `pdfExport.ts`
  - Enviar via SendGrid/Resend
- [ ] **[Backend]** Criar tabela `report_schedules`
  - user_id, frequency, recipients, template_id, is_active
- [ ] **[Frontend]** Criar página de configuração de relatórios
  - Escolher frequência (semanal, mensal)
  - Adicionar emails de destinatários
  - Preview do relatório
- [ ] **[Backend]** Configurar cron job no Supabase

**Recursos Necessários:**
- 1 desenvolvedor fullstack (16-20 horas)
- Serviço de email (SendGrid/Resend)
- Supabase Cron Jobs

**Critério de Sucesso:**
- Relatórios enviados automaticamente
- Usuário pode gerenciar schedules
- Emails não vão para spam

---

### 3.2 Integração com TikTok Ads
**Descrição:** Adicionar suporte para TikTok Ads API.

**Tarefas:**
- [ ] **[Pesquisa]** Estudar TikTok Ads API
- [ ] **[Backend]** Adicionar `'tiktok'` ao enum `integration_provider`
- [ ] **[Backend]** Criar edge functions:
  - `sync-tiktok-campaigns`
  - `sync-tiktok-metrics`
- [ ] **[Frontend]** Criar página `TikTokAds.tsx` com OAuth flow
- [ ] **[Frontend]** Atualizar `useMetrics` para agregar TikTok
- [ ] **[Testes]** Testar com conta TikTok Ads de teste

**Recursos Necessários:**
- 1 desenvolvedor fullstack (20-24 horas)
- TikTok for Business Developer App
- Conta TikTok Ads de teste

**Critério de Sucesso:**
- Campanhas TikTok sincronizadas
- Métricas aparecem no dashboard
- Comparação Meta vs Google vs TikTok

---

### 3.3 API Pública para Integrações Externas
**Descrição:** Expor endpoints REST para integrações de terceiros.

**Tarefas:**
- [ ] **[Backend]** Criar edge functions RESTful:
  - `GET /api/campaigns` - Lista campanhas
  - `GET /api/metrics` - Retorna métricas agregadas
  - `POST /api/webhooks` - Recebe eventos externos
- [ ] **[Segurança]** Implementar autenticação via API Key
  - Criar tabela `api_keys` (user_id, key, name, permissions)
- [ ] **[Docs]** Criar documentação OpenAPI (Swagger)
- [ ] **[Frontend]** Criar página de gerenciamento de API Keys

**Recursos Necessários:**
- 1 desenvolvedor backend (24-30 horas)
- Ferramenta de docs (Scalar, Swagger UI)

**Critério de Sucesso:**
- API documentada e testável
- Rate limiting implementado
- Webhooks funcionais

---

### 3.4 Dashboard White-Label para Agências
**Descrição:** Permitir customização total do branding.

**Tarefas:**
- [ ] **[Frontend]** Estender `workspace_branding`:
  - Custom domain (CNAME)
  - Logo no login/dashboard
  - Cores primárias/secundárias em todas as páginas
  - Favicon customizado
- [ ] **[Backend]** Criar lógica de multi-tenancy por domínio
- [ ] **[DevOps]** Configurar DNS e SSL para custom domains
- [ ] **[Frontend]** Criar wizard de configuração de branding

**Recursos Necessários:**
- 1 desenvolvedor fullstack (20-24 horas)
- 1 designer (8 horas)
- Cloudflare ou similar para DNS

**Critério de Sucesso:**
- Agência pode usar próprio domínio
- Branding customizado em 100% da interface
- Processo de setup em < 10 minutos

---

## ⚡ Fase 4: Otimização e Escalabilidade

**Duração:** 2-3 semanas  
**Prioridade:** MÉDIA  
**Objetivo:** Preparar para crescimento e otimizar performance

### 4.1 Implementar Cache com React Query
**Descrição:** Reduzir chamadas desnecessárias ao backend.

**Tarefas:**
- [ ] **[Frontend]** Configurar `staleTime` e `cacheTime` em todos os queries
  ```typescript
  // Exemplo: métricas ficam "fresh" por 5 minutos
  useQuery({
    queryKey: ['metrics', ...],
    staleTime: 5 * 60 * 1000,
    cacheTime: 30 * 60 * 1000
  });
  ```
- [ ] **[Frontend]** Implementar invalidação seletiva
  - Após sync, invalidar apenas queries de métricas
  - Após editar campanha, invalidar apenas essa campanha
- [ ] **[Frontend]** Adicionar prefetching em navegação
- [ ] **[Testes]** Medir impacto com React Query Devtools

**Recursos Necessários:**
- 1 desenvolvedor frontend (8-10 horas)

**Critério de Sucesso:**
- Redução de 50%+ em chamadas ao backend
- Navegação mais fluida

---

### 4.2 Otimizar Queries do Banco de Dados
**Descrição:** Melhorar performance de queries lentas.

**Tarefas:**
- [ ] **[Backend]** Analisar queries com `EXPLAIN ANALYZE`
- [ ] **[Backend]** Adicionar índices:
  ```sql
  CREATE INDEX idx_metrics_campaign_date ON metrics(campaign_id, date);
  CREATE INDEX idx_campaigns_account_status ON campaigns(ad_account_id, status);
  CREATE INDEX idx_metric_breakdowns_campaign ON metric_breakdowns(campaign_id, breakdown_type);
  ```
- [ ] **[Backend]** Otimizar RPC `get_detailed_metrics`
  - Adicionar filtro por data na query
  - Usar `COALESCE` para evitar NULL em agregações
- [ ] **[Backend]** Implementar materialização de views para dashboards

**Recursos Necessários:**
- 1 desenvolvedor backend (12-16 horas)
- Acesso ao Supabase Database

**Critério de Sucesso:**
- Queries principais < 500ms
- Dashboard carrega em < 2s

---

### 4.3 Adicionar Testes E2E com Playwright
**Descrição:** Garantir qualidade com testes automatizados.

**Tarefas:**
- [ ] **[QA]** Instalar e configurar Playwright
  ```bash
  npm install -D @playwright/test
  npx playwright install
  ```
- [ ] **[QA]** Criar testes críticos:
  - Login → Dashboard → Ver métricas
  - Conectar conta Meta → Sincronizar → Validar dados
  - Criar relatório → Exportar PDF
- [ ] **[QA]** Configurar CI para rodar testes em PRs
- [ ] **[QA]** Criar relatórios de cobertura

**Recursos Necessários:**
- 1 QA/Desenvolvedor (16-20 horas)
- GitHub Actions ou similar

**Critério de Sucesso:**
- 80%+ de cobertura em fluxos críticos
- Testes rodando em CI/CD

---

### 4.4 Configurar CI/CD com GitHub Actions
**Descrição:** Automatizar deploy e testes.

**Tarefas:**
- [ ] **[DevOps]** Criar workflows:
  - `.github/workflows/test.yml` - Rodar testes em PR
  - `.github/workflows/deploy.yml` - Deploy automático em main
- [ ] **[DevOps]** Configurar ambientes:
  - Staging (branch `develop`)
  - Production (branch `main`)
- [ ] **[DevOps]** Adicionar checks obrigatórios:
  - Testes passando
  - Lint sem erros
  - Build com sucesso
- [ ] **[DevOps]** Configurar notificações (Slack/Discord)

**Recursos Necessários:**
- 1 desenvolvedor DevOps (8-12 horas)
- Supabase CLI configurado

**Critério de Sucesso:**
- Deploy automático em < 5 minutos
- Rollback fácil em caso de erro
- Notificações de deploy

---

## 📊 Resumo do Roadmap

| Fase | Duração | Prioridade | Entregas Principais |
|------|---------|-----------|---------------------|
| **Fase 1: Correções Críticas** | 1-2 semanas | CRÍTICA | Google Ads sync, Breakdowns, Secrets |
| **Fase 2: UX/UI** | 2-3 semanas | ALTA | Gráficos comparativos, Notificações, Mobile |
| **Fase 3: Novas Funcionalidades** | 3-4 semanas | MÉDIA | Relatórios email, TikTok, API, White-label |
| **Fase 4: Otimização** | 2-3 semanas | MÉDIA | Cache, DB optimization, E2E tests, CI/CD |
| **TOTAL** | **10-13 semanas** | - | - |

---

## 🎯 Métricas de Sucesso

### KPIs por Fase

**Fase 1:**
- ✅ 0 bugs críticos abertos
- ✅ 100% das integrações funcionais
- ✅ Sync logs sem erros

**Fase 2:**
- ✅ NPS > 8/10
- ✅ Lighthouse Mobile > 80
- ✅ Tempo médio em página +30%

**Fase 3:**
- ✅ +3 integrações disponíveis
- ✅ 20% dos usuários usando API
- ✅ 50% das agências usando white-label

**Fase 4:**
- ✅ Tempo de carregamento -50%
- ✅ 80% cobertura de testes E2E
- ✅ Deploy time < 5 min

---

## 👥 Recursos Necessários

### Equipe Recomendada
- **1 Tech Lead / Arquiteto** (part-time)
- **2 Desenvolvedores Fullstack** (full-time)
- **1 Designer UI/UX** (part-time)
- **1 QA Engineer** (part-time)
- **1 DevOps** (part-time)

### Ferramentas e Serviços
- **Desenvolvimento:** GitHub, VS Code, Supabase CLI
- **Design:** Figma
- **Testes:** Playwright, React Query Devtools
- **CI/CD:** GitHub Actions
- **Monitoramento:** Sentry, LogRocket (recomendado)
- **Email:** SendGrid ou Resend
- **DNS:** Cloudflare

### Custos Estimados (Mensal)
- Supabase Pro: $25/mês
- SendGrid: $19/mês
- Cloudflare: Gratuito
- GitHub Actions: Incluído no GitHub
- **Total:** ~$50/mês (excluindo equipe)

---

## 🔄 Processo de Revisão

### Sprints Quinzenais
- **Sprint Planning:** Segunda-feira (1h)
- **Daily Standups:** 15 min (async ou sync)
- **Sprint Review:** Sexta-feira (1h)
- **Retrospectiva:** Sexta-feira (30 min)

### Gates de Qualidade
Antes de avançar para próxima fase:
1. ✅ Todos os testes passando
2. ✅ Code review aprovado
3. ✅ Documentação atualizada
4. ✅ Stakeholder sign-off

---

## 📅 Timeline Visual

```
Semana 1-2:  [████████] Fase 1: Correções Críticas
Semana 3-5:  [████████] Fase 2: UX/UI
Semana 6-9:  [████████] Fase 3: Novas Funcionalidades
Semana 10-12:[████████] Fase 4: Otimização
Semana 13:   [████████] Buffer / Documentação Final
```

---

## 🚦 Próximos Passos Imediatos

### Esta Semana
1. [ ] Reunião de kickoff com equipe
2. [ ] Priorizar tarefas da Fase 1
3. [ ] Configurar secrets do Supabase
4. [ ] Iniciar implementação Google Ads sync

### Próximo Mês
1. [ ] Concluir Fase 1 completa
2. [ ] Iniciar Fase 2 (UX/UI)
3. [ ] Contratar designer (se necessário)

---

## 📞 Contato e Feedback

Para dúvidas ou sugestões sobre o roadmap:
- **Email:** dev@admetrics.com
- **Slack:** #roadmap-discussion
- **GitHub Discussions:** [Link]

---

**Última atualização:** 2025-01-25  
**Versão do Roadmap:** 1.0.0  
**Próxima revisão:** 2025-02-08
