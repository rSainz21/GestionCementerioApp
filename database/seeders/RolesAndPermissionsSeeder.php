<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolesAndPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $guard = 'web';

        $permisos = [
            'cementerio.ver',
            'cementerio.crear',
            'cementerio.editar',
            'cementerio.admin',
        ];

        foreach ($permisos as $permiso) {
            Permission::findOrCreate($permiso, $guard);
        }

        $admin = Role::findOrCreate('super_admin', $guard);
        $admin->syncPermissions($permisos);
    }
}

