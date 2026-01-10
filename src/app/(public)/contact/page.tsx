export default function ContactPage() {
    return (
        <div className="min-h-screen bg-zinc-900 text-white">
            {/* Hero Section */}
            <section className="relative py-20 px-4 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
                <div className="container mx-auto max-w-4xl text-center">
                    <h1 className="text-5xl font-bold mb-6">Contacto</h1>
                    <p className="text-xl text-gray-300 mb-8">
                        ¿Necesitas ayuda? Estamos aquí para ti
                    </p>
                    <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                        Nuestro equipo de soporte está listo para ayudarte.
                    </p>
                </div>
            </section>

            {/* Contact Section */}
            <section className="py-20 px-4">
                <div className="container mx-auto max-w-4xl">
                    <div className="bg-zinc-800 p-8 rounded-lg max-w-2xl mx-auto">
                        <h2 className="text-3xl font-bold mb-8 text-center">Información de Contacto</h2>

                        <div className="space-y-6">
                            <div className="flex items-start">
                                <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold mb-2">Email</h3>
                                    <p className="text-gray-300">soporte@zenly.mx</p>
                                </div>
                            </div>
                        </div>
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
