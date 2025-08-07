import { CommonModule } from '@angular/common';
import { CartService } from './../../services/cart.service';
import { Component, OnDestroy } from '@angular/core';
import { Router, NavigationEnd, RouterLink, RouterLinkActive } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './navbar.component.html',
})
export class NavbarComponent implements OnDestroy {
  drawerOpen = false;
  carritoCount$: Observable<number>;

  private destroy$ = new Subject<void>();

  constructor(
    private cartService: CartService,
    private router: Router
  ) {
    // Inicializa el contador del carrito
    this.carritoCount$ = this.cartService
      .getCarrito()
      .pipe(map(items => items.length));

    // Cierra el drawer al navegar
    this.router.events
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        if (event instanceof NavigationEnd) {
          this.closeDrawer();
        }
      });
  }

  goToCart(): void {
    this.router.navigate(['/carrito']);
    this.closeDrawer();
  }

  toggleDrawer(): void {
    this.drawerOpen = !this.drawerOpen;
  }

  closeDrawer(): void {
    this.drawerOpen = false;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
