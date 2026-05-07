import { Injectable } from '@angular/core';
import { TranslocoService } from '@ngneat/transloco';
import { BehaviorSubject } from 'rxjs';
import { Constantes } from 'src/app/shared/constantes/constante';
import { StorageService } from 'src/app/shared/services/storage.service';
import { DisplayMenuModel, MenuTypeEnum } from '../models/display-menu.model';

enum DesignToApplyEnum {
    Default,
    Home,
    Informations,
}

@Injectable({
  providedIn: 'root',
})
export class AppShellService {
    public DesignToApplyEnum = DesignToApplyEnum;

    private _designToApply$ = new BehaviorSubject<DesignToApplyEnum>(DesignToApplyEnum.Default);
    DesignToApply$ = this._designToApply$.asObservable();

    private _displayFooter$ = new BehaviorSubject<boolean>(true);
    DisplayFooter$ = this._displayFooter$.asObservable();

    private _displayMenu$ = new BehaviorSubject<DisplayMenuModel | null>(null);
    DisplayMenu$ = this._displayMenu$.asObservable() as BehaviorSubject<DisplayMenuModel | null>;

    constructor(private translocoService: TranslocoService, private storageService: StorageService) { }

    setActiveLanguage(newLang: string): string | null {
        try {
            this.translocoService.setDefaultLang(newLang);
            this.translocoService.setActiveLang(newLang);

            this.storageService.addLocalStorage(Constantes.languageStorage, newLang);

            return this.translocoService.getActiveLang();
        } catch (err: any) {
            console.log(err);
            return null;
        }
    }
    
    getActiveLanguage(): string | null {
    return this.translocoService.getActiveLang();
    }

    setDesignToApply(newValue: DesignToApplyEnum): void {
        this._designToApply$.next(newValue);
    }

    displayFooter(newValue: boolean): void {
        this._displayFooter$.next(newValue);
    }

    displayMenu(type: MenuTypeEnum, newValue: boolean): void {
        this._displayMenu$.next({ type, newValue });
    }
}