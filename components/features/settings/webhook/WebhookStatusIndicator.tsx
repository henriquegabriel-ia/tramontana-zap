'use client';

import React from 'react';
import { CheckCircle2, XCircle, Loader2, RefreshCw } from 'lucide-react';

interface WebhookSubscription {
  ok: boolean;
  messagesSubscribed?: boolean;
  wabaOverride?: {
    isConfigured: boolean;
    isSmartZap: boolean;
    url: string | null;
  };
  error?: string;
}

interface WebhookStatusIndicatorProps {
  webhookSubscription?: WebhookSubscription | null;
  isLoading?: boolean;
  onRefresh?: () => void;
}

/**
 * Indicador de status do webhook.
 * Verde = configurado corretamente (messagesSubscribed + isSmartZap)
 * Vermelho = não configurado ou URL errada (com diagnóstico específico)
 */
export function WebhookStatusIndicator({
  webhookSubscription,
  isLoading,
  onRefresh,
}: WebhookStatusIndicatorProps) {
  // Diagnóstico específico do problema
  const getDiagnosis = (): { status: 'ok' | 'error'; title: string; description?: string } => {
    if (!webhookSubscription?.ok) {
      return {
        status: 'error',
        title: 'Erro ao verificar',
        description: webhookSubscription?.error || 'Não foi possível consultar status',
      };
    }

    const hasUrl = webhookSubscription?.wabaOverride?.isConfigured;
    const isSmartZap = webhookSubscription?.wabaOverride?.isSmartZap;
    const hasMessages = webhookSubscription?.messagesSubscribed;

    // Tudo OK
    if (hasMessages && isSmartZap) {
      return { status: 'ok', title: 'Webhook configurado' };
    }

    // URL configurada mas não é do SmartZap
    if (hasUrl && !isSmartZap) {
      return {
        status: 'error',
        title: 'URL incorreta',
        description: 'Webhook apontando para outro sistema',
      };
    }

    // URL do SmartZap mas messages não inscrito
    if (isSmartZap && !hasMessages) {
      return {
        status: 'error',
        title: 'Campo "messages" não inscrito',
        description: 'Ative o campo "messages" na Meta',
      };
    }

    // Nada configurado
    return {
      status: 'error',
      title: 'Webhook não configurado',
      description: 'Configure a URL na Meta',
    };
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-zinc-800/50 rounded-lg">
        <Loader2 size={16} className="animate-spin text-zinc-400" />
        <span className="text-sm text-zinc-400">Verificando webhook...</span>
      </div>
    );
  }

  const diagnosis = getDiagnosis();

  if (diagnosis.status === 'ok') {
    return (
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={18} className="text-emerald-500" />
          <span className="text-sm font-medium text-emerald-400">
            {diagnosis.title}
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

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg">
      <div className="flex items-center gap-2">
        <XCircle size={18} className="text-red-500" />
        <div className="flex flex-col">
          <span className="text-sm font-medium text-red-400">
            {diagnosis.title}
          </span>
          {diagnosis.description && (
            <span className="text-xs text-red-400/70">
              {diagnosis.description}
            </span>
          )}
        </div>
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
  );
}
