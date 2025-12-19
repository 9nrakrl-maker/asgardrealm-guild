import { Component, OnInit } from '@angular/core';
import expTableData from '../assets/data/exp-table.json';

interface HistoryItem {
  name: string;
  date: string;   // dd-mm-yyyy
  level: number;
  exp: number;    // exp ภายในเลเวล
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

  // 🔑 exp table ของจริง
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

  ngOnInit() {
    this.today = this.formatDMY(new Date());
    this.last7Days = this.getLastDays(7);
    this.yesterday = this.last7Days[1];

    this.last7Days.forEach(d => this.loadHistory(d));
  }

  // ---------- date helpers ----------
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

  // ---------- load history ----------
  loadHistory(date: string) {
    const url = `assets/data/history/${date}.json?ts=${Date.now()}`;
    fetch(url)
      .then(r => r.ok ? r.json() : [])
      .then(d => this.historyCache[date] = d)
      .catch(() => this.historyCache[date] = []);
  }

  // ---------- helpers ----------
  getHistory(name: string, date: string): HistoryItem | undefined {
    return this.historyCache[date]?.find(x => x.name === name);
  }

  expPercent(level: number, exp: number): number {
    const max = this.expTable[level];
    if (!max || max <= 0) return 0;
    return Number(((exp / max) * 100).toFixed(3));
  }

  // ---------- today / yesterday ----------
  expToday(name: string): number {
    const h = this.getHistory(name, this.today);
    return h ? this.expPercent(h.level, h.exp) : 0;
  }

  expYesterday(name: string): number {
    const h = this.getHistory(name, this.yesterday);
    return h ? this.expPercent(h.level, h.exp) : 0;
  }

  // ---------- diff (logic เดิมคุณ) ----------
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

    // level up
    const remain = 100 - this.expPercent(y.level, y.exp);
    const gain = this.expPercent(t.level, t.exp);
    return Number((remain + gain).toFixed(3));
  }

  // ---------- sort แบบเดิม ----------
  sortedTodayList(): HistoryItem[] {
    const list = this.historyCache[this.today] || [];

    return [...list].sort((a, b) => {

      // 1️⃣ เรียงตาม Level มาก → น้อย
      if (a.level !== b.level) {
        return b.level - a.level;
      }

      // 2️⃣ ถ้า Level เท่ากัน เรียงตาม EXP % (today)
      const expA = this.expPercent(a.level, a.exp);
      const expB = this.expPercent(b.level, b.exp);

      if (expA !== expB) {
        return expB - expA;
      }

      // 3️⃣ fallback (กันกระโดด)
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
  }


  // 🔍 search + sort รวมกัน
  filteredAndSortedList() {
    const list = this.getActiveList();

    if (!this.search) return list;

    const q = this.search.toLowerCase();
    return list.filter(c =>
      c.name.toLowerCase().includes(q)
    );
  }

  getActiveList() {
    if (this.activeDate && this.historyCache[this.activeDate]) {
      return this.historyCache[this.activeDate];
    }

    // fallback = วันนี้ (logic เดิม)
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

      // ⭐ สำคัญ: เอาวันที่เลือกมาเป็น source ของตาราง
      this.current = data;
    })
    .catch(() => {
      this.current = [];
    });
}

  // 🖱 modal
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

  // helper สำหรับ datepicker
  getLastDaysFrom(baseDate: Date, n: number): string[] {
    const result: string[] = [];

    for (let i = 0; i < n; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() - i);
      result.push(this.formatDMY(d));
    }
    return result;
}
}
