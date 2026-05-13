<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class UsersAdminController extends Controller
{
    public function index(): JsonResponse
    {
        $users = User::with('roles', 'permissions')
            ->orderBy('name')
            ->get()
            ->map(fn(User $u) => $this->formatUser($u));

        $roles       = Role::orderBy('name')->pluck('name');
        $permissions = Permission::orderBy('name')->pluck('name');

        return response()->json(compact('users', 'roles', 'permissions'));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'     => 'required|string|max:255',
            'username' => 'nullable|string|max:255|unique:users,username',
            'email'    => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
            'roles'    => 'nullable|array',
            'roles.*'  => 'string|exists:roles,name',
        ]);

        $user = User::create([
            'name'     => $data['name'],
            'username' => $data['username'] ?? null,
            'email'    => $data['email'],
            'password' => Hash::make($data['password']),
        ]);

        if (!empty($data['roles'])) {
            $user->syncRoles($data['roles']);
        }

        return response()->json(['user' => $this->formatUser($user->fresh(['roles', 'permissions']))], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $user = User::findOrFail($id);

        $data = $request->validate([
            'name'     => 'required|string|max:255',
            'username' => ['nullable', 'string', 'max:255', Rule::unique('users', 'username')->ignore($id)],
            'email'    => ['required', 'email', Rule::unique('users', 'email')->ignore($id)],
            'password' => 'nullable|string|min:8',
        ]);

        $update = [
            'name'     => $data['name'],
            'username' => $data['username'] ?? null,
            'email'    => $data['email'],
        ];
        if (!empty($data['password'])) {
            $update['password'] = Hash::make($data['password']);
        }

        $user->update($update);

        return response()->json(['user' => $this->formatUser($user->fresh(['roles', 'permissions']))]);
    }

    public function destroy(int $id): JsonResponse
    {
        $authUser = request()->user();
        if ($authUser->id === $id) {
            return response()->json(['message' => 'No puedes eliminar tu propia cuenta.'], 422);
        }

        User::findOrFail($id)->delete();
        return response()->json(['ok' => true]);
    }

    public function updateRoles(Request $request, int $id): JsonResponse
    {
        $user = User::findOrFail($id);

        $data = $request->validate([
            'roles'   => 'required|array',
            'roles.*' => 'string|exists:roles,name',
        ]);

        $user->syncRoles($data['roles']);

        return response()->json(['user' => $this->formatUser($user->fresh(['roles', 'permissions']))]);
    }

    public function updatePermissions(Request $request, int $id): JsonResponse
    {
        $user = User::findOrFail($id);

        $data = $request->validate([
            'permissions'   => 'required|array',
            'permissions.*' => 'string|exists:permissions,name',
        ]);

        $user->syncPermissions($data['permissions']);

        return response()->json(['user' => $this->formatUser($user->fresh(['roles', 'permissions']))]);
    }

    private function formatUser(User $u): array
    {
        return [
            'id'          => $u->id,
            'name'        => $u->name,
            'username'    => $u->username,
            'email'       => $u->email,
            'roles'       => $u->roles->pluck('name'),
            'permissions' => $u->permissions->pluck('name'),
            'created_at'  => $u->created_at?->toDateString(),
        ];
    }
}
