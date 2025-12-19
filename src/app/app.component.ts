import { Component, OnInit } from '@angular/core';

interface CurrentChar {
  name: string;
  level: number;
  exp: number;
  job: string;
  img: string;
  time: string;
}

interface HistoryItem {
  name: string;
  date: string;
  level: number;
  exp: number;
  time: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {

  guildName = 'AsgardRealm Guild';

  current: CurrentChar[] = [];
  history: HistoryItem[] = [];

  expTable: Record<number, number> = {};

  search = '';

  ngOnInit() {
    this.loadCurrent();
    this.loadHistory();
    this.loadExpTable();
  }

  // ---------------- load data ----------------

  loadCurrent() {
    fetch('assets/data/current.json')
      .then(res => res.json())
      .then(data => {
        // ถ้า current.json เป็น object { name: {...} }
        const arr = Array.isArray(data)
          ? data
          : Object.values(data);

        this.current = arr.sort((a: any, b: any) => {
          // 1️⃣ level
          if (b.level !== a.level) {
            return b.level - a.level;
          }

          // 2️⃣ exp %
          const expA = a.expPercent ?? a.exp ?? 0;
          const expB = b.expPercent ?? b.exp ?? 0;
          return expB - expA;
        });
      })
      .catch(() => this.current = []);
  }

  loadHistory() {
    fetch('assets/data/history.json?ts=' + Date.now())
      .then(res => res.json())
      .then((data: HistoryItem[]) => {
        this.history = Array.isArray(data) ? data : [];
      })
      .catch(err => {
        console.error(err);
        this.history = [];
      });
  }

  loadExpTable() {
    fetch('assets/data/exp-table.json')
      .then(r => r.json())
      .then(d => this.expTable = d || {})
      .catch(() => this.expTable = {});
  }

  // ---------------- helpers ----------------

  filteredCurrent() {
    return this.current.filter(c =>
      c.name.toLowerCase().includes(this.search.toLowerCase())
    );
  }

  expPercent(c: CurrentChar): number {
    if (!c || c.exp == null) return 0;
    const need = this.expTable[c.level];
    if (!need) return 0;
    return Number(((c.exp / need) * 100).toFixed(3));
  }

  lastExpPercent(name: string): number {
    if (!name) return 0;

    const list = this.history
      .filter(h => h.name === name)
      .sort((a, b) => +new Date(b.time) - +new Date(a.time));

    if (!list.length) return 0;

    const target = list.length > 1 ? list[1] : list[0];
    const need = this.expTable[target.level];

    if (!need || need <= 0) return 0;

    return Number(((target.exp / need) * 100).toFixed(3));
  }

  yesterdayOf(name: string): HistoryItem | null {
    const list = this.history
      .filter(h => h.name === name)
      .sort((a, b) => +new Date(b.time) - +new Date(a.time));
    return list.length > 1 ? list[1] : null;
  }

  lastUpdate(c: CurrentChar): string {
    return c.time ? new Date(c.time).toLocaleString() : '-';
  }

  isLvlChangedToday(c: any): boolean {
    const y = this.yesterdayOf(c.name);
    if (!y) return false;
    return c.level !== y.level;
  }

  isExpChangedToday(c: any): boolean {
    const y = this.yesterdayOf(c.name);
    if (!y) return false;
    return c.exp !== y.exp;
  }

  diffExpPercent(c: CurrentChar): number | null {
    const y = this.yesterdayOf(c.name);
    if (!y) return null;

    const needYesterday = this.expTable[y.level];
    const needToday = this.expTable[c.level];
    if (!needYesterday || !needToday) return null;

    const yesterdayPercent =
      Number(((y.exp / needYesterday) * 100).toFixed(3));

    const todayPercent = this.expPercent(c);

    // ✅ กรณีเลเวลไม่เปลี่ยน
    if (y.level === c.level) {
      return Number((todayPercent - yesterdayPercent).toFixed(3));
    }

    // ✅ กรณีเลเวลอัป (บวกข้ามเลเวล)
    if (c.level > y.level) {
      const diff =
        (100 - yesterdayPercent) + todayPercent;

      return Number(diff.toFixed(3));
    }

    // ❓ กรณีเลเวลลด (แทบไม่ควรเกิด)
    return null;
  }

}
