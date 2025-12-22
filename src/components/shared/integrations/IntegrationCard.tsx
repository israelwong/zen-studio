'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { ZenCard, ZenCardHeader, ZenCardTitle, ZenCardDescription, ZenCardContent, ZenButton, ZenBadge } from '@/components/ui/zen';
import { cn } from '@/lib/utils';

export interface IntegrationCardProps {
  name: string;
  description: string;
  icon: LucideIcon;
  iconColor?: string;
  isConnected?: boolean;
  isComingSoon?: boolean;
  onConnect?: () => void;
  onManage?: () => void;
  connectLabel?: string;
  manageLabel?: string;
  className?: string;
}

const getIconBgColor = (iconColor: string): string => {
  const colorMap: Record<string, string> = {
    'text-blue-400': 'bg-blue-600/20',
    'text-purple-400': 'bg-purple-600/20',
    'text-green-400': 'bg-green-600/20',
    'text-indigo-400': 'bg-indigo-600/20',
    'text-yellow-400': 'bg-yellow-600/20',
  };
  return colorMap[iconColor] || 'bg-zinc-600/20';
};

export function IntegrationCard({
  name,
  description,
  icon: Icon,
  iconColor = 'text-blue-400',
  isConnected = false,
  isComingSoon = false,
  onConnect,
  onManage,
  connectLabel = 'Conectar',
  manageLabel = 'Gestionar',
  className,
}: IntegrationCardProps) {
  const handleAction = () => {
    if (isComingSoon) return;
    if (isConnected && onManage) {
      onManage();
    } else if (!isConnected && onConnect) {
      onConnect();
    }
  };

  return (
    <ZenCard className={cn('hover:border-zinc-700 transition-colors', isComingSoon && 'opacity-75', className)}>
      <ZenCardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <div className={cn('p-2 rounded-lg', getIconBgColor(iconColor))}>
              <Icon className={cn('h-5 w-5', iconColor)} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <ZenCardTitle className="text-base">{name}</ZenCardTitle>
                {isComingSoon && (
                  <ZenBadge variant="secondary" className="text-xs">
                    Próximamente
                  </ZenBadge>
                )}
                {isConnected && !isComingSoon && (
                  <ZenBadge variant="success" className="text-xs">
                    Conectado
                  </ZenBadge>
                )}
              </div>
              <ZenCardDescription className="text-sm mt-1.5">{description}</ZenCardDescription>
            </div>
          </div>
        </div>
      </ZenCardHeader>
      <ZenCardContent>
        {!isComingSoon && (
          <ZenButton
            variant={isConnected ? 'outline' : 'default'}
            size="sm"
            onClick={handleAction}
            className="w-full"
            disabled={!onConnect && !onManage}
          >
            {isConnected ? manageLabel : connectLabel}
          </ZenButton>
        )}
      </ZenCardContent>
    </ZenCard>
  );
}

