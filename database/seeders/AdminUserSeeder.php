<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::firstOrCreate(
            ['username' => 'admin'],
            [
                'name' => 'Admin',
                'email' => 'admin@example.local',
                'password' => 'admin2026',
            ],
        );

        $user->assignRole('super_admin');
    }
}

