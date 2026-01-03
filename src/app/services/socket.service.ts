import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface User {
  id: string;
  name: string;
  vote: string | null;
  isObserver: boolean;
}

export interface Lobby {
  id: string;
  host: string;
  users: User[];
  currentStory: string | null;
  votesRevealed: boolean;
  createdAt: number;
}

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket;
  private readonly SERVER_URL = environment.backendUrl;

  private lobbySubject = new BehaviorSubject<Lobby | null>(null);
  public lobby$ = this.lobbySubject.asObservable();

  get currentLobby(): Lobby | null {
    return this.lobbySubject.value;
  }

  private connectedSubject = new BehaviorSubject<boolean>(false);
  public connected$ = this.connectedSubject.asObservable();

  constructor() {
    this.socket = io(this.SERVER_URL);

    this.socket.on('connect', () => {
      this.connectedSubject.next(true);
      console.log('Connected to server');
    });

    this.socket.on('disconnect', () => {
      this.connectedSubject.next(false);
      console.log('Disconnected from server');
    });

    this.socket.on('lobby-updated', (data: { lobby: Lobby }) => {
      if (data.lobby) {
        this.lobbySubject.next(data.lobby);
      }
    });
  }

  get socketId(): string {
    return this.socket.id || '';
  }

  createLobby(userName: string): Observable<{ lobbyId: string; lobby: Lobby }> {
    return new Observable(observer => {
      this.socket.emit('create-lobby', { userName });
      this.socket.once('lobby-created', (data: any) => {
        const lobby: Lobby | null = data?.lobby ?? (data?.id ? { ...data, id: data.id } : null);
        const lobbyId: string = data?.lobbyId ?? data?.id ?? lobby?.id ?? '';
        if (lobby) {
          this.lobbySubject.next(lobby);
        }
        observer.next({ lobbyId, lobby: lobby as Lobby });
        observer.complete();
      });
    });
  }

  joinLobby(lobbyId: string, userName: string): Observable<{ lobby: Lobby }> {
    return new Observable(observer => {
      this.socket.emit('join-lobby', { lobbyId, userName });

      this.socket.once('lobby-joined', (data: { lobby: Lobby }) => {
        this.lobbySubject.next(data.lobby);
        observer.next(data);
        observer.complete();
      });

      this.socket.once('error', (error: { message: string }) => {
        observer.error(error);
      });
    });
  }

  submitVote(lobbyId: string, vote: string): void {
    this.socket.emit('submit-vote', { lobbyId, vote });
  }

  revealVotes(lobbyId: string): void {
    this.socket.emit('reveal-votes', { lobbyId });
  }

  startCountdown(lobbyId: string): void {
    this.socket.emit('start-countdown', { lobbyId });
  }

  selectIssue(lobbyId: string, issue: any): void {
    this.socket.emit('select-issue', { lobbyId, issue });
  }

  updateIssuesList(lobbyId: string, issues: any[]): void {
    this.socket.emit('update-issues', { lobbyId, issues });
  }

  newRound(lobbyId: string, story?: string): void {
    this.socket.emit('new-round', { lobbyId, story });
  }

  onUserJoined(): Observable<{ user: User }> {
    return new Observable(observer => {
      this.socket.on('user-joined', (data: { user: User }) => {
        const lobby = this.lobbySubject.value;
        if (lobby) {
          // Check if user already exists to prevent duplicates
          const exists = lobby.users.some(u => u.id === data.user.id);
          if (!exists) {
            lobby.users.push(data.user);
            this.lobbySubject.next({ ...lobby });
          }
        }
        observer.next(data);
      });
    });
  }

  onUserLeft(): Observable<{ userId: string; userName: string }> {
    return new Observable(observer => {
      this.socket.on('user-left', (data: { userId: string; userName: string }) => {
        const lobby = this.lobbySubject.value;
        if (lobby) {
          const updatedLobby = {
            ...lobby,
            users: lobby.users.filter(u => u.id !== data.userId)
          };
          this.lobbySubject.next(updatedLobby);
        }
        observer.next(data);
      });
    });
  }

  onVoteSubmitted(): Observable<{ userId: string; hasVoted: boolean }> {
    return new Observable(observer => {
      this.socket.on('vote-submitted', (data: { userId: string; hasVoted: boolean }) => {
        const lobby = this.lobbySubject.value;
        if (lobby) {
          const user = lobby.users.find(u => u.id === data.userId);
          if (user) {
            user.vote = 'hidden';
          }
          this.lobbySubject.next({ ...lobby });
        }
        observer.next(data);
      });
    });
  }

  onVotesRevealed(): Observable<{ users: User[] }> {
    return new Observable(observer => {
      this.socket.on('votes-revealed', (data: { users: User[] }) => {
        const lobby = this.lobbySubject.value;
        if (lobby) {
          lobby.users = data.users;
          lobby.votesRevealed = true;
          this.lobbySubject.next({ ...lobby });
        }
        observer.next(data);
      });
    });
  }

  onCountdownStarted(): Observable<void> {
    return new Observable(observer => {
      this.socket.on('countdown-started', () => {
        observer.next();
      });
    });
  }

  onIssueSelected(): Observable<{ issue: any }> {
    return new Observable(observer => {
      this.socket.on('issue-selected', (data: { issue: any }) => {
        observer.next(data);
      });
    });
  }

  onIssuesUpdated(): Observable<{ issues: any[] }> {
    return new Observable(observer => {
      this.socket.on('issues-updated', (data: { issues: any[] }) => {
        observer.next(data);
      });
    });
  }

  onRoundStarted(): Observable<{ story: string; users: User[] }> {
    return new Observable(observer => {
      this.socket.on('round-started', (data: { story: string; users: User[] }) => {
        const lobby = this.lobbySubject.value;
        if (lobby) {
          lobby.users = data.users;
          lobby.currentStory = data.story;
          lobby.votesRevealed = false;
          this.lobbySubject.next({ ...lobby });
        }
        observer.next(data);
      });
    });
  }

  onLobbyClosed(): Observable<void> {
    return new Observable(observer => {
      this.socket.on('lobby-closed', () => {
        this.lobbySubject.next(null);
        observer.next();
      });
    });
  }

  kickUser(lobbyId: string, userId: string): void {
    this.socket.emit('kick-user', { lobbyId, userId });
  }

  onKicked(): Observable<{ lobbyId: string }> {
    return new Observable(observer => {
      this.socket.on('kicked', (data: { lobbyId: string }) => {
        this.lobbySubject.next(null);
        observer.next(data);
      });
    });
  }

  disconnect(): void {
    this.socket.disconnect();
  }
}
