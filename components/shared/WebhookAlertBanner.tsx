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
    <div className="bg-red-500/10 border-b border-red-500/20">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle size={18} className="text-red-500 shrink-0" />
            <p className="text-sm text-red-400">
              <strong>Webhook não configurado.</strong>{' '}
              <span className="text-red-400/80">
                Você não receberá respostas dos contatos nem confirmações de entrega.
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/settings"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors"
            >
              <Settings size={14} />
              Configurar
            </Link>
            <button
              onClick={handleDismiss}
              className="p-1.5 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
              title="Fechar por 24h"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
