import { Routes } from '@angular/router';
import { HomePage } from './pages/home-page/home-page';
import { NewGame } from './pages/new-game/new-game';
import { GamePage } from './pages/game-page/game-page';
import { AccountPage } from './pages/account-page/account-page';

export const routes: Routes = [
    { path: '', component: HomePage },
    { path: 'new-game', component: NewGame },
    { path: 'game/:lobbyId', component: GamePage },
    { path: 'account', component: AccountPage },
];
