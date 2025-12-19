import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HistoryModalComponent } from './history-modal.component';

@NgModule({
  declarations: [
    AppComponent,
    HistoryModalComponent 
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatInputModule,
    FormsModule   // ⭐ สำคัญสำหรับ ngModel
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}
