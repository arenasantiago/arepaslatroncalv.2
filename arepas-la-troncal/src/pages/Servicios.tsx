import React from 'react';

const Servicios: React.FC = () => {
  const servicios = [
    {
      titulo: 'Venta al por Mayor',
      descripcion: 'Suministramos arepas a restaurantes, hoteles y establecimientos comerciales.',
      icono: '🏪'
    },
    {
      titulo: 'Eventos Especiales',
      descripcion: 'Servicio de catering para eventos corporativos, bodas y celebraciones.',
      icono: '🎉'
    },
    {
      titulo: 'Cursos de Elaboración',
      descripcion: 'Aprende a hacer arepas tradicionales con nuestros expertos.',
      icono: '👨‍🍳'
    },
    {
      titulo: 'Arepas Personalizadas',
      descripcion: 'Elaboramos arepas según tus especificaciones y necesidades.',
      icono: '✨'
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-center mb-12">Nuestros Servicios</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
        {servicios.map((servicio, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="text-4xl mb-4">{servicio.icono}</div>
            <h2 className="text-2xl font-semibold mb-4">{servicio.titulo}</h2>
            <p className="text-gray-600">{servicio.descripcion}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 bg-gray-50 rounded-lg p-8 max-w-4xl mx-auto">
        <h2 className="text-2xl font-semibold mb-4 text-center">¿Necesitas un servicio personalizado?</h2>
        <p className="text-gray-600 text-center mb-6">
          Contáctanos para discutir tus necesidades específicas y te ayudaremos a encontrar
          la mejor solución para tu negocio o evento.
        </p>
        <div className="text-center">
          <a
            href="/contacto"
            className="inline-block bg-yellow-500 text-white px-6 py-3 rounded-lg hover:bg-yellow-600 transition-colors"
          >
            Contáctanos
          </a>
        </div>
      </div>
    </div>
  );
};

export default Servicios; 