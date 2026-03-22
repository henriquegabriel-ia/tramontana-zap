'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings,
  Link,
  Unlink,
  Plus,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  ChevronDown,
  Zap,
  ArrowRight,
  Eye,
  EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { Container } from '@/components/ui/container';
import { SectionHeader } from '@/components/ui/section-header';
import { StatusBadge } from '@/components/ui/status-badge';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface RDStatus {
  marketing: { connected: boolean };
  crm: { connected: boolean; hasPipeline: boolean };
}

interface PipelineStage {
  id: string;
  name: string;
}

interface Pipeline {
  id: string;
  name: string;
  stages: PipelineStage[];
}

interface StageAction {
  id: string;
  stageId: string;
  stageName: string;
  type: 'template' | 'text';
  templateName?: string;
  message?: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function RDStationPanel() {
  // ---- Connection status ----
  const [status, setStatus] = useState<RDStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  // ---- CRM token ----
  const [crmToken, setCrmToken] = useState('');
  const [showCrmToken, setShowCrmToken] = useState(false);
  const [savingToken, setSavingToken] = useState(false);

  // ---- Pipelines ----
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [pipelinesLoading, setPipelinesLoading] = useState(false);
  const [selectedPipelineId, setSelectedPipelineId] = useState('');
  const [selectedStageId, setSelectedStageId] = useState('');
  const [autoCreateDeal, setAutoCreateDeal] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  // ---- Stage actions ----
  const [stageActions, setStageActions] = useState<StageAction[]>([]);
  const [showActionForm, setShowActionForm] = useState(false);
  const [editingActionId, setEditingActionId] = useState<string | null>(null);
  const [actionStageId, setActionStageId] = useState('');
  const [actionType, setActionType] = useState<'template' | 'text'>('template');
  const [actionTemplateName, setActionTemplateName] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [savingAction, setSavingAction] = useState(false);

  // ---- Webhook ----
  const [webhookCopied, setWebhookCopied] = useState(false);
  const [webhookSecret, setWebhookSecret] = useState('');

  // ---- Derived ----
  const selectedPipeline = pipelines.find((p) => p.id === selectedPipelineId);
  const stages = selectedPipeline?.stages ?? [];
  const webhookUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/integrations/rd-station/webhook`
      : '';

  /* ---------------------------------------------------------------- */
  /*  Fetchers                                                         */
  /* ---------------------------------------------------------------- */

  const fetchStatus = useCallback(async () => {
    try {
      setStatusLoading(true);
      const res = await fetch('/api/integrations/rd-station/status', { cache: 'no-store' });
      if (!res.ok) throw new Error();
      const data: RDStatus = await res.json();
      setStatus(data);
    } catch {
      toast.error('Erro ao verificar status do RD Station');
    } finally {
      setStatusLoading(false);
    }
  }, []);

  const fetchPipelines = useCallback(async () => {
    try {
      setPipelinesLoading(true);
      const res = await fetch('/api/integrations/rd-station/pipelines', { cache: 'no-store' });
      if (!res.ok) throw new Error();
      const data: Pipeline[] = await res.json();
      setPipelines(data);
      if (data.length > 0 && !selectedPipelineId) {
        setSelectedPipelineId(data[0].id);
        if (data[0].stages.length > 0) {
          setSelectedStageId(data[0].stages[0].id);
        }
      }
    } catch {
      toast.error('Erro ao carregar pipelines');
    } finally {
      setPipelinesLoading(false);
    }
  }, [selectedPipelineId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (status?.crm.connected) {
      fetchPipelines();
    }
  }, [status?.crm.connected, fetchPipelines]);

  /* ---------------------------------------------------------------- */
  /*  Handlers                                                         */
  /* ---------------------------------------------------------------- */

  const handleConnectMarketing = () => {
    window.location.href = '/api/integrations/rd-station/connect';
  };

  const handleDisconnect = async () => {
    try {
      const res = await fetch('/api/integrations/rd-station/disconnect', { method: 'POST' });
      if (!res.ok) throw new Error();
      toast.success('RD Station desconectado');
      await fetchStatus();
    } catch {
      toast.error('Erro ao desconectar');
    }
  };

  const handleSaveCrmToken = async () => {
    if (!crmToken.trim()) {
      toast.error('Informe o token do CRM');
      return;
    }
    setSavingToken(true);
    try {
      const res = await fetch('/api/settings/rd-station', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ crmToken }),
      });
      if (!res.ok) throw new Error();
      toast.success('Token CRM salvo com sucesso');
      await fetchStatus();
    } catch {
      toast.error('Erro ao salvar token CRM');
    } finally {
      setSavingToken(false);
    }
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      const res = await fetch('/api/settings/rd-station', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pipelineId: selectedPipelineId,
          stageId: selectedStageId,
          autoCreateDeal,
          stageActions,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success('Configuracao salva com sucesso');
    } catch {
      toast.error('Erro ao salvar configuracao');
    } finally {
      setSavingConfig(false);
    }
  };

  const resetActionForm = () => {
    setActionStageId('');
    setActionType('template');
    setActionTemplateName('');
    setActionMessage('');
    setEditingActionId(null);
    setShowActionForm(false);
  };

  const handleSaveAction = () => {
    if (!actionStageId) {
      toast.error('Selecione um stage');
      return;
    }
    if (actionType === 'template' && !actionTemplateName.trim()) {
      toast.error('Informe o nome do template');
      return;
    }
    if (actionType === 'text' && !actionMessage.trim()) {
      toast.error('Informe a mensagem');
      return;
    }

    const stage = stages.find((s) => s.id === actionStageId);
    const action: StageAction = {
      id: editingActionId || crypto.randomUUID(),
      stageId: actionStageId,
      stageName: stage?.name || actionStageId,
      type: actionType,
      templateName: actionType === 'template' ? actionTemplateName : undefined,
      message: actionType === 'text' ? actionMessage : undefined,
    };

    if (editingActionId) {
      setStageActions((prev) => prev.map((a) => (a.id === editingActionId ? action : a)));
    } else {
      setStageActions((prev) => [...prev, action]);
    }

    resetActionForm();
    toast.success('Automacao salva');
  };

  const handleEditAction = (action: StageAction) => {
    setActionStageId(action.stageId);
    setActionType(action.type);
    setActionTemplateName(action.templateName || '');
    setActionMessage(action.message || '');
    setEditingActionId(action.id);
    setShowActionForm(true);
  };

  const handleDeleteAction = (id: string) => {
    setStageActions((prev) => prev.filter((a) => a.id !== id));
    toast.success('Automacao removida');
  };

  const handleCopyWebhook = async () => {
    await navigator.clipboard.writeText(webhookUrl);
    setWebhookCopied(true);
    toast.success('URL copiada!');
    setTimeout(() => setWebhookCopied(false), 2000);
  };

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  if (statusLoading) {
    return (
      <div className="glass-panel rounded-2xl p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 bg-white/5 rounded-lg" />
          <div className="h-20 bg-white/5 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-2xl p-8 space-y-8">
      {/* ============================================================ */}
      {/* Section 1: Conexao RD Station                                */}
      {/* ============================================================ */}
      <section>
        <SectionHeader
          title="Conexao RD Station"
          description="Conecte sua conta do RD Station Marketing e CRM."
          color="brand"
          icon={Link}
          actions={
            (status?.marketing.connected || status?.crm.connected) && (
              <button
                type="button"
                onClick={handleDisconnect}
                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
              >
                <Unlink size={12} />
                Desconectar
              </button>
            )
          }
          className="mb-6"
        />

        {/* Marketing API status */}
        <Container variant="subtle" padding="sm" className="mb-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-[var(--ds-text-primary)]">Marketing API</div>
              <div className="mt-1">
                <StatusBadge status={status?.marketing.connected ? 'success' : 'default'} showDot>
                  {status?.marketing.connected ? 'Conectado' : 'Desconectado'}
                </StatusBadge>
              </div>
            </div>
            {!status?.marketing.connected && (
              <button
                type="button"
                onClick={handleConnectMarketing}
                className="h-9 px-4 rounded-lg bg-purple-600 text-white hover:bg-purple-500 text-xs font-medium transition-colors inline-flex items-center gap-2"
              >
                <Link size={14} />
                Conectar Marketing API
              </button>
            )}
          </div>
        </Container>

        {/* CRM status + token */}
        <Container variant="subtle" padding="sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-[var(--ds-text-primary)]">CRM</div>
              <div className="mt-1">
                <StatusBadge status={status?.crm.connected ? 'success' : 'default'} showDot>
                  {status?.crm.connected ? 'Conectado' : 'Desconectado'}
                </StatusBadge>
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <label className="text-xs text-[var(--ds-text-secondary)]">Token CRM</label>
            <div className="relative">
              <input
                type={showCrmToken ? 'text' : 'password'}
                value={crmToken}
                onChange={(e) => setCrmToken(e.target.value)}
                placeholder="Cole o token do RD Station CRM"
                className="w-full bg-[var(--ds-bg-surface)] border border-[var(--ds-border-default)] rounded-xl px-4 py-3 pr-10 text-sm text-[var(--ds-text-primary)] placeholder:text-[var(--ds-text-muted)]"
              />
              <button
                type="button"
                onClick={() => setShowCrmToken((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ds-text-muted)] hover:text-[var(--ds-text-primary)] transition-colors"
              >
                {showCrmToken ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <button
              type="button"
              onClick={handleSaveCrmToken}
              disabled={savingToken}
              className="h-9 px-4 rounded-lg bg-purple-600 text-white hover:bg-purple-500 text-xs font-medium transition-colors inline-flex items-center gap-2 disabled:opacity-50"
            >
              {savingToken ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
              {savingToken ? 'Salvando...' : 'Salvar Token CRM'}
            </button>
          </div>
        </Container>
      </section>

      {/* ============================================================ */}
      {/* Section 2: Pipeline & Stage Padrao                           */}
      {/* ============================================================ */}
      <section>
        <SectionHeader
          title="Pipeline & Stage Padrao"
          description="Defina o pipeline e stage padrao para novos deals."
          color="brand"
          icon={Settings}
          className="mb-6"
        />

        {pipelinesLoading ? (
          <div className="text-sm text-[var(--ds-text-secondary)]">Carregando pipelines...</div>
        ) : pipelines.length === 0 ? (
          <Container variant="subtle" padding="sm">
            <div className="text-sm text-[var(--ds-text-muted)] text-center py-4">
              {status?.crm.connected
                ? 'Nenhum pipeline encontrado. Verifique sua conta no RD Station CRM.'
                : 'Conecte o CRM para visualizar os pipelines.'}
            </div>
          </Container>
        ) : (
          <div className="space-y-4">
            {/* Pipeline dropdown */}
            <Container variant="subtle" padding="sm">
              <label className="text-xs text-[var(--ds-text-secondary)] mb-2 block">Pipeline</label>
              <div className="relative">
                <select
                  value={selectedPipelineId}
                  onChange={(e) => {
                    setSelectedPipelineId(e.target.value);
                    const pipe = pipelines.find((p) => p.id === e.target.value);
                    if (pipe?.stages.length) {
                      setSelectedStageId(pipe.stages[0].id);
                    } else {
                      setSelectedStageId('');
                    }
                  }}
                  className="w-full bg-[var(--ds-bg-surface)] border border-[var(--ds-border-default)] rounded-xl px-4 py-3 text-sm text-[var(--ds-text-primary)] appearance-none cursor-pointer"
                >
                  {pipelines.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ds-text-muted)] pointer-events-none"
                />
              </div>
            </Container>

            {/* Stage dropdown */}
            <Container variant="subtle" padding="sm">
              <label className="text-xs text-[var(--ds-text-secondary)] mb-2 block">Stage Padrao</label>
              <div className="relative">
                <select
                  value={selectedStageId}
                  onChange={(e) => setSelectedStageId(e.target.value)}
                  className="w-full bg-[var(--ds-bg-surface)] border border-[var(--ds-border-default)] rounded-xl px-4 py-3 text-sm text-[var(--ds-text-primary)] appearance-none cursor-pointer"
                >
                  {stages.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ds-text-muted)] pointer-events-none"
                />
              </div>
            </Container>

            {/* Auto-create deal checkbox */}
            <Container variant="subtle" padding="sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-[var(--ds-text-primary)] flex items-center gap-2">
                    <Zap size={14} />
                    Criar deal automaticamente
                  </div>
                  <p className="text-xs text-[var(--ds-text-muted)] mt-1">
                    Cria um deal quando o contato responder no WhatsApp
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoCreateDeal}
                    onChange={(e) => setAutoCreateDeal(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[var(--ds-bg-surface)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600" />
                </label>
              </div>
            </Container>

            {/* Save button */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveConfig}
                disabled={savingConfig}
                className="h-10 px-6 rounded-lg bg-purple-600 text-white hover:bg-purple-500 transition-colors text-sm font-medium inline-flex items-center gap-2 disabled:opacity-50"
              >
                {savingConfig ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}
                {savingConfig ? 'Salvando...' : 'Salvar Configuracao'}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ============================================================ */}
      {/* Section 3: Mapeamento de Stages -> WhatsApp                  */}
      {/* ============================================================ */}
      <section>
        <SectionHeader
          title="Automacoes por Stage"
          description="Configure mensagens automaticas quando deals mudarem de stage."
          color="brand"
          icon={ArrowRight}
          className="mb-6"
        />

        {/* List of configured actions */}
        {stageActions.length > 0 && (
          <div className="space-y-2 mb-4">
            {stageActions.map((action) => (
              <Container key={action.id} variant="subtle" padding="sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge status="scheduled">{action.stageName}</StatusBadge>
                      <ArrowRight size={12} className="text-[var(--ds-text-muted)]" />
                      <span className="text-xs text-[var(--ds-text-secondary)]">
                        {action.type === 'template'
                          ? `Template: ${action.templateName}`
                          : 'Mensagem de texto'}
                      </span>
                    </div>
                    {action.type === 'text' && action.message && (
                      <p className="mt-1 text-xs text-[var(--ds-text-muted)] truncate">
                        {action.message}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleEditAction(action)}
                      className="p-1.5 rounded-lg text-[var(--ds-text-muted)] hover:text-[var(--ds-text-primary)] hover:bg-[var(--ds-bg-surface)] transition-colors"
                    >
                      <Settings size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteAction(action.id)}
                      className="p-1.5 rounded-lg text-[var(--ds-text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </Container>
            ))}
          </div>
        )}

        {stageActions.length === 0 && !showActionForm && (
          <Container variant="subtle" padding="sm" className="mb-4">
            <div className="text-sm text-[var(--ds-text-muted)] text-center py-4">
              Nenhuma automacao configurada. Adicione uma abaixo.
            </div>
          </Container>
        )}

        {/* Action form */}
        {showActionForm && (
          <Container variant="default" padding="lg" className="mb-4">
            <div className="space-y-4">
              <div className="text-sm font-semibold text-[var(--ds-text-primary)]">
                {editingActionId ? 'Editar Automacao' : 'Nova Automacao'}
              </div>

              {/* Stage select */}
              <div>
                <label className="text-xs text-[var(--ds-text-secondary)] mb-2 block">Stage</label>
                <div className="relative">
                  <select
                    value={actionStageId}
                    onChange={(e) => setActionStageId(e.target.value)}
                    className="w-full bg-[var(--ds-bg-surface)] border border-[var(--ds-border-default)] rounded-xl px-4 py-3 text-sm text-[var(--ds-text-primary)] appearance-none cursor-pointer"
                  >
                    <option value="">Selecione um stage</option>
                    {stages.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ds-text-muted)] pointer-events-none"
                  />
                </div>
              </div>

              {/* Type radio */}
              <div>
                <label className="text-xs text-[var(--ds-text-secondary)] mb-2 block">Tipo de mensagem</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="actionType"
                      value="template"
                      checked={actionType === 'template'}
                      onChange={() => setActionType('template')}
                      className="accent-purple-600"
                    />
                    <span className="text-sm text-[var(--ds-text-primary)]">Enviar Template</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="actionType"
                      value="text"
                      checked={actionType === 'text'}
                      onChange={() => setActionType('text')}
                      className="accent-purple-600"
                    />
                    <span className="text-sm text-[var(--ds-text-primary)]">Enviar Texto</span>
                  </label>
                </div>
              </div>

              {/* Template name or message text */}
              {actionType === 'template' ? (
                <div>
                  <label className="text-xs text-[var(--ds-text-secondary)] mb-2 block">
                    Nome do Template
                  </label>
                  <input
                    type="text"
                    value={actionTemplateName}
                    onChange={(e) => setActionTemplateName(e.target.value)}
                    placeholder="ex: boas_vindas_deal"
                    className="w-full bg-[var(--ds-bg-surface)] border border-[var(--ds-border-default)] rounded-xl px-4 py-3 text-sm text-[var(--ds-text-primary)] placeholder:text-[var(--ds-text-muted)]"
                  />
                </div>
              ) : (
                <div>
                  <label className="text-xs text-[var(--ds-text-secondary)] mb-2 block">
                    Mensagem
                  </label>
                  <textarea
                    value={actionMessage}
                    onChange={(e) => setActionMessage(e.target.value)}
                    placeholder="Ola {{nome}}, seu deal {{deal}} mudou para {{stage}}."
                    rows={3}
                    className="w-full bg-[var(--ds-bg-surface)] border border-[var(--ds-border-default)] rounded-xl px-4 py-3 text-sm text-[var(--ds-text-primary)] placeholder:text-[var(--ds-text-muted)] resize-none"
                  />
                  <p className="mt-1 text-[11px] text-[var(--ds-text-muted)]">
                    Variaveis disponiveis: {'{{nome}}'}, {'{{deal}}'}, {'{{stage}}'}
                  </p>
                </div>
              )}

              {/* Action form buttons */}
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={resetActionForm}
                  className="h-9 px-4 text-sm text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveAction}
                  disabled={savingAction}
                  className="h-9 px-4 rounded-lg bg-purple-600 text-white hover:bg-purple-500 text-xs font-medium transition-colors inline-flex items-center gap-2 disabled:opacity-50"
                >
                  <Check size={14} />
                  Salvar
                </button>
              </div>
            </div>
          </Container>
        )}

        {/* Add automation button */}
        {!showActionForm && (
          <button
            type="button"
            onClick={() => setShowActionForm(true)}
            className="h-9 px-4 rounded-lg border border-dashed border-[var(--ds-border-default)] text-xs text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)] hover:border-purple-500/50 transition-colors inline-flex items-center gap-2 w-full justify-center"
          >
            <Plus size={14} />
            Adicionar Automacao
          </button>
        )}
      </section>

      {/* ============================================================ */}
      {/* Section 4: Webhook                                           */}
      {/* ============================================================ */}
      <section>
        <SectionHeader
          title="Webhook"
          description="URL para receber notificacoes do RD Station via webhook."
          color="info"
          icon={Zap}
          className="mb-6"
        />

        {/* Webhook URL */}
        <Container variant="subtle" padding="sm" className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[var(--ds-text-secondary)]">URL do Webhook</span>
            <button
              type="button"
              onClick={handleCopyWebhook}
              className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
            >
              {webhookCopied ? <Check size={12} /> : <Copy size={12} />}
              {webhookCopied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
          <code className="text-sm text-[var(--ds-text-primary)] font-mono break-all block">
            {webhookUrl}
          </code>
        </Container>

        {/* Webhook Secret (optional) */}
        <Container variant="subtle" padding="sm">
          <label className="text-xs text-[var(--ds-text-secondary)] mb-2 block">
            Webhook Secret (opcional)
          </label>
          <input
            type="text"
            value={webhookSecret}
            onChange={(e) => setWebhookSecret(e.target.value)}
            placeholder="Secret para validar assinatura do webhook"
            className="w-full bg-[var(--ds-bg-surface)] border border-[var(--ds-border-default)] rounded-xl px-4 py-3 text-sm text-[var(--ds-text-primary)] placeholder:text-[var(--ds-text-muted)]"
          />
        </Container>
      </section>
    </div>
  );
}
