import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { HistoryChartComponent } from './history-chart.component';

@NgModule({
  declarations: [
    AppComponent,
    HistoryChartComponent   // ✅ ต้องเพิ่มบรรทัดนี้
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule              // ✅ จำเป็นสำหรับ [(ngModel)]
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
