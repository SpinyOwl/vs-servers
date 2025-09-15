import {Routes} from '@angular/router';
import {Servers} from './servers/servers';
import {Feedback} from './feedback/feedback';

export const routes: Routes = [
  {path: '', component: Servers},
  {path: 'feedback', component: Feedback},
  {path: '**', redirectTo: ''}
];
