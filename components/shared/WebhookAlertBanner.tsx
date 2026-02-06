'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
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
    <div className="bg-amber-500/5 border-b border-amber-500/10">
      <div className="flex items-center justify-center gap-3 px-4 py-1.5 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
          <span className="text-amber-400/90">
            Webhook não configurado
          </span>
          <span className="text-zinc-500">·</span>
          <Link
            href="/settings"
            className="text-amber-400 hover:text-amber-300 underline underline-offset-2"
          >
            Configurar
          </Link>
        </div>
        <button
          onClick={handleDismiss}
          className="p-0.5 text-zinc-500 hover:text-zinc-400 rounded transition-colors"
          title="Fechar por 24h"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
}
