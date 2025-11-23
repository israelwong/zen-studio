export default function ClienteTimeline({
    params
}: {
    params: { slug: string; 'event-id': string }
}) {
    return (
        <div>
            <h1>Timeline del Evento - {params.slug}</h1>
            <p>Evento ID: {params['event-id']}</p>
        </div>
    );
}
