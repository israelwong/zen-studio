'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Users } from 'lucide-react';
import { ZenButton, ZenInput } from '@/components/ui/zen';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/shadcn/sheet';
import { obtenerCrewMembers } from '@/lib/actions/studio/crew';
import { toast } from 'sonner';
import { CrewMemberCard } from './CrewMemberCard';
import { CrewMemberFormModal } from './CrewMemberFormModal';

interface CrewMembersManagerProps {
  studioSlug: string;
  onMemberSelect?: (memberId: string) => void;
  mode?: 'select' | 'manage';
  isOpen: boolean;
  onClose: () => void;
}

interface CrewMember {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  tipo: string;
  status: string;
  skills: Array<{
    id: string;
    name: string;
    color: string | null;
    icono: string | null;
    is_primary: boolean;
  }>;
  fixed_salary: number | null;
  variable_salary: number | null;
  account: {
    id: string;
    email: string;
    is_active: boolean;
  } | null;
}

export function CrewMembersManager({
  studioSlug,
  onMemberSelect,
  mode = 'manage',
  isOpen,
  onClose,
}: CrewMembersManagerProps) {
  const [members, setMembers] = useState<CrewMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<CrewMember | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await obtenerCrewMembers(studioSlug);

      if (result.success && result.data) {
        setMembers(result.data);
      } else {
        toast.error(result.error || 'Error al cargar personal');
      }
    } catch (error) {
      console.error('Error loading crew members:', error);
      toast.error('Error al cargar personal');
    } finally {
      setLoading(false);
    }
  }, [studioSlug]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  const handleMemberClick = (memberId: string) => {
    if (mode === 'select' && onMemberSelect) {
      onMemberSelect(memberId);
      onClose();
    }
  };

  const handleCrewCreated = () => {
    setFormModalOpen(false);
    loadData();
    toast.success('Personal creado exitosamente');
  };

  const handleCrewUpdated = () => {
    setEditingMember(null);
    setFormModalOpen(false);
    loadData();
    toast.success('Personal actualizado exitosamente');
  };

  const handleCrewDeleted = () => {
    loadData();
    toast.success('Personal eliminado exitosamente');
  };

  // Filtrar miembros por búsqueda
  const filteredMembers = members.filter((member) =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Ordenar alfabéticamente
  const sortedMembers = [...filteredMembers].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return (
    <>
      {/* SHEET: LISTA DE PERSONAL */}
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl bg-zinc-900 border-l border-zinc-800 overflow-y-auto p-0"
        >
          {/* Header */}
          <SheetHeader className="border-b border-zinc-800 pb-4 px-6 pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-600/20 rounded-lg">
                <Users className="h-5 w-5 text-emerald-400" />
              </div>
              <div className="flex-1">
                <SheetTitle className="text-xl font-semibold text-white">
                  Personal
                </SheetTitle>
                <SheetDescription className="text-zinc-400">
                  Gestiona el equipo de trabajo
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {/* Contenedor con padding */}
          <div className="p-6 space-y-4">
            {/* SEARCH + CREAR */}
            {mode === 'manage' && (
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="flex-1 w-full">
                  <ZenInput
                    placeholder="Buscar por nombre..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    icon={Search}
                    iconClassName="h-4 w-4"
                  />
                </div>
                <ZenButton
                  onClick={() => {
                    setEditingMember(null);
                    setFormModalOpen(true);
                  }}
                  className="w-full sm:w-auto"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Crear
                </ZenButton>
              </div>
            )}

            {/* Contador */}
            <div className="text-sm text-zinc-400 min-h-[20px]">
              {loading ? (
                <span className="text-zinc-500">Cargando...</span>
              ) : (
                <span>
                  {sortedMembers.length} {sortedMembers.length === 1 ? 'persona' : 'personas'}
                </span>
              )}
            </div>

            {/* LISTA DE PERSONAL */}
            {loading ? (
              <div className="text-center py-12 text-zinc-400">
                Cargando personal...
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-zinc-400 mb-4">No hay personal registrado</p>
                {mode === 'manage' && (
                  <ZenButton
                    onClick={() => {
                      setEditingMember(null);
                      setFormModalOpen(true);
                    }}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Crear el primero
                  </ZenButton>
                )}
              </div>
            ) : sortedMembers.length === 0 ? (
              <div className="text-center py-8 text-zinc-400">
                No hay coincidencias para &quot;{searchTerm}&quot;
              </div>
            ) : (
              <div className="space-y-3">
                {sortedMembers.map((member) => (
                  <CrewMemberCard
                    key={member.id}
                    member={member}
                    mode={mode}
                    onSelect={() => handleMemberClick(member.id)}
                    onEdit={() => {
                      setEditingMember(member);
                      setFormModalOpen(true);
                    }}
                    onDelete={handleCrewDeleted}
                    studioSlug={studioSlug}
                  />
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* MODAL: CREAR/EDITAR PERSONAL */}
      {mode === 'manage' && (
        <CrewMemberFormModal
          studioSlug={studioSlug}
          isOpen={formModalOpen}
          onClose={() => {
            setEditingMember(null);
            setFormModalOpen(false);
          }}
          initialMember={editingMember}
          onSuccess={editingMember ? handleCrewUpdated : handleCrewCreated}
        />
      )}
    </>
  );
}
