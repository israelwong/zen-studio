'use client';

import React, { useState, useEffect } from 'react';
import { getPromiseAcquisitionStats, updateReferrerAssociation, getReferrerDetails } from '@/lib/actions/studio/analytics/promise-stats.actions';
import type { PromiseAcquisitionStatsData, ReferrerDetailItem } from '@/lib/actions/studio/analytics/promise-stats.actions';
import { ZenCard, ZenCardHeader, ZenCardTitle, ZenCardContent, ZenButton, ZenDialog, ZenInput } from '@/components/ui/zen';
import { ZenSelect } from '@/components/ui/zen/forms/ZenSelect';
import { TrendingUp, Users, Share2, Loader2, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { getContacts, createContact } from '@/lib/actions/studio/commercial/contacts';
import { obtenerCrewMembers, crearCrewMember } from '@/lib/actions/studio/crew/crew.actions';
import { toast } from 'sonner';

interface AcquisitionStatsClientProps {
  studioId: string;
  studioSlug: string;
  initialData: PromiseAcquisitionStatsData;
}

export function AcquisitionStatsClient({ studioId, studioSlug, initialData }: AcquisitionStatsClientProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(initialData);
  const [showReferrerModal, setShowReferrerModal] = useState(false);
  const [selectedReferrer, setSelectedReferrer] = useState<{ name: string; id: string | null } | null>(null);
  const [contacts, setContacts] = useState<Array<{ id: string; name: string; phone: string; type: 'contact' | 'crew'; status?: string }>>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showCreateContactModal, setShowCreateContactModal] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactType, setNewContactType] = useState<'prospecto' | 'cliente' | 'empleado'>('prospecto');
  const [isCreatingContact, setIsCreatingContact] = useState(false);
  const [expandedReferrers, setExpandedReferrers] = useState<Set<string>>(new Set());
  const [referrerDetails, setReferrerDetails] = useState<Record<string, { loading: boolean; data?: ReferrerDetailItem[] }>>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadContacts = async () => {
    setLoadingContacts(true);
    try {
      const [contactsResult, crewResult] = await Promise.all([
        getContacts(studioSlug, {
          page: 1,
          limit: 100,
          status: 'all',
        }),
        obtenerCrewMembers(studioSlug),
      ]);

      const combined: Array<{ id: string; name: string; phone: string; type: 'contact' | 'crew'; status?: string }> = [];

      // Agregar contactos con su status
      if (contactsResult.success && contactsResult.data) {
        const contacts = contactsResult.data.contacts.map(c => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          type: 'contact' as const,
          status: c.status || 'prospecto',
        }));
        combined.push(...contacts);
      }

      // Agregar crew members con status "empleado" (solo los que tienen teléfono)
      if (crewResult.success && crewResult.data) {
        const crew = crewResult.data
          .filter((member) => member.phone && member.phone.trim() !== '')
          .map((member) => ({
            id: member.id,
            name: member.name,
            phone: member.phone!,
            type: 'crew' as const,
            status: 'empleado',
          }));
        combined.push(...crew);
      }

      setContacts(combined);
    } catch (error) {
      console.error('Error loading contacts:', error);
    } finally {
      setLoadingContacts(false);
    }
  };

  const handleReferrerClick = (referrer: { referrerId: string | null; referrerName: string }, e: React.MouseEvent) => {
    // Si no tiene contacto, abrir modal para asignar
    if (!referrer.referrerId) {
      const target = e.target as HTMLElement;
      // Si el click fue en el chevron o en el área expandible, no abrir modal
      if (target.closest('.expand-toggle') || target.closest('.referrer-details')) {
        return;
      }
      setSelectedReferrer({ name: referrer.referrerName, id: null });
      setShowReferrerModal(true);
      loadContacts();
    }
  };

  const toggleReferrerExpand = async (referrer: { referrerId: string | null; referrerName: string }, index: number) => {
    const key = referrer.referrerId || `name_${referrer.referrerName}_${index}`;
    const isExpanded = expandedReferrers.has(key);

    if (isExpanded) {
      // Colapsar
      setExpandedReferrers((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    } else {
      // Expandir y cargar detalles
      setExpandedReferrers((prev) => new Set(prev).add(key));

      // Si no hay datos cargados, cargarlos
      if (!referrerDetails[key]) {
        setReferrerDetails((prev) => ({
          ...prev,
          [key]: { loading: true },
        }));

        const result = await getReferrerDetails(studioId, referrer.referrerId, referrer.referrerName);

        setReferrerDetails((prev) => ({
          ...prev,
          [key]: {
            loading: false,
            data: result.success ? result.data : undefined,
          },
        }));
      }
    }
  };

  const normalizePhone = (value: string): string => {
    const digitsOnly = value.replace(/\D/g, '');
    return digitsOnly.slice(-10);
  };

  const handleAssignReferrer = async (contactId: string) => {
    if (!selectedReferrer) return;

    setUpdating(true);
    try {
      const result = await updateReferrerAssociation(studioId, selectedReferrer.name, contactId);
      if (result.success) {
        toast.success(`Referido asociado correctamente. ${result.updatedCount || 0} contacto(s) actualizado(s)`);
        setShowReferrerModal(false);
        setSelectedReferrer(null);
        setSearchTerm('');

        // Recargar estadísticas
        const statsResult = await getPromiseAcquisitionStats(studioId);
        if (statsResult.success && statsResult.data) {
          setData(statsResult.data);
        }
      } else {
        toast.error(result.error || 'Error al asociar referido');
      }
    } catch (error) {
      console.error('Error assigning referrer:', error);
      toast.error('Error al asociar referido');
    } finally {
      setUpdating(false);
    }
  };

  const handleCreateAndAssignContact = async () => {
    if (!newContactName.trim() || !newContactPhone.trim()) {
      toast.error('Nombre y teléfono son requeridos');
      return;
    }

    const normalizedPhone = normalizePhone(newContactPhone);
    if (normalizedPhone.length !== 10) {
      toast.error('El teléfono debe tener 10 dígitos');
      return;
    }

    if (!selectedReferrer) return;

    setIsCreatingContact(true);
    try {
      let createdId: string;

      if (newContactType === 'empleado') {
        // Crear en crew/personal
        const crewResult = await crearCrewMember(studioSlug, {
          name: newContactName.trim(),
          phone: normalizedPhone,
          tipo: 'OPERATIVO',
        });

        if (!crewResult.success || !crewResult.data) {
          toast.error(crewResult.error || 'Error al crear empleado');
          setIsCreatingContact(false);
          return;
        }

        createdId = crewResult.data.id;
      } else {
        // Crear en contactos (prospecto o cliente)
        const createResult = await createContact(studioSlug, {
          name: newContactName.trim(),
          phone: normalizedPhone,
          status: newContactType,
        });

        if (!createResult.success || !createResult.data) {
          toast.error(createResult.error || 'Error al crear contacto');
          setIsCreatingContact(false);
          return;
        }

        createdId = createResult.data.id;
      }

      // Recargar contactos
      await loadContacts();

      // Asociar el nuevo contacto/empleado como referido
      const assignResult = await updateReferrerAssociation(studioId, selectedReferrer.name, createdId);

      if (assignResult.success) {
        const typeLabel = newContactType === 'empleado' ? 'Empleado' : newContactType === 'cliente' ? 'Cliente' : 'Prospecto';
        toast.success(`${typeLabel} creado y asociado. ${assignResult.updatedCount || 0} contacto(s) actualizado(s)`);
        setShowCreateContactModal(false);
        setShowReferrerModal(false);
        setSelectedReferrer(null);
        setSearchTerm('');
        setNewContactName('');
        setNewContactPhone('');
        setNewContactType('prospecto');

        // Recargar estadísticas
        const statsResult = await getPromiseAcquisitionStats(studioId);
        if (statsResult.success && statsResult.data) {
          setData(statsResult.data);
        }
      } else {
        toast.error(assignResult.error || 'Error al asociar referido');
      }
    } catch (error) {
      console.error('Error creating and assigning contact:', error);
      toast.error('Error al crear y asociar contacto');
    } finally {
      setIsCreatingContact(false);
    }
  };

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  if (!mounted) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Canales de Adquisición */}
      <ZenCard>
        <ZenCardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-400" />
            <ZenCardTitle>Canales de Adquisición</ZenCardTitle>
          </div>
        </ZenCardHeader>
        <ZenCardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 text-zinc-500 animate-spin" />
            </div>
          ) : data.channels.length > 0 ? (
            <div className="space-y-3">
              {data.channels.map((channel, index) => (
                <div
                  key={channel.channelId}
                  className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg border border-zinc-700/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold text-sm">
                      {index + 1}
                    </div>
                    <span className="text-sm font-medium text-zinc-200">{channel.channelName}</span>
                  </div>
                  <span className="text-sm font-semibold text-emerald-400">{channel.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-400 text-center py-4">No hay datos de canales de adquisición</p>
          )}
        </ZenCardContent>
      </ZenCard>

      {/* Referidos */}
      {data.referrers.length > 0 && (
        <ZenCard>
          <ZenCardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-400" />
              <ZenCardTitle>Personas que Nos Refirieron</ZenCardTitle>
            </div>
          </ZenCardHeader>
          <ZenCardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 text-zinc-500 animate-spin" />
              </div>
            ) : (
              <div className="space-y-3">
                {data.referrers.map((referrer, index) => {
                  const key = referrer.referrerId || `name_${referrer.referrerName}_${index}`;
                  const isExpanded = expandedReferrers.has(key);
                  const details = referrerDetails[key];

                  return (
                    <div
                      key={key}
                      className="bg-zinc-800/30 rounded-lg border border-zinc-700/50 overflow-hidden"
                    >
                      <div
                        onClick={(e) => handleReferrerClick(referrer, e)}
                        className={`flex items-center justify-between p-3 ${!referrer.referrerId ? 'cursor-pointer hover:bg-zinc-800/50 transition-colors' : ''
                          }`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleReferrerExpand(referrer, index);
                            }}
                            className="expand-toggle shrink-0 p-1 hover:bg-zinc-700/50 rounded transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-zinc-400" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-zinc-400" />
                            )}
                          </button>
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/10 text-blue-400 font-semibold text-sm shrink-0">
                            {index + 1}
                          </div>
                          <span className="text-sm font-medium text-zinc-200 truncate">@{referrer.referrerName}</span>
                          {!referrer.referrerId && (
                            <span title="Sin contacto asociado" aria-label="Sin contacto asociado">
                              <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                            </span>
                          )}
                        </div>
                        <span className="text-sm font-semibold text-blue-400 shrink-0 ml-2">{referrer.count}</span>
                      </div>

                      {isExpanded && (
                        <div className="referrer-details border-t border-zinc-700/50 p-3 space-y-2">
                          {details?.loading ? (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="h-5 w-5 text-zinc-500 animate-spin" />
                            </div>
                          ) : details?.data && details.data.length > 0 ? (
                            details.data.map((item) => (
                              <div
                                key={item.promiseId}
                                className="p-2 bg-zinc-900/50 rounded border border-zinc-700/30 space-y-1"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-zinc-200">
                                      {item.contactName}
                                    </p>
                                    {item.eventTypeName && (
                                      <p className="text-xs text-zinc-400 mt-0.5">
                                        {item.eventTypeName}
                                      </p>
                                    )}
                                  </div>
                                  {item.eventId && item.closingAmount && (
                                    <div className="text-right shrink-0">
                                      <p className="text-sm font-semibold text-emerald-400">
                                        ${item.closingAmount.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                      </p>
                                      <p className="text-xs text-zinc-500">Cierre</p>
                                    </div>
                                  )}
                                </div>
                                {item.eventDate && (
                                  <p className="text-xs text-zinc-500">
                                    {new Date(item.eventDate).toLocaleDateString('es-MX', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                    })}
                                  </p>
                                )}
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-zinc-400 text-center py-2">
                              No hay promesas o eventos asociados
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ZenCardContent>
        </ZenCard>
      )}

      {/* Redes Sociales */}
      {data.socialNetworks.length > 0 && (
        <ZenCard>
          <ZenCardHeader>
            <div className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-purple-400" />
              <ZenCardTitle>Redes Sociales</ZenCardTitle>
            </div>
          </ZenCardHeader>
          <ZenCardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 text-zinc-500 animate-spin" />
              </div>
            ) : (
              <div className="space-y-3">
                {data.socialNetworks.map((network, index) => (
                  <div
                    key={network.networkId}
                    className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg border border-zinc-700/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-500/10 text-purple-400 font-semibold text-sm">
                        {index + 1}
                      </div>
                      <span className="text-sm font-medium text-zinc-200">{network.networkName}</span>
                    </div>
                    <span className="text-sm font-semibold text-purple-400">{network.count}</span>
                  </div>
                ))}
              </div>
            )}
          </ZenCardContent>
        </ZenCard>
      )}

      {/* Modal para asignar referido */}
      <ZenDialog
        isOpen={showReferrerModal}
        onClose={() => {
          setShowReferrerModal(false);
          setSelectedReferrer(null);
          setSearchTerm('');
        }}
        title={`Asociar Referido: @${selectedReferrer?.name || ''}`}
        description="Selecciona el contacto que corresponde a este referido. Se actualizarán todos los contactos con este nombre."
        maxWidth="md"
        onCancel={() => {
          setShowReferrerModal(false);
          setSelectedReferrer(null);
          setSearchTerm('');
        }}
        cancelLabel="Cancelar"
        closeOnClickOutside={false}
        zIndex={10050}
      >
        <div className="space-y-4">
          <ZenInput
            label="Buscar contacto"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre o teléfono..."
          />

          {loadingContacts ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 text-zinc-500 animate-spin" />
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-2">
              {filteredContacts.length > 0 ? (
                filteredContacts.map((contact) => {
                  const getBadgeColor = () => {
                    if (contact.status === 'empleado') return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
                    if (contact.status === 'cliente') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                    return 'bg-blue-500/10 text-blue-400 border-blue-500/20'; // prospecto
                  };

                  const getBadgeLabel = () => {
                    if (contact.status === 'empleado') return 'Empleado';
                    if (contact.status === 'cliente') return 'Cliente';
                    return 'Prospecto';
                  };

                  return (
                    <button
                      key={`${contact.type}_${contact.id}`}
                      onClick={() => handleAssignReferrer(contact.id)}
                      disabled={updating}
                      className="w-full p-3 bg-zinc-800/50 border border-zinc-700 rounded-lg hover:bg-zinc-800 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-200 truncate mb-1">{contact.name}</p>
                          <p className="text-xs text-zinc-400">{contact.phone}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${getBadgeColor()}`}>
                            {getBadgeLabel()}
                          </span>
                          {updating && (
                            <Loader2 className="h-4 w-4 text-emerald-400 animate-spin" />
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="text-center py-4 space-y-3">
                  <p className="text-sm text-zinc-400">
                    {searchTerm ? 'No se encontraron contactos' : 'Busca un contacto para asociar'}
                  </p>
                  {searchTerm && (
                    <ZenButton
                      variant="outline"
                      onClick={() => {
                        setNewContactName(searchTerm);
                        setShowCreateContactModal(true);
                      }}
                      className="w-full"
                    >
                      Crear contacto: {searchTerm}
                    </ZenButton>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </ZenDialog>

      {/* Modal para crear contacto rápido */}
      <ZenDialog
        isOpen={showCreateContactModal}
        onClose={() => {
          setShowCreateContactModal(false);
          setNewContactName('');
          setNewContactPhone('');
          setNewContactType('prospecto');
        }}
        title="Crear Contacto Referido"
        description="Ingresa los datos mínimos para crear el contacto, después los podrás completar"
        maxWidth="sm"
        onCancel={() => {
          setShowCreateContactModal(false);
          setNewContactName('');
          setNewContactPhone('');
          setNewContactType('prospecto');
        }}
        cancelLabel="Cancelar"
        closeOnClickOutside={false}
        zIndex={10100}
      >
        <div className="space-y-4">
          <ZenInput
            label="Nombre"
            value={newContactName}
            onChange={(e) => setNewContactName(e.target.value)}
            placeholder="Nombre del referido"
            required
            autoFocus
          />
          <ZenInput
            label="Teléfono"
            type="tel"
            value={newContactPhone}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '');
              if (value.length <= 10) {
                setNewContactPhone(value);
              }
            }}
            placeholder="10 dígitos"
            required
            maxLength={10}
          />
          <ZenSelect
            label="Tipo"
            value={newContactType}
            onValueChange={(value) => setNewContactType(value as 'prospecto' | 'cliente' | 'empleado')}
            options={[
              { value: 'prospecto', label: 'Prospecto' },
              { value: 'cliente', label: 'Cliente' },
              { value: 'empleado', label: 'Empleado' },
            ]}
            disableSearch
            required
          />
          <div className="flex justify-end gap-2 pt-4 border-t border-zinc-800">
            <ZenButton
              variant="ghost"
              onClick={() => {
                setShowCreateContactModal(false);
                setNewContactName('');
                setNewContactPhone('');
              }}
              disabled={isCreatingContact}
            >
              Cancelar
            </ZenButton>
            <ZenButton
              variant="primary"
              onClick={handleCreateAndAssignContact}
              loading={isCreatingContact}
              disabled={!newContactName.trim() || !newContactPhone.trim() || newContactPhone.length !== 10}
            >
              Crear y Asociar
            </ZenButton>
          </div>
        </div>
      </ZenDialog>
    </div>
  );
}
