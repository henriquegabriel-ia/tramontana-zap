# Plano de Teste QA - SmartZap

**URL:** https://smartzap.escoladeautomacao.com.br
**Senha de login:** h2so4nh3
**Data de criação:** 2026-03-06
**Gerado por:** Análise automatizada do código-fonte

---

## Instruções para execução

Este plano foi desenhado para ser executado pelo Claude Code Web (extensão com browser real).
Para cada teste, siga as instruções, tire screenshot da tela, e anote o resultado (OK/FALHA/PARCIAL).

### Arquitetura do app (contexto para testes)
- **Stack:** Next.js 16 (App Router) + React 19 + Supabase + Upstash QStash
- **209 API routes**, **62 hooks**, **19 services**
- **Single-tenant:** Sem cadastro de usuários, login por senha master
- **Padrão:** Page (RSC) → Hook (controller) → Service (fetch) → API Route → Supabase
- **Sidebar:** 9 itens: Dashboard, Campanhas, Inbox, Templates, Contatos, IA, Configurações
  (Workflows = beta/dev-mode only)
- **Realtime:** Supabase Realtime em campanhas, contatos, templates, inbox

---

## 1. LOGIN E AUTENTICAÇÃO

### TC-001: Exibição da página de login
**Passos:**
1. Acesse https://smartzap.escoladeautomacao.com.br/login
2. Tire screenshot da página completa

**Verificar:**
- [ ] Logo "S" (ícone verde esmeralda) visível no topo
- [ ] Título "SmartZap" ou nome da empresa visível
- [ ] Subtítulo "Entre para continuar" presente
- [ ] Campo de senha com placeholder "Senha" e ícone de cadeado
- [ ] Botão de mostrar/ocultar senha (ícone de olho)
- [ ] Botão "Entrar" com ícone de login (verde esmeralda)
- [ ] Footer com "SmartZap © 2026 | Escola de Automação | by @thaleslaray"
- [ ] Link para escoladeautomacao.com.br funcionando
- [ ] Link para instagram.com/thaleslaray funcionando

### TC-002: Login com senha incorreta
**Passos:**
1. Na página de login, digite "senha_errada_123"
2. Clique em "Entrar"
3. Tire screenshot

**Verificar:**
- [ ] Mensagem de erro aparece (texto vermelho)
- [ ] Permanece na página de login
- [ ] Campo de senha não é limpo
- [ ] Botão "Entrar" volta ao estado normal (sem loading infinito)

### TC-003: Login com senha correta
**Passos:**
1. Na página de login, digite "h2so4nh3"
2. Clique em "Entrar"
3. Aguarde redirecionamento
4. Tire screenshot do dashboard

**Verificar:**
- [ ] Loading spinner aparece no botão durante autenticação
- [ ] Redirecionamento para o Dashboard (página inicial "/")
- [ ] Dashboard carrega com dados

### TC-004: Toggle mostrar/ocultar senha
**Passos:**
1. Na página de login, digite qualquer texto na senha
2. Clique no ícone de olho (Eye)
3. Tire screenshot mostrando a senha visível
4. Clique novamente para ocultar

**Verificar:**
- [ ] Senha alterna entre tipo "password" e "text"
- [ ] Ícone alterna entre Eye e EyeOff

---

## 2. DASHBOARD (HOME)

### TC-005: Dashboard - Visão geral
**Passos:**
1. Após login, acesse "/"
2. Tire screenshot da página completa

**Verificar:**
- [ ] Título "Dashboard" no topo
- [ ] Descrição "Visão geral da performance de mensagens"
- [ ] Botão "Campanha Rápida" (verde) no canto superior direito
- [ ] 4 cards de estatísticas visíveis:
  - "Total Enviado" (ícone Send, azul)
  - "Taxa de Entrega" (ícone TrendingUp, verde)
  - "Falhas" (ícone AlertCircle, vermelho)
  - "Taxa de Leitura" (ícone CheckCircle2, amarelo)
- [ ] Gráfico de área (Recharts) com dados de envios
- [ ] Seletor de período: "7D", "15D", "30D"
- [ ] Seção de campanhas recentes (lista com links)

### TC-006: Dashboard - Seletor de período do gráfico
**Passos:**
1. No dashboard, clique em "15D"
2. Tire screenshot
3. Clique em "30D"
4. Tire screenshot

**Verificar:**
- [ ] Gráfico atualiza ao mudar período
- [ ] Botão selecionado fica destacado visualmente

### TC-007: Dashboard - Link "Campanha Rápida"
**Passos:**
1. No dashboard, clique no botão "Campanha Rápida"

**Verificar:**
- [ ] Navega para /campaigns/new

---

## 3. CAMPANHAS

### TC-008: Lista de campanhas
**Passos:**
1. Navegue para /campaigns via sidebar ou URL
2. Tire screenshot

**Verificar:**
- [ ] Título "Campanhas" visível
- [ ] Campo de busca (Search) funcionando
- [ ] Filtros por status: Todos, Rascunho, Agendado, Enviando, Concluído, Falhou, Pausado
- [ ] Filtro por pasta (CampaignFolderFilter)
- [ ] Filtro por tag (CampaignTagFilter)
- [ ] Botão de refresh (RefreshCw)
- [ ] Tabela/cards de campanhas com colunas:
  - Nome da campanha
  - Status (badge colorido)
  - Progresso (barra)
  - Data
- [ ] Paginação no final da lista

### TC-009: Ações em campanhas individuais
**Passos:**
1. Na lista de campanhas, localize uma campanha existente
2. Abra o menu de ações (botão "..." ou MoreHorizontal)
3. Tire screenshot do menu

**Verificar:**
- [ ] Opção "Duplicar" (Copy icon) disponível
- [ ] Opção "Excluir" (Trash2 icon) disponível
- [ ] Para campanhas SENDING: botão "Pausar" (Pause icon)
- [ ] Para campanhas PAUSED: botão "Retomar" (Play icon)
- [ ] Para campanhas DRAFT/SCHEDULED: botão "Iniciar" (Play icon)
- [ ] Opção "Mover para pasta" (MoveToFolderButton)

### TC-010: Criar nova campanha (wizard de 4 etapas)
**Passos:**
1. Acesse /campaigns/new
2. Tire screenshot de CADA etapa do wizard (4 etapas)

**Verificar:**
- [ ] **Etapa 1 - Identificação:**
  - Campo "Nome da campanha" (text input)
  - Campo "Descrição" (textarea)
  - Seletor de pasta (dropdown)
  - Seletor de tags (multi-select/combobox)
- [ ] **Etapa 2 - Template:**
  - Grid de cards de templates disponíveis com preview
  - Campos de substituição de variáveis ({{1}}, {{2}}, etc.)
  - Preview visual da mensagem
- [ ] **Etapa 3 - Audiência:**
  - Lista de contatos com busca e filtro por status/tag
  - Checkbox de seleção por contato
  - Paginação da lista
  - Botão "Editar contato rápido" (ContactQuickEditModal)
  - Botão "Campos personalizados" (CustomFieldsSheet)
  - Contagem de contatos selecionados
- [ ] **Etapa 4 - Agendamento/Envio:**
  - Toggle de agendamento (checkbox)
  - DateTimePicker + Calendar para data/hora
  - Preview final (resumo: template + audiência + agenda)
- [ ] Botões "Anterior" e "Próximo" entre etapas
- [ ] Progress indicator de 4 passos no topo
- [ ] Botão final "Criar Campanha" / "Agendar"
- [ ] Botão "Cancelar" volta para lista

### TC-011: Detalhes de campanha
**Passos:**
1. Clique em uma campanha existente na lista
2. Tire screenshot da página de detalhes (/campaigns/[id])

**Verificar:**
- [ ] Informações da campanha (nome, status, template)
- [ ] Estatísticas: enviados, entregues, lidos, falhos
- [ ] Lista de contatos da campanha com status individual
- [ ] Barra de progresso
- [ ] Botões de ação (Pausar/Retomar/Iniciar conforme status)

---

## 4. CONTATOS

### TC-012: Lista de contatos
**Passos:**
1. Navegue para /contacts
2. Tire screenshot

**Verificar:**
- [ ] Título "Contatos"
- [ ] Cards de estatísticas no topo (ContactStats):
  - Total de contatos
  - Opt-in
  - Opt-out
  - Suprimidos
- [ ] Campo de busca
- [ ] Filtro por status: Todos, Opt-in, Opt-out, Suprimidos
- [ ] Filtro por tag
- [ ] Tabela de contatos com colunas: Nome, Telefone, Status, Tags, Data
- [ ] Checkbox de seleção em cada linha
- [ ] Paginação

### TC-013: Botões de ação de contatos
**Passos:**
1. Na página de contatos, tire screenshot dos botões na barra superior

**Verificar:**
- [ ] Botão "Adicionar" (Plus icon) - abre ContactAddModal
- [ ] Botão "Importar" (UploadCloud icon) - abre ContactImportModal
- [ ] Botão "Exportar" (Download icon)
- [ ] Botão "Campos Personalizados" (FileText) - abre CustomFieldsSheet
- [ ] Botão "Tags" (Tag icon)

### TC-014: Adicionar contato manualmente
**Passos:**
1. Clique no botão "Adicionar"
2. Tire screenshot do modal (ContactAddModal)

**Verificar:**
- [ ] Modal com campos: Nome, Telefone (E.164), Status
- [ ] Campo de tags
- [ ] Botão "Salvar" e "Cancelar"
- [ ] Validação de telefone funciona

### TC-015: Importar contatos (CSV)
**Passos:**
1. Clique no botão "Importar"
2. Tire screenshot do modal de importação

**Verificar:**
- [ ] Área de upload de arquivo CSV
- [ ] Mapeamento de colunas
- [ ] Preview dos dados
- [ ] Opção de importar como opt-in/opt-out
- [ ] Botão "Importar"

### TC-016: Seleção em massa de contatos
**Passos:**
1. Selecione múltiplos contatos usando checkboxes
2. Tire screenshot da barra de seleção (ContactSelectionBanner)

**Verificar:**
- [ ] Banner de seleção aparece com contagem
- [ ] Botão "Selecionar todos"
- [ ] Botão "Limpar seleção"
- [ ] Botão "Excluir selecionados" (Trash2)
- [ ] Botão "Tags em massa" (ContactBulkTagsModal)
- [ ] Botão "Alterar status em massa" (ContactBulkStatusModal)

### TC-017: Editar contato
**Passos:**
1. Clique em um contato na lista
2. Tire screenshot do modal de edição (ContactEditModal)

**Verificar:**
- [ ] Campos pré-preenchidos com dados do contato
- [ ] Possibilidade de editar nome, status, tags
- [ ] Campos personalizados editáveis
- [ ] Botão "Salvar" e "Cancelar"

### TC-018: Excluir contato
**Passos:**
1. Clique no botão de excluir de um contato
2. Tire screenshot do modal de confirmação (ContactDeleteModal)

**Verificar:**
- [ ] Modal de confirmação com mensagem clara
- [ ] Botão "Confirmar" e "Cancelar"

---

## 5. TEMPLATES

### TC-019: Lista de templates
**Passos:**
1. Navegue para /templates
2. Tire screenshot

**Verificar:**
- [ ] Header com título e botões de ação
- [ ] Botão "Sincronizar" (RefreshCw) para sincronizar com Meta
- [ ] Filtros:
  - Busca por nome
  - Filtro por categoria (MARKETING, UTILIDADE, AUTENTICAÇÃO)
  - Filtro por status (APPROVED, PENDING, REJECTED)
- [ ] Contadores de status visíveis
- [ ] Tabela de templates com preview on hover (TemplateHoverPreview)
- [ ] Checkbox de seleção multi-template
- [ ] Barra de ações em massa (SelectionActionBar) quando itens selecionados

### TC-020: Sincronizar templates com Meta
**Passos:**
1. Clique no botão "Sincronizar"
2. Aguarde conclusão

**Verificar:**
- [ ] Loading indicator aparece
- [ ] Templates são atualizados da Meta
- [ ] Contador de templates atualiza

### TC-021: Detalhes de template
**Passos:**
1. Clique em um template na lista
2. Tire screenshot do modal de detalhes (TemplateDetailsModal)

**Verificar:**
- [ ] Nome do template
- [ ] Status do template
- [ ] Categoria
- [ ] Idioma
- [ ] Componentes (header, body, footer, buttons)
- [ ] Preview visual do template
- [ ] Botão "Atualizar preview" (RefreshPreview)

### TC-022: Excluir template
**Passos:**
1. Clique no botão de excluir de um template
2. Tire screenshot do modal (DeleteConfirmModal)

**Verificar:**
- [ ] Confirmação antes de excluir
- [ ] Aviso de que vai excluir na Meta também

### TC-023: Geração em massa com IA
**Passos:**
1. Clique no botão de geração em massa (Upload icon)
2. Tire screenshot do BulkGenerationModal

**Verificar:**
- [ ] Campo de tipo de negócio (bulkBusinessType)
- [ ] Seleção de categorias
- [ ] Quantidade de templates a gerar
- [ ] Seleção de idioma
- [ ] Campos de URL e telefone universais
- [ ] Botão "Gerar"
- [ ] Lista de templates gerados com toggle de seleção

### TC-024: Criar template com IA (wizard de 6 etapas)
**Passos:**
1. Acesse /templates/new
2. Tire screenshot de CADA etapa

**Verificar:**
- [ ] **Etapa 1 - Paste:** Textarea para colar conteúdo bruto (descrição de produto, copy marketing)
- [ ] **Etapa 2 - Extract:** Campos auto-preenchidos pela IA (nome, tipo, preço, benefícios, CTA)
- [ ] **Etapa 3 - Strategy:** 3 opções: Marketing, Utility, Camuflado (radio buttons com descrições)
- [ ] **Etapa 4 - Config:** Prompt customizado (textarea), Quantidade (1-10), Idioma (pt_BR, en_US, etc.)
- [ ] **Etapa 5 - Generating:** Loading/progress da geração IA
- [ ] **Etapa 6 - Review:** Grid de templates gerados, cada um com botões Aprovar/Rejeitar/Editar/Copiar
- [ ] Botão "Salvar Projeto" após revisão
- [ ] Progress indicator de 6 passos

### TC-024b: Criar template manualmente (drafts)
**Passos:**
1. Acesse /templates/drafts/new
2. Tire screenshot do builder

**Verificar:**
- [ ] Editor de template com campos de header, body, footer
- [ ] Seleção de tipo de header (text, image, video, document)
- [ ] Editor de variáveis {{1}}, {{2}}, etc.
- [ ] Lista de botões CTA (CTAButtonList) e Quick Reply (QuickReplyButtonList)
- [ ] Preview em tempo real
- [ ] Botão "Salvar rascunho" e "Enviar para Meta"

---

## 6. FLUXOS (MINIAPPS)

### TC-025: Lista de fluxos
**Passos:**
1. Navegue para /flows
2. Tire screenshot

**Verificar:**
- [ ] Campo de busca "Nome ou ID da MiniApp (Meta)"
- [ ] Campo "Criar nova MiniApp" com input de nome
- [ ] Botão "Criar" (Plus icon)
- [ ] Botão "Criar a partir de template" (CreateFlowFromTemplateDialog)
- [ ] Botão "Criar com IA" (CreateFlowWithAIDialog)
- [ ] Botão de refresh
- [ ] Tabela de fluxos existentes com:
  - Nome
  - Status (badge)
  - Data de criação/atualização
  - Botão "Abrir" (ArrowRight)
  - Botão "Excluir" (Trash2)

### TC-026: Builder de fluxo
**Passos:**
1. Clique em "Abrir" em um fluxo existente (ou crie um novo)
2. Tire screenshot do builder (/flows/builder/[id])

**Verificar:**
- [ ] Canvas do builder de fluxos (workflow visual)
- [ ] Nós disponíveis: start, message, template, menu, input, condition, delay, ai_agent, handoff, end
- [ ] Conexões entre nós (drag and drop)
- [ ] Painel de propriedades ao clicar em um nó
- [ ] Botão de salvar
- [ ] Botão de publicar

---

## 7. INBOX (CAIXA DE ENTRADA)

### TC-027: Inbox - Layout split
**Passos:**
1. Navegue para /inbox
2. Tire screenshot

**Verificar:**
- [ ] Layout dividido em 2 painéis (ResizablePanelGroup):
  - Esquerda: Lista de conversas (ConversationList)
  - Direita: Painel de mensagens (MessagePanel)
- [ ] Handle de resize invisível entre painéis
- [ ] Header com contagem de não lidas (totalUnread)
- [ ] Botão de refresh (RefreshCw)

### TC-028: Inbox - Lista de conversas
**Passos:**
1. Tire screenshot do painel esquerdo

**Verificar:**
- [ ] Campo de busca de conversas
- [ ] Filtro por status (aberta, fechada)
- [ ] Filtro por modo (bot, humano)
- [ ] Filtro por label
- [ ] Lista de conversas com:
  - Nome/telefone do contato
  - Última mensagem
  - Horário
  - Badge de não lida
  - Labels coloridos

### TC-029: Inbox - Painel de mensagens
**Passos:**
1. Selecione uma conversa
2. Tire screenshot do painel direito

**Verificar:**
- [ ] Histórico de mensagens (enviadas e recebidas)
- [ ] Campo de digitação de mensagem
- [ ] Botão enviar
- [ ] Quick replies disponíveis
- [ ] Ações no header:
  - Toggle modo (bot/humano) - onModeToggle
  - Fechar conversa - onCloseConversation
  - Alterar prioridade - onPriorityChange
  - Adicionar/remover labels - onLabelToggle
- [ ] Botão "Carregar mensagens anteriores" (se houver)

---

## 8. WORKFLOWS

### TC-030: Página de workflows
**Passos:**
1. Navegue para /workflows
2. Tire screenshot

**Verificar:**
- [ ] Lista de workflows configurados
- [ ] Botões de ação (criar, editar, excluir)
- [ ] Status dos workflows (ativo/inativo)

---

## 9. FORMULÁRIOS (LEAD FORMS)

### TC-031: Lista de formulários
**Passos:**
1. Navegue para /forms
2. Tire screenshot

**Verificar:**
- [ ] Lista de formulários de captura (FormList)
- [ ] Botão "Criar formulário" (abre CreateFormDialog)
- [ ] Para cada formulário:
  - Nome
  - Slug
  - Link público (copiável via useCopyToClipboard)
  - Botão "Editar" (abre EditFormDialog)
  - Botão "Excluir"

### TC-032: Criar formulário
**Passos:**
1. Clique em "Criar formulário"
2. Tire screenshot do dialog

**Verificar:**
- [ ] Campo de nome
- [ ] Campo de slug (auto-gerado via slugify)
- [ ] Seleção de tags para aplicar nos leads
- [ ] Botão "Criar" e "Cancelar"

---

## 10. SUBMISSÕES

### TC-033: Lista de submissões
**Passos:**
1. Navegue para /submissions
2. Tire screenshot

**Verificar:**
- [ ] Tabela de submissões de templates enviados para aprovação Meta
- [ ] Status de cada submissão
- [ ] Detalhes visualizáveis (SubmissionDetailView)

---

## 11. CONFIGURAÇÕES

### TC-034: Configurações gerais
**Passos:**
1. Navegue para /settings
2. Tire screenshot completa (scroll down)

**Verificar:**
- [ ] **StatusCard**: Status da conexão WhatsApp
- [ ] **CredentialsForm**: Campos para Token, Phone ID, Business Account ID
  - Modo edição (toggle isEditing)
  - Botão "Testar conexão"
  - Botão "Salvar" e "Desconectar"
- [ ] **WebhookConfigSection**: URL do webhook, token, estatísticas
  - Botão "Inscrever mensagens" / "Desinscrever"
  - Lista de números de telefone (PhoneNumbersList)
- [ ] **TurboConfigSection**: Configurações de throttle WhatsApp
- [ ] **AutoSuppressionPanel**: Configurações de auto-supressão de contatos
- [ ] **TestContactPanel**: Contato de teste (salvar no Supabase)
- [ ] **CalendarBookingPanel**: Configuração de agendamento de calendário
- [ ] **WorkflowExecutionPanel**: Configuração global de execução de workflow
- [ ] **FlowEndpointPanel**: Endpoint dos flows
- [ ] **UpstashConfigPanel**: Configurações do QStash/Upstash (métricas)
- [ ] **ApiDocsPanel**: Documentação da API (visível em DevMode)

### TC-035: Configurações de IA
**Passos:**
1. Navegue para /settings/ai
2. Tire screenshot (scroll completo)

**Verificar:**
- [ ] **OCR Model selector:** 4 opções de modelo Gemini (radio/botões)
- [ ] **Helicone integration:** Toggle enable/disable + campo API key (masked)
- [ ] **Mem0 integration:** Toggle enable/disable + campo API key (masked)
- [ ] **Seção de Prompts:** Lista de prompts editáveis, cada um com:
  - Botão "Editar prompt" (abre editor modal/textarea)
  - Botão "Reset to default"
  - Botão "Copiar prompt"
- [ ] **Seção de Strategies:** Marketing, Utility, Bypass (badges coloridos)
- [ ] Lista de variáveis disponíveis (collapsible)

### TC-036: Agentes de IA
**Passos:**
1. Navegue para /settings/ai/agents
2. Tire screenshot

**Verificar:**
- [ ] **Toggle global** para ativar/desativar todos os agentes
- [ ] Lista de agentes configurados (AIAgentsSettingsView):
  - Nome, Status toggle, Badge "Default", Botões de ação
- [ ] Botão "+ Novo Agente" (abre AIAgentForm modal)
- [ ] Para cada agente: Editar, Excluir, Definir como padrão, Toggle ativo
- [ ] **Aba Knowledge Base (KB):**
  - Upload de documentos (file upload)
  - Adicionar texto (text input)
  - Lista de itens KB com busca e delete
- [ ] **Aba Test Chat:**
  - Interface de chat para testar respostas do agente
  - Campo de input + botão enviar
  - Botão "Limpar chat"
  - Botão "Copiar Agent ID"

### TC-037: Atendentes
**Passos:**
1. Navegue para /settings/attendants
2. Tire screenshot

**Verificar:**
- [ ] Lista de atendentes com token de acesso
- [ ] Botão "+ Novo Atendente" (gera token)
- [ ] Para cada atendente:
  - Nome (editável inline)
  - Token (masked/unmasked toggle + botão copiar)
  - ID (botão copiar)
  - Checkboxes de permissões: Ver contatos, Enviar mensagens, Gerenciar campanhas, Ver relatórios, Gerenciar settings
  - Botão "Excluir" com confirmação

### TC-038: Meta Diagnósticos
**Passos:**
1. Navegue para /settings/meta-diagnostics
2. Tire screenshot

**Verificar:**
- [ ] Painel de diagnósticos Meta (MetaDiagnosticsView)
- [ ] Status da conexão com Meta API
- [ ] Informações de saúde da conta
- [ ] Alertas ativos

### TC-039: Performance
**Passos:**
1. Navegue para /settings/performance
2. Tire screenshot

**Verificar:**
- [ ] Métricas de performance (SettingsPerformanceView)
- [ ] Gráficos de uso
- [ ] Estatísticas de envio

---

## 12. NAVEGAÇÃO (SIDEBAR)

### TC-040: Sidebar - Itens de menu
**Passos:**
1. Em qualquer página, tire screenshot da sidebar (menu lateral)

**Verificar:**
- [ ] Logo/marca SmartZap no topo
- [ ] Links de navegação presentes (9 itens no código):
  - Dashboard (LayoutDashboard icon) → `/`
  - Campanhas (MessageSquare icon) → `/campaigns`
  - Inbox (MessageCircle icon, com badge de não lidas) → `/inbox`
  - Templates (FileText icon) → `/templates`
  - Contatos (Users icon) → `/contacts`
  - IA (Sparkles icon) → `/settings/ai`
  - Configurações (Settings icon) → `/settings`
  - *Workflows (Workflow icon) → somente em Dev Mode (beta)*
- [ ] Botão "Nova Campanha" com gradiente verde na sidebar expandida
- [ ] Ícones corretos para cada item (lucide-react)
- [ ] Item ativo destacado visualmente
- [ ] Badge de não lidas no Inbox (InboxUnreadBadge)
- [ ] Sidebar collapsa: CompactSidebar (56px, ícones only) vs ExpandedSidebar (14rem)
- [ ] Botão expand/collapse da sidebar
- [ ] Seção de perfil no rodapé com botão de logout
- [ ] Tooltips nos ícones quando sidebar está compacta
- [ ] Prefetch de dados ao hover sobre links (Dashboard, Campanhas, Templates, Contatos, Settings)

### TC-041: Sidebar - Navegação entre páginas
**Passos:**
1. Clique em cada item da sidebar e verifique se a página correta é carregada
2. Tire screenshot mostrando a transição

**Verificar:**
- [ ] Cada link navega para a rota correta
- [ ] Loading skeleton aparece durante carregamento
- [ ] Sem erros no console

---

## 13. RESPONSIVIDADE

### TC-042: Responsividade mobile
**Passos:**
1. Reduza a janela do browser para tamanho mobile (375px width)
2. Tire screenshot de:
   - Página de login
   - Dashboard
   - Lista de campanhas (CampaignCardList em vez de tabela)
   - Contatos
   - Inbox

**Verificar:**
- [ ] Layout se adapta corretamente
- [ ] Campanhas mostram cards em vez de tabela (useIsMobile hook)
- [ ] Sidebar se transforma em menu hamburger
- [ ] Inbox mostra apenas lista OU mensagens (não ambos)
- [ ] Botões e inputs não ficam cortados
- [ ] Texto legível sem scroll horizontal

---

## 14. TEMA E DESIGN

### TC-043: Tema escuro (padrão)
**Passos:**
1. Tire screenshot de qualquer página

**Verificar:**
- [ ] Background escuro (zinc-800/900/950)
- [ ] Texto claro e legível
- [ ] Cor primária esmeralda/verde (primary-400/500/600)
- [ ] Cards com bordas sutis
- [ ] Ícones lucide-react consistentes

---

## 15. TESTES DE ERROR HANDLING

### TC-044: Acessar página inexistente
**Passos:**
1. Acesse /pagina-que-nao-existe

**Verificar:**
- [ ] Página 404 exibida
- [ ] Opção de voltar ao dashboard

### TC-045: Sessão expirada
**Passos:**
1. Faça login
2. Limpe os cookies manualmente
3. Tente navegar para /campaigns

**Verificar:**
- [ ] Redirecionamento para /login
- [ ] Mensagem clara sobre sessão expirada

---

## 16. API HEALTH CHECK E ENDPOINTS PÚBLICOS

### TC-046: Health check endpoint
**Passos:**
1. Abra o DevTools (F12) > Network
2. Acesse /api/health diretamente na barra de endereço

**Verificar:**
- [ ] Retorna JSON com `overall: 'healthy' | 'degraded' | 'unhealthy'`
- [ ] Inclui status dos serviços: `database`, `qstash`, `whatsapp`, `webhook`
- [ ] Não requer autenticação (endpoint público)

### TC-047: Auth status endpoint
**Passos:**
1. Acesse /api/auth/status (sem login)

**Verificar:**
- [ ] Retorna JSON com: `isConfigured`, `isSetup`, `isAuthenticated`, `company`
- [ ] Não requer autenticação
- [ ] Não vaza dados sensíveis

### TC-048: Console errors check
**Passos:**
1. Após login, abra DevTools > Console
2. Navegue por: Dashboard → Campanhas → Contatos → Templates → Settings
3. Tire screenshot do console em cada página

**Verificar:**
- [ ] Sem erros JavaScript no console (exceto warnings conhecidos)
- [ ] Sem erros de rede 4xx/5xx inesperados
- [ ] Sem erros de CORS ou mixed content

---

## 17. SHELL DO DASHBOARD (DashboardShell)

### TC-049: Header e elementos globais
**Passos:**
1. Em qualquer página autenticada, tire screenshot do header

**Verificar:**
- [ ] Breadcrumb de navegação
- [ ] Botão de notificações (sino)
- [ ] Toggle de tema (claro/escuro)
- [ ] Toggle Dev Mode (se disponível)
- [ ] Onboarding banner/modal (se primeiro acesso)
- [ ] Guided tour após primeira conexão WhatsApp

### TC-050: Logout
**Passos:**
1. Na sidebar expandida, localize a seção de perfil no rodapé
2. Clique no botão de logout

**Verificar:**
- [ ] Redireciona para /login
- [ ] Sessão é limpa (não volta ao dashboard sem re-login)

---

## Resumo de Elementos Interativos por Página

| Página | Botões Principais | Modals/Dialogs | Filtros |
|--------|-------------------|----------------|---------|
| Login | Entrar, Toggle senha | - | - |
| Dashboard | Campanha Rápida | - | 7D/15D/30D |
| Campanhas | Refresh, Duplicar, Excluir, Pausar, Retomar, Iniciar | Delete confirm | Status, Pasta, Tag, Busca |
| Campanha Nova | Voltar, Próximo, Criar | - | - |
| Contatos | Adicionar, Importar, Exportar, Campos, Tags, Excluir | Add, Import, Edit, Delete, BulkTags, BulkStatus | Status, Tag, Busca |
| Templates | Sincronizar, Gerar IA, Excluir, Bulk delete | Details, Delete, BulkGeneration, BulkDelete | Categoria, Status, Busca |
| Fluxos | Criar, Template, IA, Excluir, Refresh | CreateFlow, CreateFromTemplate, CreateWithAI | Busca |
| Inbox | Refresh, Enviar, Modo, Fechar, Label | - | Status, Modo, Label, Busca |
| Formulários | Criar, Editar, Excluir, Copiar link | Create, Edit | - |
| Submissões | - | Detail | - |
| Configurações | Testar, Salvar, Desconectar, Inscrever, +15 botões | - | DevMode |
| Settings IA | Config provedor | - | - |
| Agentes IA | Criar, Editar, Excluir | Create/Edit | - |
| Atendentes | Adicionar, Editar | - | - |
| Meta Diag | Refresh | - | - |
| Performance | - | - | - |

---

## Prioridade de Execução

**Total: 50 test cases (TC-001 a TC-050)**

1. **CRÍTICO** (executar primeiro):
   - TC-001 a TC-003 (Login/autenticação)
   - TC-046, TC-047 (API health)
   - TC-050 (Logout)

2. **ALTA** (fluxo principal):
   - TC-005, TC-006 (Dashboard)
   - TC-008, TC-009 (Campanhas lista)
   - TC-012, TC-013 (Contatos lista)
   - TC-019, TC-020 (Templates lista/sync)
   - TC-027, TC-028, TC-029 (Inbox)
   - TC-034 (Configurações gerais)
   - TC-040, TC-041 (Sidebar/navegação)
   - TC-049 (Shell/header)

3. **MÉDIA** (CRUD e funcionalidades):
   - TC-010 (Wizard campanha 4 etapas)
   - TC-011 (Detalhes campanha)
   - TC-014, TC-015, TC-016 (Contatos CRUD/import/bulk)
   - TC-021, TC-023, TC-024 (Templates detalhes/IA)
   - TC-025, TC-026 (Fluxos/builder)
   - TC-031, TC-032 (Formulários)
   - TC-035, TC-036 (Settings IA/Agents)

4. **BAIXA** (edge cases):
   - TC-004 (Toggle senha)
   - TC-017, TC-018 (Edit/delete contato)
   - TC-022, TC-024b (Delete/draft template)
   - TC-030, TC-033 (Workflows/submissões)
   - TC-037, TC-038, TC-039 (Atendentes/Meta/Performance)
   - TC-042, TC-043 (Responsividade/tema)
   - TC-044, TC-045, TC-048 (Error handling/console)
