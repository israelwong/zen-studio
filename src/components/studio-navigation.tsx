'use client'

import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/browser'
import { Button } from '@/components/ui/shadcn/button'
import { Avatar, AvatarFallback } from '@/components/ui/shadcn/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/shadcn/dropdown-menu'
import { LogOut, User, Settings, Camera, Calendar, Users, DollarSign } from 'lucide-react'
import { useEffect, useState } from 'react'
import { User as SupabaseUser } from '@supabase/supabase-js'

export function StudioNavigation() {
    const supabase = createClient()
    const router = useRouter()
    const params = useParams()
    const studioSlug = params.slug as string

    const [user, setUser] = useState<SupabaseUser | null>(null)
    const [studioName, setStudioName] = useState<string>('')

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            setUser(user)

            // Obtener nombre del studio
            if (studioSlug) {
                const { data: studio } = await supabase
                    .from('studios')
                    .select('name')
                    .eq('slug', studioSlug)
                    .single()

                if (studio) {
                    setStudioName(studio.name)
                }
            }
        }
        getUser()
    }, [supabase, studioSlug])

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    const getUserInitials = (email: string) => {
        return email.split('@')[0].substring(0, 2).toUpperCase()
    }

    return (
        <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-4">
                <Link href={`/studio/${studioSlug}`} className="flex items-center space-x-2">
                    <Camera className="h-6 w-6 text-primary" />
                    <span className="text-xl font-bold">{studioName || 'Studio'}</span>
                </Link>

                <nav className="hidden md:flex items-center space-x-6 ml-8">
                    <Link
                        href={`/studio/${studioSlug}`}
                        className="text-sm font-medium hover:text-primary transition-colors"
                    >
                        Dashboard
                    </Link>
                    <Link
                        href={`/studio/${studioSlug}/eventos`}
                        className="text-sm font-medium hover:text-primary transition-colors flex items-center"
                    >
                        <Calendar className="mr-1 h-4 w-4" />
                        Eventos
                    </Link>
                    <Link
                        href={`/studio/${studioSlug}/clientes`}
                        className="text-sm font-medium hover:text-primary transition-colors flex items-center"
                    >
                        <Users className="mr-1 h-4 w-4" />
                        Clientes
                    </Link>
                    <Link
                        href={`/studio/${studioSlug}/cotizaciones`}
                        className="text-sm font-medium hover:text-primary transition-colors flex items-center"
                    >
                        <DollarSign className="mr-1 h-4 w-4" />
                        Cotizaciones
                    </Link>
                </nav>
            </div>

            <div className="flex items-center space-x-4">
                <Button variant="outline" size="sm">
                    <Settings className="mr-2 h-4 w-4" />
                    Configuración
                </Button>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                            <Avatar className="h-8 w-8">
                                <AvatarFallback>
                                    {user ? getUserInitials(user.email!) : 'U'}
                                </AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">
                                    {user?.email}
                                </p>
                                <p className="text-xs leading-none text-muted-foreground">
                                    Suscriptor
                                </p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                            <User className="mr-2 h-4 w-4" />
                            <span>Perfil</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Configuración</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleSignOut}>
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Cerrar sesión</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    )
}
