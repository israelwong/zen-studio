export default function AboutPage() {
    return (
        <div className="min-h-screen bg-zinc-900 text-white">
            {/* Hero Section */}
            <section className="relative py-20 px-4 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
                <div className="container mx-auto max-w-4xl text-center">
                    <h1 className="text-5xl font-bold mb-6">Acerca de Zenly Studio</h1>
                    <p className="text-xl text-gray-300 mb-8">
                        Revolucionando la gestión de estudios creativos
                    </p>
                    <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                        Zenly Studio es la solución integral diseñada específicamente para fotógrafos,
                        videógrafos y creativos profesionales que buscan optimizar su flujo de trabajo y hacer crecer su negocio.
                    </p>
                </div>
            </section>

            {/* Content Section */}
            <section className="py-20 px-4">
                <div className="container mx-auto max-w-4xl">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold mb-6">Nuestra Misión</h2>
                        <p className="text-lg text-gray-300 mb-6 max-w-2xl mx-auto">
                            Simplificar la gestión de estudios creativos mediante tecnología innovadora,
                            permitiendo que los profesionales se enfoquen en lo que más aman: crear.
                        </p>
                        <p className="text-lg text-gray-300 max-w-2xl mx-auto">
                            Creemos que cada creativo merece herramientas profesionales que impulsen
                            su crecimiento y optimicen su productividad.
                        </p>
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
