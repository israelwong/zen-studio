export default function ClienteHome({ params }: { params: { slug: string } }) {
    return (
        <div>
            <h1>Portal del Cliente - {params.slug}</h1>
            <p>Portal principal del cliente</p>
        </div>
    );
}
