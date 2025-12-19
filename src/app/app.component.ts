import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

interface Character {
  name: string;
  level: number;
  job: string;
  updated: string;
  leveledUp?: boolean;
}

interface History {
  name: string;
  level: number;
  time: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {

  members: Character[] = [];
  history: History[] = [];
  search = '';
  sortKey: 'name' | 'level' = 'level';
  sortDesc = true;
  guildName = 'AsgardRealm Guild';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.http.get<Character[]>('assets/data/current.json')
      .subscribe(c => {
        this.http.get<History[]>('assets/data/history.json')
          .subscribe(h => {
            this.history = h;
            this.members = c.map(m => ({
              ...m,
              leveledUp: this.didLevelUp(m)
            }));
          });
      });
      this.http.get<any>('assets/data/guild.json').subscribe(g => {
        this.guildName = g.guild;
      });
  }

  didLevelUp(m: Character): boolean {
    const records = this.history.filter(h => h.name === m.name);
    if (records.length < 2) return false;
    return records[records.length - 1].level >
           records[records.length - 2].level;
  }

  get filtered() {
    return this.members
      .filter(m => m.name.toLowerCase().includes(this.search.toLowerCase()))
      .sort((a, b) => {
        const v1 = a[this.sortKey];
        const v2 = b[this.sortKey];
        return this.sortDesc ? (v2 as any) - (v1 as any) : (v1 as any) - (v2 as any);
      });
  }
}
