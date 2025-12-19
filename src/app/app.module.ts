import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';

import { AppComponent } from './app.component';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    FormsModule   // ⭐ สำคัญสำหรับ ngModel
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}
