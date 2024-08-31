import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ServiceWorkerModule } from '@angular/service-worker';
import { environment } from '../environments/environment';
import { HttpClientModule} from '@angular/common/http';
import { WebAuthnMockComponent } from './components/web-authn-mock/web-authn-mock.component';
import { WebAuthnComponent } from './components/web-authn/web-authn.component';
import { ToggleSwitchComponent } from './components/toggle-switch/toggle-switch.component';
import { WebAuthnService } from './services/web-authn-service';

@NgModule({
  declarations: [
    AppComponent,
    WebAuthnComponent,
    WebAuthnMockComponent,
    ToggleSwitchComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    ServiceWorkerModule.register('ngsw-worker.js', { enabled: environment.production }),
    HttpClientModule
  ],
  providers: [WebAuthnService],
  bootstrap: [AppComponent]
})
export class AppModule { }
