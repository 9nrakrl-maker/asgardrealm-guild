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

interface HistoryItem {
  name: string;
  date: string;   // dd-mm-yyyy
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
export class HistoryModalComponent implements OnInit, OnDestroy {

  @Input() name!: string;
  @Input() history!: Record<string, HistoryItem[]>;
  @Output() close = new EventEmitter<void>();

  ranges = [3, 7, 15, 30, 60, 90, 180, 360];
  selectedRange = 7;
  levelUpList: { date: string; level: number }[] = [];
  allRecords: HistoryItem[] = [];
  expTable: Record<number, number> = {};

  chart?: Chart;

  async ngOnInit() {
    await this.loadExpTable();
    this.buildHistory();
    this.buildChart();
  }

  ngOnDestroy() {
    this.chart?.destroy();
  }

  // ---------- load ----------
  async loadExpTable() {
    const res = await fetch('assets/data/exp-table.json');
    this.expTable = await res.json();
  }

  buildHistory() {
    const dates = Object.keys(this.history).sort(this.sortDateAsc);

    this.allRecords = dates
      .map(d => this.history[d]?.find(h => h.name === this.name))
      .filter(Boolean) as HistoryItem[];

    // ⭐ สำคัญมาก
    this.buildLevelUpEvents();
  }

  // ---------- level up ----------
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

  // ---------- EXP gain today ----------
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

  // ---------- chart ----------
  buildChart() {
    setTimeout(() => {
      const canvas = document.getElementById('expChart') as HTMLCanvasElement;
      if (!canvas) return;

      const data = this.recordsByRange();

      this.chart?.destroy();
      this.chart = new Chart(canvas, {
        type: 'line',
        data: {
          labels: data.map(d => d.date),
          datasets: [{
            label: 'Level + EXP %',
            data: data.map(d => d.value),
            tension: 0.3,
            fill: true
          }]
        },
        options: {
          responsive: true,
          plugins: {
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  const y = ctx.parsed?.y;
                  if (y == null) return '';
                  return this.formatProgress(y);
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: false,
              ticks: {
                callback: (v) => {
                  if (typeof v !== 'number') return '';
                  return this.formatProgress(v);
                }
              }
            }
          }
        }
      });
    });
  }

  formatProgress(value: number): string {
    const level = Math.floor(value / 100);
    const percent = value % 100;
    return `${level} ${percent.toFixed(3)}%`;
  }

  onRangeChange() {
    this.buildChart();
  }

 recordsByRange(): {
    date: string;
    value: number;
  }[] {
    const slice = this.allRecords.slice(-this.selectedRange);

    return slice.map(r => {
      const need = this.expTable[r.level];
      if (!need || need <= 0) {
        return {
          date: r.date,
          value: r.level * 100
        };
      }

      const percent = (r.exp / need) * 100;

      // ⭐ level * 100 + exp%
      const value = r.level * 100 + percent;

      return {
        date: r.date,
        value: +value.toFixed(3)
      };
    });
  }



  // ---------- helpers ----------
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
    console.log(url);
  }

}
