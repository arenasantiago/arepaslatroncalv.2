import React from 'react';
import Navigation from './Navigation';

const Header: React.FC = () => {
  return (
    <header className="w-full bg-white shadow-md">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <div className="h-16 w-16 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
              ALT
            </div>
            <h1 className="ml-4 text-2xl font-bold text-gray-800">
              Arepas La Troncal
            </h1>
          </div>
          <Navigation />
        </div>
      </div>
    </header>
  );
};

export default Header; 