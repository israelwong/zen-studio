'use client'

import { createClient } from '@/lib/supabase/browser'
import { Button } from '@/components/ui/shadcn/button'
import { Avatar, AvatarFallback } from '@/components/ui/shadcn/avatar'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/shadcn/dropdown-menu'
import { LogOut, User, Settings, BarChart3, Building2, Users, DollarSign, Activity } from 'lucide-react'
import { HeaderLogo } from '@/components/ui/shadcn/logo'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { User as SupabaseUser } from '@supabase/supabase-js'

export function AdminNavigation() {
    const [user, setUser] = useState<SupabaseUser | null>(null)
    const [loading, setLoading] = useState(true)
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            setUser(user)
            setLoading(false)
        }
        getUser()
    }, [supabase.auth])

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    if (loading) {
        return (
            <div className="flex items-center space-x-4">
                <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse"></div>
            </div>
        )
    }

    return (
        <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-8">
                <Link href="/admin" className="flex items-center space-x-3">
                    <HeaderLogo />
                </Link>

                <nav className="hidden md:flex items-center space-x-6">
                    <Link
                        href="/admin"
                        className="text-sm font-medium hover:text-primary transition-colors flex items-center space-x-1"
                    >
                        <BarChart3 className="h-4 w-4" />
                        <span>Dashboard</span>
                    </Link>
                    <Link
                        href="/admin/studios"
                        className="text-sm font-medium hover:text-primary transition-colors flex items-center space-x-1"
                    >
                        <Building2 className="h-4 w-4" />
                        <span>Estudios</span>
                    </Link>
                    <Link
                        href="/admin/leads"
                        className="text-sm font-medium hover:text-primary transition-colors flex items-center space-x-1"
                    >
                        <Users className="h-4 w-4" />
                        <span>Leads</span>
                    </Link>
                    <Link
                        href="/admin/revenue"
                        className="text-sm font-medium hover:text-primary transition-colors flex items-center space-x-1"
                    >
                        <DollarSign className="h-4 w-4" />
                        <span>Revenue</span>
                    </Link>
                    <Link
                        href="/admin/analytics"
                        className="text-sm font-medium hover:text-primary transition-colors flex items-center space-x-1"
                    >
                        <Activity className="h-4 w-4" />
                        <span>Analytics</span>
                    </Link>
                </nav>
            </div>

            <div className="flex items-center space-x-4">
                <span className="text-sm text-muted-foreground hidden sm:block">
                    {user?.email}
                </span>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                            <Avatar className="h-8 w-8">
                                <AvatarFallback>
                                    {user?.email?.charAt(0).toUpperCase() || 'A'}
                                </AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">
                                    Administrador
                                </p>
                                <p className="text-xs leading-none text-muted-foreground">
                                    {user?.email}
                                </p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <Link href="/admin/profile" className="cursor-pointer">
                                <User className="mr-2 h-4 w-4" />
                                <span>Perfil</span>
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href="/admin/settings" className="cursor-pointer">
                                <Settings className="mr-2 h-4 w-4" />
                                <span>Configuración</span>
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Cerrar sesión</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    )
}
