import React, { useState } from 'react';

const Contacto: React.FC = () => {
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    mensaje: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Aquí iría la lógica para enviar el formulario
    console.log('Datos del formulario:', formData);
    alert('Gracias por tu mensaje. Nos pondremos en contacto contigo pronto.');
    setFormData({ nombre: '', email: '', telefono: '', mensaje: '' });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-center mb-12">Contacto</h1>

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Información de contacto */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold mb-6">Información de Contacto</h2>
          
          <div className="space-y-4">
            <div className="flex items-start">
              <span className="text-2xl mr-4">📍</span>
              <div>
                <h3 className="font-semibold">Dirección</h3>
                <p className="text-gray-600">Caucasia, Antioquia, Colombia</p>
              </div>
            </div>

            <div className="flex items-start">
              <span className="text-2xl mr-4">📞</span>
              <div>
                <h3 className="font-semibold">Teléfono</h3>
                <p className="text-gray-600">(123) 456-7890</p>
              </div>
            </div>

            <div className="flex items-start">
              <span className="text-2xl mr-4">✉️</span>
              <div>
                <h3 className="font-semibold">Email</h3>
                <p className="text-gray-600">info@arepaslatroncal.com</p>
              </div>
            </div>

            <div className="flex items-start">
              <span className="text-2xl mr-4">⏰</span>
              <div>
                <h3 className="font-semibold">Horario de Atención</h3>
                <p className="text-gray-600">Lunes a Sábado: 7:00 AM - 7:00 PM</p>
                <p className="text-gray-600">Domingo: 8:00 AM - 2:00 PM</p>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <h3 className="font-semibold mb-4">Síguenos en Redes Sociales</h3>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-600 hover:text-yellow-500 transition-colors">
                Facebook
              </a>
              <a href="#" className="text-gray-600 hover:text-yellow-500 transition-colors">
                Instagram
              </a>
              <a href="#" className="text-gray-600 hover:text-yellow-500 transition-colors">
                WhatsApp
              </a>
            </div>
          </div>
        </div>

        {/* Formulario de contacto */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold mb-6">Envíanos un Mensaje</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">
                Nombre Completo
              </label>
              <input
                type="text"
                id="nombre"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              />
            </div>

            <div>
              <label htmlFor="telefono" className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono
              </label>
              <input
                type="tel"
                id="telefono"
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              />
            </div>

            <div>
              <label htmlFor="mensaje" className="block text-sm font-medium text-gray-700 mb-1">
                Mensaje
              </label>
              <textarea
                id="mensaje"
                name="mensaje"
                value={formData.mensaje}
                onChange={handleChange}
                required
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              ></textarea>
            </div>

            <button
              type="submit"
              className="w-full bg-yellow-500 text-white py-3 rounded-lg hover:bg-yellow-600 transition-colors"
            >
              Enviar Mensaje
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Contacto; 