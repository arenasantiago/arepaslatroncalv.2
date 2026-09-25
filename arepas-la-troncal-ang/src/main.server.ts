import { bootstrapApplication, BootstrapContext } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { config } from './app/app.config.server';

// Angular >= 19.2.16 exige pasar el BootstrapContext en el servidor (aisla la
// plataforma por peticion; sin el, el prerender falla con NG0401).
const bootstrap = (context: BootstrapContext) =>
  bootstrapApplication(AppComponent, config, context);

export default bootstrap;
