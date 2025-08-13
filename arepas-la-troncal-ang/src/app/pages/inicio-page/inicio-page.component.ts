import { ChangeDetectionStrategy, Component } from '@angular/core';
import { HeroComponent } from "../../components/hero/hero.component";
import { NavbarComponent } from "../../components/navbar/navbar.component";
import { FooterComponent } from "../../components/footer/footer.component";
import { WhatsappFabComponent } from "../../shared/whatsapp-fab/whatsapp-fab.component";

@Component({
  selector: 'app-inicio-page',
  imports: [HeroComponent, NavbarComponent, FooterComponent, WhatsappFabComponent],
  templateUrl: './inicio-page.component.html',
})
export class InicioPageComponent { }
