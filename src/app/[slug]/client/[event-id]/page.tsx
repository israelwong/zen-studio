export default function ClienteEvento({
    params
}: {
    params: { slug: string; 'event-id': string }
}) {
    return (
        <div>
            <h1>Evento del Cliente - {params.slug}</h1>
            <p>Evento ID: {params['event-id']}</p>
        </div>
    );
}
