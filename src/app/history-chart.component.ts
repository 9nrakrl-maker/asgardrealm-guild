import { Component, Input, AfterViewInit, OnChanges, SimpleChanges } from '@angular/core';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-history-chart',
  template: `<canvas id="chart"></canvas>`
})
export class HistoryChartComponent implements AfterViewInit, OnChanges {

  @Input() history: any[] = [];

  private chart: Chart | null = null;

  ngAfterViewInit() {
    this.buildChart();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['history'] && !changes['history'].firstChange) {
      this.buildChart();
    }
  }

  private buildChart() {
    if (!this.history || this.history.length === 0) return;

    // destroy เก่าก่อน
    if (this.chart) {
      this.chart.destroy();
    }

    const grouped: Record<string, number[]> = {};

    this.history.forEach(h => {
      grouped[h.name] ??= [];
      grouped[h.name].push(h.level);
    });

    this.chart = new Chart('chart', {
      type: 'line',
      data: {
        labels: grouped[Object.keys(grouped)[0]]
          ?.map((_, i) => `#${i + 1}`) || [],
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