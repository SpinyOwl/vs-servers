import {ChangeDetectionStrategy, Component} from '@angular/core';
import {version} from '../../../package.json';

@Component({
  selector: 'app-footer',
  standalone: true,
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Footer {
  readonly name = 'Vintage Story — Public Servers';
  readonly version: string = version;
  readonly year = new Date().getFullYear();
  readonly repoUrl = 'https://github.com/SpinyOwl/vs-servers';
}
