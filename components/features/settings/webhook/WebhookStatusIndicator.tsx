'use client';

import React from 'react';
import { CheckCircle2, XCircle, Loader2, RefreshCw, Circle } from 'lucide-react';

interface WebhookSubscription {
  ok: boolean;
  messagesSubscribed?: boolean;
  wabaOverride?: {
    isConfigured: boolean;
    isSmartZap: boolean;
    url: string | null;
  };
  smartzapWebhookUrl?: string;
  error?: string;
}

interface WebhookStatusIndicatorProps {
  webhookSubscription?: WebhookSubscription | null;
  isLoading?: boolean;
  onRefresh?: () => void;
}

/**
 * Indicador de status do webhook com diagnóstico completo.
 * Mostra checklist de cada requisito e URLs configuradas.
 */
export function WebhookStatusIndicator({
  webhookSubscription,
  isLoading,
  onRefresh,
}: WebhookStatusIndicatorProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-zinc-800/50 rounded-lg">
        <Loader2 size={16} className="animate-spin text-zinc-400" />
        <span className="text-sm text-zinc-400">Verificando webhook...</span>
      </div>
    );
  }

  // Erro na API
  if (!webhookSubscription?.ok) {
    return (
      <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <XCircle size={18} className="text-red-500" />
            <span className="text-sm font-medium text-red-400">
              Erro ao verificar webhook
            </span>
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-1.5 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
              title="Tentar novamente"
            >
              <RefreshCw size={14} />
            </button>
          )}
        </div>
        {webhookSubscription?.error && (
          <p className="mt-2 text-xs text-red-400/70">{webhookSubscription.error}</p>
        )}
      </div>
    );
  }

  const hasUrl = webhookSubscription.wabaOverride?.isConfigured;
  const isSmartZap = webhookSubscription.wabaOverride?.isSmartZap;
  const hasMessages = webhookSubscription.messagesSubscribed;
  const configuredUrl = webhookSubscription.wabaOverride?.url;
  const expectedUrl = webhookSubscription.smartzapWebhookUrl;

  const allGood = hasMessages && isSmartZap;

  // Tudo OK - versão compacta
  if (allGood) {
    return (
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={18} className="text-emerald-500" />
          <span className="text-sm font-medium text-emerald-400">
            Webhook configurado corretamente
          </span>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="p-1.5 text-emerald-400/60 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors"
            title="Verificar novamente"
          >
            <RefreshCw size={14} />
          </button>
        )}
      </div>
    );
  }

  // Problema - mostrar checklist detalhado
  return (
    <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <XCircle size={18} className="text-red-500" />
          <span className="text-sm font-medium text-red-400">
            Webhook com problema
          </span>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="p-1.5 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
            title="Verificar novamente"
          >
            <RefreshCw size={14} />
          </button>
        )}
      </div>

      {/* Checklist */}
      <div className="space-y-2 text-sm">
        {/* URL configurada? */}
        <ChecklistItem
          ok={hasUrl}
          label="URL configurada"
          detail={hasUrl ? 'Sim' : 'Não'}
        />

        {/* URL correta? */}
        {hasUrl && (
          <ChecklistItem
            ok={isSmartZap}
            label="URL é do SmartZap"
            detail={isSmartZap ? 'Sim' : 'Não'}
          />
        )}

        {/* Messages inscrito? */}
        <ChecklistItem
          ok={hasMessages}
          label='Campo "messages" inscrito'
          detail={hasMessages ? 'Sim' : 'Não'}
        />
      </div>

      {/* URLs */}
      <div className="pt-2 border-t border-red-500/20 space-y-1.5 text-xs">
        {configuredUrl && (
          <div>
            <span className="text-zinc-500">URL atual: </span>
            <code className={`${isSmartZap ? 'text-emerald-400' : 'text-red-400'}`}>
              {configuredUrl}
            </code>
          </div>
        )}
        {!isSmartZap && expectedUrl && (
          <div>
            <span className="text-zinc-500">URL esperada: </span>
            <code className="text-emerald-400">{expectedUrl}</code>
          </div>
        )}
      </div>
    </div>
  );
}

function ChecklistItem({ ok, label, detail }: { ok?: boolean; label: string; detail: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {ok ? (
          <CheckCircle2 size={14} className="text-emerald-500" />
        ) : (
          <XCircle size={14} className="text-red-500" />
        )}
        <span className={ok ? 'text-zinc-300' : 'text-red-400'}>{label}</span>
      </div>
      <span className={`font-mono ${ok ? 'text-emerald-400' : 'text-red-400'}`}>
        {detail}
      </span>
    </div>
  );
}
