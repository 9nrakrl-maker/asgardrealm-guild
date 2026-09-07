import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  ViewEncapsulation,
  OnDestroy
} from '@angular/core';
import Chart from 'chart.js/auto';
import { OnChanges, SimpleChanges } from '@angular/core';

interface HistoryItem {
  name: string;
  date: string; 
  level: number;
  exp: number;
  job?: string;
  img?: string;
  time: string;
}

@Component({
  selector: 'app-history-modal',
  templateUrl: './history-modal.component.html',
  styleUrls: ['./history-modal.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class HistoryModalComponent implements OnInit, OnDestroy, OnChanges {
  ngOnChanges(changes: SimpleChanges) {
    if (changes['history'] && this.history) {
      this.buildHistory();
      this.buildChart();
    }
  }

  @Input() name!: string;
  @Input() history!: Record<string, HistoryItem[]>;
  @Output() rangeRequested = new EventEmitter<number>();
  @Output() close = new EventEmitter<void>();

  ranges = [3, 7, 15, 30, 60, 90, 180, 365];
  quickRanges = [
    { value: 7, label: '7D' }, { value: 30, label: '30D' },
    { value: 90, label: '90D' }, { value: 180, label: '180D' },
    { value: 365, label: '365D' }, { value: -1, label: 'ALL' }
  ];
  selectedRange = 7;
  levelUpList: { date: string; level: number }[] = [];
  allRecords: HistoryItem[] = [];
  expTable: Record<number, number> = {};

  chart?: Chart;

  async ngOnInit() {
    await this.loadExpTable();
    this.buildHistory();
    this.onRangeChange(7);
  }

  ngOnDestroy() {
    this.chart?.destroy();
  }

  async loadExpTable() {
    const res = await fetch('assets/data/exp-table.json');
    this.expTable = await res.json();
  }

  buildHistory() {
    const dates = Object.keys(this.history).sort(this.sortDateAsc);
    this.allRecords = dates
      .map(d => this.history[d]?.find(h => h.name === this.name))
      .filter(Boolean) as HistoryItem[];

    this.buildLevelUpEvents();
  }

  levelUpEvents(): { date: string; level: number }[] {
  const result: { date: string; level: number }[] = [];

  for (let i = 1; i < this.allRecords.length; i++) {
    const prev = this.allRecords[i - 1];
    const curr = this.allRecords[i];

    if (curr.level > prev.level) {
      result.push({
        date: curr.date,
        level: curr.level
      });
    }
  }
  return result;
}

  expGainTodayPercent(): number {
    if (this.allRecords.length < 2) return 0;

    const t = this.allRecords[this.allRecords.length - 1];
    const y = this.allRecords[this.allRecords.length - 2];

    if (t.level === y.level) {
      return this.expToPercent(t.exp - y.exp, t.level);
    }

    const needY = this.expTable[y.level];
    if (!needY) return 0;

    const total = (needY - y.exp) + t.exp;
    return +(total / needY * 100).toFixed(3);
  }

  get latestRecord(): HistoryItem | undefined { return this.allRecords[this.allRecords.length - 1]; }

  get latestProgress(): string {
    return this.latestRecord ? this.expToPercent(this.latestRecord.exp, this.latestRecord.level).toFixed(3) : '0.000';
  }

  get progressWidth(): number {
    return this.latestRecord
      ? Math.min(100, Math.max(0, this.expToPercent(this.latestRecord.exp, this.latestRecord.level)))
      : 0;
  }

  get latestDailyExp(): number {
    return this.allRecords.length < 2 ? 0 : this.expGainBetween(this.allRecords[this.allRecords.length - 2], this.allRecords[this.allRecords.length - 1]);
  }

  buildChart() {
    const canvas = document.getElementById('expChart') as HTMLCanvasElement;
    if (!canvas) return;

    const data = this.recordsByRange();
    const dailyExpLabels: any = {
      id: 'dailyExpLabels',
      afterDatasetsDraw: (chart: Chart) => {
        const context = chart.ctx;
        const bars = chart.getDatasetMeta(0).data;
        const values = data.map(item => item.value);

        context.save();
        context.fillStyle = '#d8efff';
        context.font = '700 11px Inter, system-ui, sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'bottom';
        bars.forEach((bar: any, index: number) => {
          const value = values[index];
          if (value <= 0) return;
          context.fillText(this.formatExpLabel(value), bar.x, bar.y - 7);
        });
        context.restore();
      }
    };

    this.chart?.destroy();
    this.chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: data.map(d => d.date),
        datasets: [{
          label: 'EXP gained',
          data: data.map(d => d.value),
          backgroundColor: 'rgba(79, 215, 255, .72)', hoverBackgroundColor: '#8beaff', borderColor: '#72e4ff',
          borderWidth: 1, borderRadius: 7, borderSkipped: false, maxBarThickness: 44
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 24 } },
        plugins: {
          // The section heading already names this series; removing the legend
          // leaves clear space for values above tall bars.
          legend: { display: false },
          tooltip: {
            backgroundColor: '#151c2b', titleColor: '#f3f7ff', bodyColor: '#b7c4df', borderColor: '#384867', borderWidth: 1,
            callbacks: {
              label: (ctx) => {
                const y = ctx.parsed?.y;
                if (y == null) return '';
                return `EXP gained: ${this.formatExp(y)} (${Math.round(y).toLocaleString('en-US')} EXP)`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(131, 148, 184, .14)' }, border: { display: false },
            ticks: {
              color: '#8795b3',
              callback: (v) => {
                if (typeof v !== 'number') return '';
                return this.formatExp(v);
              }
            }
          },
          x: { grid: { color: 'rgba(131, 148, 184, .10)' }, border: { display: false }, ticks: { color: '#8795b3', maxRotation: 0, autoSkip: true, maxTicksLimit: 7 } }
        }
      },
      plugins: [dailyExpLabels]
    });
  }

  formatProgress(value: number): string {
    const level = Math.floor(value / 100);
    const percent = value % 100;
    return `${level} ${percent.toFixed(3)}%`;
  }

  onRangeChange(range: number) {
    this.selectedRange = +range;
    this.buildChart();
    // One extra snapshot makes a selected N-day range contain N daily gains.
    this.rangeRequested.emit(this.selectedRange === -1 ? -1 : this.selectedRange + 1);
  }

 recordsByRange(): {
    date: string;
    value: number;
  }[] {
    const startIndex = this.selectedRange === -1
      ? 1
      : Math.max(1, this.allRecords.length - this.selectedRange);
    return this.allRecords.slice(startIndex).map((record, index) => ({
      date: record.date,
      value: this.expGainBetween(this.allRecords[startIndex + index - 1], record)
    }));
  }

  /** Total EXP earned between two snapshots, including all levels crossed. */
  expGainBetween(previous: HistoryItem, current: HistoryItem): number {
    if (current.level < previous.level) return 0;
    if (current.level === previous.level) return Math.max(0, current.exp - previous.exp);

    let gained = Math.max(0, (this.expTable[previous.level] || 0) - previous.exp);
    for (let level = previous.level + 1; level < current.level; level++) {
      gained += this.expTable[level] || 0;
    }
    return gained + Math.max(0, current.exp);
  }

  formatExp(value: number): string {
    const units = [
      { value: 1e15, suffix: 'P' },
      { value: 1e12, suffix: 'T' },
      { value: 1e9, suffix: 'B' },
      { value: 1e6, suffix: 'M' },
      { value: 1e3, suffix: 'K' }
    ];
    const unit = units.find(candidate => value >= candidate.value);
    if (!unit) return Math.round(value).toLocaleString('en-US');

    const compact = value / unit.value;
    const precision = compact >= 100 ? 0 : compact >= 10 ? 1 : 2;
    return `${compact.toFixed(precision).replace(/\\.?0+$/, '')}${unit.suffix}`;
  }

  /** Fixed two-decimal compact format for the value rendered above each bar. */
  formatExpLabel(value: number): string {
    const units = [
      { value: 1e15, suffix: 'P' },
      { value: 1e12, suffix: 'T' },
      { value: 1e9, suffix: 'B' },
      { value: 1e6, suffix: 'M' },
      { value: 1e3, suffix: 'K' }
    ];
    const unit = units.find(candidate => value >= candidate.value);
    return unit
      ? `${(value / unit.value).toFixed(2)}${unit.suffix}`
      : Math.round(value).toLocaleString('en-US');
  }

  expToPercent(exp: number, level: number): number {
    const need = this.expTable[level];
    if (!need || exp <= 0) return 0;
    return +(exp / need * 100).toFixed(3);
  }

  sortDateAsc(a: string, b: string): number {
    const [da, ma, ya] = a.split('-').map(Number);
    const [db, mb, yb] = b.split('-').map(Number);
    return new Date(ya, ma - 1, da).getTime()
         - new Date(yb, mb - 1, db).getTime();
  }

  buildLevelUpEvents() {
    const result: { date: string; level: number }[] = [];

    for (let i = 1; i < this.allRecords.length; i++) {
      const prev = this.allRecords[i - 1];
      const curr = this.allRecords[i];

      if (curr.level > prev.level) {
        result.push({
          date: curr.date,
          level: curr.level
        });
      }
    }
    this.levelUpList = result;
  }
  
  openProfile(name: string): void {
    const url = 'https://mapleranks.com/u/' + encodeURIComponent(name);
    window.open(url, '_blank', 'noopener,noreferrer');
  }

}
