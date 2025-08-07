import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs'; // 'of' nos permite crear un Observable a partir de un valor
import { Arepa } from '../models/arepa.model';

@Injectable({
  providedIn: 'root'
})
export class ProductService {

  // Simulamos los datos que vendrían de una base de datos o una API
  private arepas: Arepa[] = [
    {
      id: 1,
      name: 'Telas',
      description: 'Arepa tela de maiz blanco',
      price: 1000,
      image: 'assets/img/arepapaquete.jpg'
    },
    {
      id: 2,
      name: 'Redonda',
      description: 'Arepa pequeña redonda.',
      price: 400,
      image: 'assets/img/arepitaredondav2.png'
    },
    {
      id: 3,
      name: 'Arepa con Pollo',
      description: 'Una arepa clásica con pollo desmechado.',
      price: 8000,
      image: 'assets/img/arepascontodorehecha.png'
    },
    {
      id: 4,
      name: 'Arepa con todo',
      description: 'La famosa arepa costeña con un huevo frito en su interior.',
      price: 8000,
      image: 'assets/img/contodo.png'
    },
  ];

  constructor() { }

  // Método que simula la obtención de productos de una API
  // Devuelve un Observable para manejar la asincronía
  getArepas(): Observable<Arepa[]> {
    return of(this.arepas);
  }
}
