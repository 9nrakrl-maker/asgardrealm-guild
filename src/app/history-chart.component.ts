import { Component, Input, AfterViewInit } from '@angular/core';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-history-chart',
  template: `<canvas id="chart"></canvas>`
})
export class HistoryChartComponent implements AfterViewInit {

  @Input() history: any[] = [];   // ✅ ต้องมี @Input

  ngAfterViewInit() {
    if (!this.history || this.history.length === 0) return;

    const grouped: Record<string, number[]> = {};

    this.history.forEach(h => {
      grouped[h.name] ??= [];
      grouped[h.name].push(h.level);
    });

    new Chart('chart', {
      type: 'line',
      data: {
        labels: grouped[Object.keys(grouped)[0]]
          .map((_, i) => `#${i + 1}`),
        datasets: Object.keys(grouped).slice(0, 5).map(name => ({
          label: name,
          data: grouped[name],
          borderWidth: 2,
          tension: 0.3
        }))
      }
    });
  }
}
