import {ChangeDetectionStrategy, Component} from '@angular/core';
import {version} from '../../../package.json';
import {buildInfo} from '../../build-info';

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
  readonly commitShort = buildInfo.commitShort;
  readonly commitUrl =
    buildInfo.commit === 'unknown' ? null : `${this.repoUrl}/commit/${buildInfo.commit}`;
  readonly dirty = buildInfo.dirty;
  readonly builtAt = buildInfo.builtAt;
}
