export default function ClienteFotos({
    params
}: {
    params: { slug: string; 'event-id': string }
}) {
    return (
        <div>
            <h1>Fotos del Evento - {params.slug}</h1>
            <p>Evento ID: {params['event-id']}</p>
        </div>
    );
}
