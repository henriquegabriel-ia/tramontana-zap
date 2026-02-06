'use client';

import React from 'react';
import { CheckCircle2, XCircle, Loader2, RefreshCw } from 'lucide-react';

interface WebhookHierarchy {
  phoneNumberOverride: string | null;
  wabaOverride: string | null;
  appWebhook: string | null;
}

interface WebhookSubscription {
  ok: boolean;
  messagesSubscribed?: boolean;
  wabaOverride?: {
    isConfigured: boolean;
    isSmartZap: boolean;
    url: string | null;
  };
  hierarchy?: WebhookHierarchy | null;
  smartzapWebhookUrl?: string;
  error?: string;
}

interface WebhookStatusIndicatorProps {
  webhookSubscription?: WebhookSubscription | null;
  isLoading?: boolean;
  onRefresh?: () => void;
}

/**
 * Compara se duas URLs são equivalentes (ignora trailing slash e protocolo http/https)
 */
function urlsMatch(url1: string | null | undefined, url2: string | null | undefined): boolean {
  if (!url1 || !url2) return false;

  // Normaliza: remove trailing slash, lowercase
  const normalize = (u: string) => u.replace(/\/$/, '').toLowerCase();
  return normalize(url1) === normalize(url2);
}

/**
 * Encontra qual nível da hierarquia está configurado
 */
function findActiveLevel(
  hierarchy: WebhookHierarchy | null | undefined,
  expectedUrl: string | null | undefined
): {
  level: '#1 Número' | '#2 WABA' | '#3 APP' | null;
  url: string | null;
  isSmartZap: boolean;
} {
  if (!hierarchy) return { level: null, url: null, isSmartZap: false };

  // Prioridade: #1 Phone > #2 WABA > #3 APP
  if (hierarchy.phoneNumberOverride) {
    return {
      level: '#1 Número',
      url: hierarchy.phoneNumberOverride,
      isSmartZap: urlsMatch(hierarchy.phoneNumberOverride, expectedUrl),
    };
  }
  if (hierarchy.wabaOverride) {
    return {
      level: '#2 WABA',
      url: hierarchy.wabaOverride,
      isSmartZap: urlsMatch(hierarchy.wabaOverride, expectedUrl),
    };
  }
  if (hierarchy.appWebhook) {
    return {
      level: '#3 APP',
      url: hierarchy.appWebhook,
      isSmartZap: urlsMatch(hierarchy.appWebhook, expectedUrl),
    };
  }

  return { level: null, url: null, isSmartZap: false };
}

/**
 * Indicador de status do webhook com diagnóstico completo.
 * Verifica toda a hierarquia: Phone (#1) > WABA (#2) > APP (#3)
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

  // Analisa hierarquia completa
  const expectedUrl = webhookSubscription.smartzapWebhookUrl;
  const active = findActiveLevel(webhookSubscription.hierarchy, expectedUrl);
  const hasMessages = webhookSubscription.messagesSubscribed;

  const allGood = hasMessages && active.isSmartZap;

  // Tudo OK - versão compacta
  if (allGood) {
    return (
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={18} className="text-emerald-500" />
          <div className="flex flex-col">
            <span className="text-sm font-medium text-emerald-400">
              Webhook configurado corretamente
            </span>
            <span className="text-xs text-emerald-400/70">
              Nível {active.level} ativo
            </span>
          </div>
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
          ok={!!active.url}
          label="URL configurada"
          detail={active.url ? `Sim (${active.level})` : 'Não'}
        />

        {/* URL é do SmartZap? */}
        {active.url && (
          <ChecklistItem
            ok={active.isSmartZap}
            label="URL é do SmartZap"
            detail={active.isSmartZap ? 'Sim' : 'Não'}
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
        {active.url && (
          <div className="break-all">
            <span className="text-zinc-500">URL atual ({active.level}): </span>
            <code className={active.isSmartZap ? 'text-emerald-400' : 'text-red-400'}>
              {active.url}
            </code>
          </div>
        )}
        {!active.isSmartZap && expectedUrl && (
          <div className="break-all">
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
