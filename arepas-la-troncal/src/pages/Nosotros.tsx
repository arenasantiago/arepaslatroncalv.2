import React from 'react';

const Nosotros: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <section className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8">Sobre Nosotros</h1>
        
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-4">Nuestra Historia</h2>
          <p className="text-gray-600 mb-6">
            Arepas La Troncal nace en el corazón de Caucasia, Antioquia, con la misión de preservar
            y compartir la tradición de las arepas artesanales. Desde nuestros inicios, nos hemos
            dedicado a elaborar las mejores arepas con ingredientes de la más alta calidad.
          </p>
          <p className="text-gray-600">
            Nuestro compromiso con la tradición y la excelencia nos ha permitido crecer y llegar
            a más personas, manteniendo siempre la autenticidad de nuestras recetas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold mb-4">Nuestra Misión</h2>
            <p className="text-gray-600">
              Proporcionar las mejores arepas artesanales, manteniendo la tradición y calidad
              que nos caracteriza, mientras innovamos para satisfacer las necesidades de nuestros
              clientes.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold mb-4">Nuestra Visión</h2>
            <p className="text-gray-600">
              Ser reconocidos como la mejor fábrica de arepas artesanales de la región,
              expandiendo nuestra tradición y sabor a más lugares.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Nosotros; 