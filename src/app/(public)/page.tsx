import { LoginButton } from './components/LoginButton';

export default function HomePage() {
    return (
        <div className="min-h-screen bg-zinc-900 text-white">
            {/* Header con botón de iniciar sesión */}
            <header className="sticky top-0 z-50 flex items-center justify-end px-4 py-4 md:px-8">
                <LoginButton />
            </header>

            {/* Hero Section */}
            <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
                <div className="absolute inset-0 bg-black/20"></div>
                <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
                    <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                        Zenly Studio
                    </h1>
                    <p className="text-xl md:text-2xl text-gray-300 mb-8">
                        Plataforma integral para estudios creativos
                    </p>
                    <p className="text-lg text-gray-400 mb-12 max-w-2xl mx-auto">
                        Gestiona tu estudio, encuentra nuevos clientes y haz crecer tu negocio creativo.
                        Cada estudio tiene su propio espacio personalizado.
                    </p>

                    {/* Badge Próximamente */}
                    <div>
                        <span className="inline-block bg-blue-500/20 border border-blue-500/50 text-blue-300 px-6 py-3 rounded-full text-lg font-medium">
                            Próximamente
                        </span>
                    </div>
                </div>
            </section>

            {/* Simple Footer */}
            <footer className="bg-zinc-800 py-12 px-4">
                <div className="container mx-auto max-w-6xl">
                    <div className="grid md:grid-cols-3 gap-8">
                        <div>
                            <h4 className="font-semibold mb-4">Plataforma</h4>
                            <ul className="space-y-2 text-gray-400">
                                <li><a href="/about" className="hover:text-white transition-colors">Acerca de</a></li>
                                <li><a href="/pricing" className="hover:text-white transition-colors">Precios</a></li>
                                <li><a href="/contact" className="hover:text-white transition-colors">Contacto</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-4">Acceso</h4>
                            <ul className="space-y-2 text-gray-400">
                                <li><a href="/login" className="hover:text-white transition-colors">Iniciar Sesión</a></li>
                                <li><a href="/admin" className="hover:text-white transition-colors">Admin</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-4">Soporte</h4>
                            <ul className="space-y-2 text-gray-400">
                                <li><a href="/contact" className="hover:text-white transition-colors">Contacto</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-zinc-700 mt-8 pt-8 text-center text-gray-400">
                        <p>&copy; 2025 Zenly Studio. Todos los derechos reservados.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
