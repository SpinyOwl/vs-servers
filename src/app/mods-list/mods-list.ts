import {Component, inject, Input} from '@angular/core';
import {CommonModule} from '@angular/common';
import {VsMod} from '../../services/servers.service';
import {ModsService, VsModInfo} from '../../services/mods.service';

@Component({
  selector: 'app-mods-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mods-list.html',
  styleUrl: './mods-list.scss',
})
export class ModsList {
  @Input() mods: VsMod[] | null | undefined;

  private readonly modsService = inject(ModsService);
  private readonly infoMap = new Map<string, VsModInfo>();

  sortedMods() {
    return (this.mods ?? []).slice().sort((a, b) => a.id.localeCompare(b.id));
  }

  loadModInfo(modid: string) {
    console.log(`Loading mod info for ${modid}. ${this.infoMap.has(modid)}`);
    if (!this.infoMap.has(modid)) {
      this.modsService.get$(modid).subscribe((info) => {
        this.infoMap.set(modid, info);
        console.log(`Loaded mod info for ${modid}`);
      });
    }
  }

  getInfo(modid: string) {
    return this.infoMap.get(modid);
  }

  modUrl(modid: string) {
    return `https://mods.vintagestory.at/show/mod/${modid}`;
  }

  imageUrl(info: VsModInfo): string | undefined {
    return (
      info['image'] ||
      info['icon'] ||
      info['logo'] ||
      info['iconurl'] ||
      info['img'] ||
      info['thumbnail']
    );
  }
}
