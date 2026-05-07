import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { NotFoundComponent } from '../components/not-found/not-found.component';
import { AuthGuard } from '../guards/auth.guard';
import { AdminGuard } from '../guards/admin.guard';

const routes: Routes = [
  {
    path: 'admin',
    loadChildren: () =>
      import('../../admin/admin.module').then((mod) => mod.AdminModule),
    canActivate: [AuthGuard, AdminGuard],
  },
  {
    path: '',
    loadChildren: () =>
      import('../../public/public.module').then((mod) => mod.PublicModule),
  },
  {
    path: '**',
    redirectTo: '404',
    pathMatch: 'full'
  },
  {
    path: '404',
    component: NotFoundComponent
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class CoreRoutingModule {}
