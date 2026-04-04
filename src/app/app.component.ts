import { Component, OnInit } from '@angular/core';
import expTableData from '../assets/data/exp-table.json';

interface HistoryItem {
  name: string;
  date: string;
  level: number;
  exp: number; 
  time: string;
  job?: string;
  img?: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  guildName = 'AsgardRealm Guild';
  expTable: Record<number, number> = expTableData as any;
  historyCache: Record<string, HistoryItem[]> = {};

  today!: string;
  yesterday!: string;
  last7Days: string[] = [];
  search = '';
  showModal = false;
  selectedChar = '';
  selectedDate = '';
  activeDate = '';
  current: any[] = [];
  filteredList: any[] = [];

  async ngOnInit() {
    this.today = this.formatDMY(new Date());
    let date = new Date();
    date.setDate(date.getDate()-1)
    this.yesterday = this.formatDMY(date);
    await this.loadHistoryBackwards(new Date(), 365);
    
    const [y, m, d] = this.selectedDate.split('-');
    const dateKey = `${d}-${m}-${y}`;
    this.updatelist();
  }

  updatelist(){
    const list = this.getActiveList();
    if(!this.search){
      this.filteredList = list;
      return;
    }
    const q = this.search.toLowerCase();
    this.filteredList = list.filter(c => c.name.toLocaleLowerCase().includes(q));
  }

  async loadHistoryBackwards(startDate: Date, maxDays: number) {
    for (let i = 0; i < maxDays; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() - i);
      const dateKey = this.formatDMY(d);
      const exists = await this.tryLoadHistory(dateKey);
      if (!exists) {
        break;
      }
    }
  }

  async tryLoadHistory(date: string): Promise<boolean> {
    const url = `assets/data/history/${date}.json?ts=${Date.now()}`;
    try {
      const res = await fetch(url);

      if (!res.ok) return false;

      const data = await res.json();

      if (data && data.length) {
        this.historyCache[date] = data;
        return true;
      }
      return false;

    } catch {
      return false;
    }
  }

  formatDMY(date: Date): string {
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  }

  getLastDays(n: number): string[] {
    const result: string[] = [];
    const base = new Date();

    for (let i = 0; i < n; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() - i);
      result.push(this.formatDMY(d));
    }
    return result;
  }

  getHistory(name: string, date: string): HistoryItem | undefined {
    return this.historyCache[date]?.find(x => x.name === name);
  }

  expPercent(level: number, exp: number): number {
    const max = this.expTable[level];
    if (!max || max <= 0) return 0;
    return Number(((exp / max) * 100).toFixed(3));
  }

  expToday(name: string): number {
    const h = this.getHistory(name, this.today);
    return h ? this.expPercent(h.level, h.exp) : 0;
  }

  expYesterday(name: string): number {
    const h = this.getHistory(name, this.yesterday);
    return h ? this.expPercent(h.level, h.exp) : 0;
  }

  diffExpPercent(name: string): number {
    const t = this.getHistory(name, this.today);
    const y = this.getHistory(name, this.yesterday);

    if (!t || !y) return 0;

    if (t.level === y.level) {
      return Number(
        (this.expPercent(t.level, t.exp)
       - this.expPercent(y.level, y.exp)).toFixed(3)
      );
    }

    const remain = 100 - this.expPercent(y.level, y.exp);
    const gain = this.expPercent(t.level, t.exp);
    return Number((remain + gain).toFixed(3));
  }

  sortedTodayList(): HistoryItem[] {
    const list = this.historyCache[this.today] || [];
    return [...list].sort((a, b) => {
      if (a.level !== b.level) {
        return b.level - a.level;
      }
      const expA = this.expPercent(a.level, a.exp);
      const expB = this.expPercent(b.level, b.exp);

      if (expA !== expB) {
        return expB - expA;
      }
      return a.name.localeCompare(b.name);
    });
  }

  isLevelUpToday(name: string): boolean {
    const t = this.getHistory(name, this.today);
    const y = this.getHistory(name, this.yesterday);
    return !!(t && y && t.level > y.level);
  }

  onDateChange() {
    if (!this.selectedDate) return;

    const [y, m, d] = this.selectedDate.split('-');
    const dateKey = `${d}-${m}-${y}`;
    this.activeDate = dateKey;
    this.loadHistoryByDate(dateKey);
    this.updatelist()
  }

  getActiveList() {
    if (this.activeDate && this.historyCache[this.activeDate]) {
      return this.historyCache[this.activeDate];
    }
    return this.sortedTodayList();
  }

  loadHistoryByDate(dateKey: string) {
  const url = `assets/data/history/${dateKey}.json?ts=${Date.now()}`;
  fetch(url)
    .then(res => res.ok ? res.json() : [])
    .then(data => {
      this.historyCache = {
        ...this.historyCache,
        [dateKey]: data
      };
      this.current = data;
    })
    .catch(() => {
      this.current = [];
    });
}

  openCharModal(name: string) {
    if (!Object.keys(this.historyCache).length) {
      console.warn('History not loaded yet');
      return;
    }
    this.selectedChar = name;
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  getLastDaysFrom(baseDate: Date, n: number): string[] {
    const result: string[] = [];

    for (let i = 0; i < n; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() - i);
      result.push(this.formatDMY(d));
    }
    return result;
  }

  formatShortDate(dateKey: string): string {
    const [d, m, y] = dateKey.split('-').map(Number);
    const date = new Date(y, m - 1, d);

    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short'
    });
  }
  
  get todayKey(): string {
    if (this.activeDate) return this.activeDate;
    return this.getDateKey(new Date());
  }

  get yesterdayKey(): string {
    const base = this.activeDate
      ? this.parseDateKey(this.activeDate)
      : new Date();

    const d = new Date(base);
    d.setDate(d.getDate() - 1);
    return this.getDateKey(d);
  }

  getDateKey(d: Date): string {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  }

  parseDateKey(key: string): Date {
    const [dd, mm, yyyy] = key.split('-').map(Number);
    return new Date(yyyy, mm - 1, dd);
  }
}
