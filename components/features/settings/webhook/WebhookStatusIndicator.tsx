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
 * Vermelho = não configurado ou URL errada
 */
export function WebhookStatusIndicator({
  webhookSubscription,
  isLoading,
  onRefresh,
}: WebhookStatusIndicatorProps) {
  // Webhook está configurado se:
  // 1. messagesSubscribed = true (campo inscrito na Meta)
  // 2. wabaOverride.isSmartZap = true (URL é do SmartZap)
  const isConfigured =
    webhookSubscription?.ok &&
    webhookSubscription?.messagesSubscribed &&
    webhookSubscription?.wabaOverride?.isSmartZap;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-zinc-800/50 rounded-lg">
        <Loader2 size={16} className="animate-spin text-zinc-400" />
        <span className="text-sm text-zinc-400">Verificando webhook...</span>
      </div>
    );
  }

  if (isConfigured) {
    return (
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={18} className="text-emerald-500" />
          <span className="text-sm font-medium text-emerald-400">
            Webhook configurado
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
        <span className="text-sm font-medium text-red-400">
          Webhook não configurado
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
  );
}
