import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const Navigation: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { name: 'Inicio', path: '/' },
    { name: 'Nosotros', path: '/nosotros' },
    { name: 'Servicios', path: '/servicios' },
    { name: 'Galería', path: '/galeria' },
    { name: 'Empresas', path: '/empresas' },
    { name: 'Contacto', path: '/contacto' },
  ];

  return (
    <nav className="bg-red-600 shadow-lg w-full">
      <div className="px-8 md:px-16 lg:px-24">
        <div className="flex justify-between items-center h-32">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center">
              <img
                className="h-28 w-auto"
                src="/src/assets/img/logo.png"
              />
            </Link>
          </div>

          {/* Botón de menú móvil */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-white hover:text-red-100 focus:outline-none"
            >
              <svg
                className="h-8 w-8"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 24 24"
              >
                {isOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>

          {/* Menú vertical para móvil */}
          <div
            className={`${
              isOpen ? 'block' : 'hidden'
            } md:hidden absolute top-32 left-0 w-full bg-red-600 shadow-lg`}
          >
            <div className="px-4 pt-4 pb-6 space-y-2">
              {menuItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="block px-4 py-3 rounded-md text-white text-xl hover:bg-red-700 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Menú vertical para desktop */}
          <div className="hidden md:flex md:flex-col md:items-end md:space-y-4 md:py-4">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="px-6 py-3 rounded-md text-white text-xl hover:bg-red-700 transition-colors"
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation; 