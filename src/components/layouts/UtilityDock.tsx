'use client';

import React from 'react';
import { ShoppingBag, Sparkles, BarChart3, Users, HelpCircle, FileText } from 'lucide-react';
import Link from 'next/link';
import { ZenButton } from '@/components/ui/zen';

interface DockItem {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href?: string;
  action?: () => void;
}

interface UtilityDockProps {
  studioSlug: string;
  onAgendaClick: () => void;
  onContactsClick: () => void;
  onMagicClick: () => void;
  onPersonalClick: () => void;
}

export function UtilityDock({
  studioSlug,
  onAgendaClick,
  onContactsClick,
  onMagicClick,
  onPersonalClick,
}: UtilityDockProps) {

  const dockItems: DockItem[] = [];

  const renderItem = (item: DockItem) => {
    const buttonContent = (
      <ZenButton
        variant="ghost"
        size="icon"
        className="rounded-full h-10 w-10 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors"
        onClick={item.action}
        title={item.label}
      >
        <item.icon className="h-5 w-5" />
        <span className="sr-only">{item.label}</span>
      </ZenButton>
    );

    if (item.href) {
      return (
        <Link key={item.id} href={item.href}>
          {buttonContent}
        </Link>
      );
    }

    return (
      <div key={item.id}>
        {buttonContent}
      </div>
    );
  };

  return (
    <aside className="w-12 shrink-0 border-l border-zinc-800 bg-zinc-950/50 flex flex-col items-center py-4 gap-2 z-20">
      {dockItems.map(renderItem)}
    </aside>
  );
}

