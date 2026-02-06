'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, Settings } from 'lucide-react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';

const DISMISS_KEY = 'webhook_alert_dismissed';
const DISMISS_DURATION = 24 * 60 * 60 * 1000; // 24 horas

interface WebhookSubscription {
  ok: boolean;
  messagesSubscribed?: boolean;
  wabaOverride?: {
    isConfigured: boolean;
    isSmartZap: boolean;
    url: string | null;
  };
}

/**
 * Banner de alerta que aparece no topo do dashboard quando
 * o webhook não está configurado corretamente.
 */
export function WebhookAlertBanner() {
  const [isDismissed, setIsDismissed] = useState(true); // Começa escondido até verificar

  // Verifica localStorage no mount
  useEffect(() => {
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      const now = Date.now();
      if (now - dismissedTime < DISMISS_DURATION) {
        setIsDismissed(true);
        return;
      }
    }
    setIsDismissed(false);
  }, []);

  // Busca status do webhook
  const { data: webhookSubscription, isLoading } = useQuery<WebhookSubscription>({
    queryKey: ['metaWebhookSubscription'],
    queryFn: async () => {
      const response = await fetch('/api/meta/webhooks/subscription');
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return { ok: false };
      }
      return data;
    },
    staleTime: 60 * 1000, // 1 minuto
    retry: false,
  });

  // Verifica se webhook está configurado
  const isConfigured =
    webhookSubscription?.ok &&
    webhookSubscription?.messagesSubscribed &&
    webhookSubscription?.wabaOverride?.isSmartZap;

  // Não mostra se:
  // - Ainda carregando
  // - Está configurado
  // - Foi dismissado
  if (isLoading || isConfigured || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setIsDismissed(true);
  };

  return (
    <div className="bg-zinc-900/80 border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-amber-500 shrink-0" />
            <p className="text-xs text-zinc-400">
              <span className="text-amber-500 font-medium">Webhook não configurado</span>
              <span className="hidden sm:inline"> — você não receberá respostas dos contatos</span>
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Link
              href="/settings"
              className="text-xs text-zinc-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Configurar
            </Link>
            <button
              onClick={handleDismiss}
              className="p-1 text-zinc-500 hover:text-zinc-300 rounded transition-colors"
              title="Fechar por 24h"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
