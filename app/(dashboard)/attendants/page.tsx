'use client'

import { Headset, Plus, Search } from 'lucide-react'
import { PageHeader, PageTitle, PageDescription, PageActions } from '@/components/ui/page'
import { Button } from '@/components/ui/button'
import { Container } from '@/components/ui/container'

export default function AttendantsPage() {
  return (
    <div className="space-y-6">
      <PageHeader>
        <div>
          <PageTitle>Atendentes</PageTitle>
          <PageDescription>Gerencie os atendentes que terão acesso ao sistema.</PageDescription>
        </div>
        <PageActions>
          <Button variant="brand" disabled>
            <Plus className="w-4 h-4" />
            Novo Atendente
          </Button>
        </PageActions>
      </PageHeader>

      <Container variant="glass" padding="xl">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary-500/10 flex items-center justify-center mb-4">
            <Headset className="w-8 h-8 text-primary-400" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--ds-text-primary)] mb-2">
            Em breve
          </h3>
          <p className="text-[var(--ds-text-secondary)] max-w-md">
            Aqui você poderá cadastrar atendentes, definir permissões, atribuir filas de atendimento e acompanhar a performance de cada um.
          </p>
        </div>
      </Container>
    </div>
  )
}
