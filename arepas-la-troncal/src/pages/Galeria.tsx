import React from 'react';

const Galeria: React.FC = () => {
  // Array temporal de imágenes (reemplazar con imágenes reales)
  const imagenes = Array(9).fill(null).map((_, index) => ({
    id: index + 1,
    src: `https://picsum.photos/400/300?random=${index + 1}`,
    alt: `Arepa ${index + 1}`
  }));

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-center mb-12">Galería de Imágenes</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {imagenes.map((imagen) => (
          <div key={imagen.id} className="group relative overflow-hidden rounded-lg shadow-md">
            <img
              src={imagen.src}
              alt={imagen.alt}
              className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity duration-300 flex items-center justify-center">
              <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                Ver más
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 text-center">
        <p className="text-gray-600 mb-4">
          ¿Quieres ver más de nuestras arepas y eventos?
        </p>
        <a
          href="https://instagram.com/arepaslatroncal"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-yellow-500 text-white px-6 py-3 rounded-lg hover:bg-yellow-600 transition-colors"
        >
          Síguenos en Instagram
        </a>
      </div>
    </div>
  );
};

export default Galeria; 