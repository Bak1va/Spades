import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

export interface Issue {
  id: string;
  title: string;
  points?: string;
  status: 'pending' | 'voting' | 'completed';
}

@Component({
  selector: 'app-issues-tab',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './issues-tab.html',
  styleUrl: './issues-tab.css',
})
export class IssuesTab {
  @Input() isHost = false;
  @Input() currentIssue: Issue | null = null;
  @Output() issueSelected = new EventEmitter<Issue>();
  @Output() issueAdded = new EventEmitter<string>();
  @Output() issueDeleted = new EventEmitter<string>();

  issues: Issue[] = [];
  newIssueTitle = '';
  showAddForm = false;

  addIssue(): void {
    const title = this.newIssueTitle.trim();
    if (!title) return;

    const issue: Issue = {
      id: Date.now().toString(),
      title: title,
      status: 'pending'
    };

    this.issues.push(issue);
    this.issueAdded.emit(title);
    this.newIssueTitle = '';
    this.showAddForm = false;
  }

  selectIssue(issue: Issue): void {
    this.issueSelected.emit(issue);
  }

  deleteIssue(issue: Issue): void {
    this.issues = this.issues.filter(i => i.id !== issue.id);
    this.issueDeleted.emit(issue.id);
  }

  getIssuesByStatus(status: string): Issue[] {
    return this.issues.filter(i => i.status === status);
  }

  getTotalPoints(): number {
    return this.issues
      .filter(i => i.status === 'completed' && i.points && !isNaN(Number(i.points)))
      .reduce((sum, i) => sum + Number(i.points), 0);
  }
}
