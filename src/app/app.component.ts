import { Component, OnInit } from '@angular/core';
import expTableData from '../assets/data/exp-table.json';
import jobGroupsData from '../assets/data/jobs.json';

interface HistoryItem {
  name: string;
  date: string;
  level: number;
  exp: number;
  time: string;
  job?: string;
  img?: string;
}

interface JobGroup {
  race: string;
  jobs: string[];
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  guildName = 'AsgardRealm Guild';
  expTable: Record<number, number> = expTableData as Record<number, number>;
  jobGroups: JobGroup[] = jobGroupsData as JobGroup[];
  historyCache: Record<string, HistoryItem[]> = {};

  today!: string;
  yesterday!: string;
  search = '';
  jobSearch = '';
  showJobSuggestions = false;
  showAllJobOptions = false;
  showModal = false;
  selectedChar = '';
  selectedDate = '';
  activeDate = '';
  current: HistoryItem[] = [];
  filteredList: HistoryItem[] = [];

  async ngOnInit() {
    this.today = this.formatDMY(new Date());
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    this.yesterday = this.formatDMY(yesterday);

    this.updatelist();
    this.loadHistoryBackwards(new Date(), 365);
  }

  updatelist() {
    const search = this.search.trim().toLocaleLowerCase();

    this.filteredList = this.sortCharacters(this.getActiveList()).filter(character =>
      (!search || character.name.toLocaleLowerCase().includes(search)) &&
      this.matchesJobSearch(character)
    );
  }

  matchesJobSearch(character: HistoryItem): boolean {
    const query = this.jobSearch.trim().toLocaleLowerCase();
    if (!query) return true;

    const race = this.jobGroups.find(group => group.jobs.includes(character.job || ''))?.race || '';
    return character.job?.toLocaleLowerCase().includes(query) || race.toLocaleLowerCase().includes(query) || false;
  }

  get matchingJobGroups(): JobGroup[] {
    const query = this.jobSearch.trim().toLocaleLowerCase();
    if (!query) return this.showAllJobOptions ? this.jobGroups : [];

    return this.jobGroups.filter(group =>
      group.race.toLocaleLowerCase().includes(query) ||
      group.jobs.some(job => job.toLocaleLowerCase().includes(query))
    );
  }

  jobsForGroup(group: JobGroup): string[] {
    const query = this.jobSearch.trim().toLocaleLowerCase();
    return !query || group.race.toLocaleLowerCase().includes(query)
      ? group.jobs
      : group.jobs.filter(job => job.toLocaleLowerCase().includes(query));
  }

  onJobSearchChange() {
    this.showJobSuggestions = true;
    this.showAllJobOptions = false;
    this.updatelist();
  }

  toggleJobSuggestions() {
    this.showJobSuggestions = !this.showJobSuggestions;
    this.showAllJobOptions = this.showJobSuggestions && !this.jobSearch.trim();
  }

  selectRace(race: string) {
    this.jobSearch = race;
    this.showJobSuggestions = false;
    this.showAllJobOptions = false;
    this.updatelist();
  }

  selectJob(job: string) {
    this.jobSearch = job;
    this.showJobSuggestions = false;
    this.showAllJobOptions = false;
    this.updatelist();
  }

  clearJobSearch() {
    this.jobSearch = '';
    this.showJobSuggestions = false;
    this.showAllJobOptions = false;
    this.updatelist();
  }

  sortCharacters(list: HistoryItem[]): HistoryItem[] {
    return [...list].sort((a, b) => {
      if (a.level !== b.level) return b.level - a.level;

      const expA = this.expPercent(a.level, a.exp);
      const expB = this.expPercent(b.level, b.exp);
      if (expA !== expB) return expB - expA;

      return a.name.localeCompare(b.name);
    });
  }

  async loadHistoryBackwards(startDate: Date, maxDays: number) {
    for (let i = 0; i < maxDays; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() - i);
      const dateKey = this.formatDMY(date);

      this.tryLoadHistory(dateKey).then(exists => {
        if (exists) this.updatelist();
      });
    }
  }

  async tryLoadHistory(date: string): Promise<boolean> {
    try {
      const response = await fetch(`assets/data/history/${date}.json?ts=${Date.now()}`);
      if (!response.ok) return false;

      const data = await response.json() as HistoryItem[];
      if (!data?.length) return false;

      this.historyCache[date] = data;
      return true;
    } catch {
      return false;
    }
  }

  formatDMY(date: Date): string {
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    return `${dd}-${mm}-${date.getFullYear()}`;
  }

  getHistory(name: string, date: string): HistoryItem | undefined {
    return this.historyCache[date]?.find(item => item.name === name);
  }

  expPercent(level: number, exp: number): number {
    const max = this.expTable[level];
    return !max || max <= 0 ? 0 : Number(((exp / max) * 100).toFixed(3));
  }

  expToday(name: string): number {
    const history = this.getHistory(name, this.todayKey);
    return history ? this.expPercent(history.level, history.exp) : 0;
  }

  expYesterday(name: string): number {
    const history = this.getHistory(name, this.yesterdayKey);
    return history ? this.expPercent(history.level, history.exp) : 0;
  }

  diffExpPercent(name: string): number {
    const today = this.getHistory(name, this.todayKey);
    const yesterday = this.getHistory(name, this.yesterdayKey);
    if (!today || !yesterday) return 0;

    if (today.level === yesterday.level) {
      return Number((this.expPercent(today.level, today.exp) - this.expPercent(yesterday.level, yesterday.exp)).toFixed(3));
    }

    return Number((100 - this.expPercent(yesterday.level, yesterday.exp) + this.expPercent(today.level, today.exp)).toFixed(3));
  }

  isLevelUpToday(name: string): boolean {
    const today = this.getHistory(name, this.todayKey);
    const yesterday = this.getHistory(name, this.yesterdayKey);
    return !!(today && yesterday && today.level > yesterday.level);
  }

  onDateChange() {
    if (!this.selectedDate) return;

    const [year, month, day] = this.selectedDate.split('-');
    const dateKey = `${day}-${month}-${year}`;
    this.activeDate = dateKey;
    this.loadHistoryByDate(dateKey);
  }

  getActiveList(): HistoryItem[] {
    return this.activeDate ? (this.historyCache[this.activeDate] || []) : (this.historyCache[this.today] || []);
  }

  loadHistoryByDate(dateKey: string) {
    fetch(`assets/data/history/${dateKey}.json?ts=${Date.now()}`)
      .then(response => response.ok ? response.json() : [])
      .then((data: HistoryItem[]) => {
        this.historyCache = { ...this.historyCache, [dateKey]: data };
        this.current = data;
        this.updatelist();
      })
      .catch(() => {
        this.current = [];
        this.updatelist();
      });
  }

  openCharModal(name: string) {
    if (!Object.keys(this.historyCache).length) return;
    this.selectedChar = name;
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  formatShortDate(dateKey: string): string {
    const [day, month, year] = dateKey.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  }

  get todayKey(): string {
    return this.activeDate || this.today;
  }

  get yesterdayKey(): string {
    const date = this.activeDate ? this.parseDateKey(this.activeDate) : new Date();
    date.setDate(date.getDate() - 1);
    return this.formatDMY(date);
  }

  parseDateKey(key: string): Date {
    const [day, month, year] = key.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
}
