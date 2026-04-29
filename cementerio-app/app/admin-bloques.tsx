import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useAuth } from '@/lib/auth-context';
import type { Bloque, Zona } from '@/lib/types';
import { CrearBloqueModal } from '@/components/CrearBloqueModal';
import { apiFetch } from '@/lib/laravel-api';

export default function AdminScreen() {
  const { user, signOut } = useAuth();
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [bloques, setBloques] = useState<Bloque[]>([]);
  const [loading, setLoading] = useState(true);
  const [crearModalOpen, setCrearModalOpen] = useState(false);
  const [editBloque, setEditBloque] = useState<Bloque | null>(null);

  const [zonaId, setZonaId] = useState('');
  const [nombre, setNombre] = useState('');
  const [codigo, setCodigo] = useState('');
  const [filas, setFilas] = useState('4');
  const [columnas, setColumnas] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    const cat = await apiFetch<any>('/api/cementerio/catalogo');
    if (!cat.ok) {
      Alert.alert('Error', String(cat.error ?? 'No se pudo cargar catálogo'));
      setZonas([]);
      setBloques([]);
      return;
    }
    setZonas(((cat.data as any)?.zonas ?? []) as Zona[]);
    setBloques(((cat.data as any)?.bloques ?? []) as Bloque[]);
  };

  useEffect(() => {
    fetchData().finally(() => setLoading(false));
  }, []);

  const zonaNameById = useMemo(() => new Map(zonas.map((z) => [z.id, z.nombre])), [zonas]);

  const openEdit = (b: Bloque) => {
    setEditBloque(b);
    setZonaId(String(b.zona_id ?? ''));
    setNombre(String((b as any).nombre ?? ''));
    setCodigo(String(b.codigo ?? ''));
    setFilas(String(b.filas ?? '4'));
    setColumnas(String(b.columnas ?? '1'));
  };

  const closeEdit = () => {
    setEditBloque(null);
  };

  const guardarEdicion = async () => {
    if (!editBloque) return;
    if (!zonaId || !codigo.trim() || !columnas.trim()) {
      Alert.alert('Error', 'Completa los campos obligatorios');
      return;
    }
    const numFilas = parseInt(filas, 10) || 4;
    const numColumnas = parseInt(columnas, 10) || 1;
    setSaving(true);
    const res = await apiFetch<any>(`/api/cementerio/admin/bloques/${editBloque.id}`, {
      method: 'PUT',
      body: {
        zona_id: parseInt(zonaId, 10),
        codigo: codigo.trim(),
        nombre: nombre.trim() || `Bloque ${codigo.trim()}`,
        filas: numFilas,
        columnas: numColumnas,
      },
    });
    setSaving(false);
    if (!res.ok) {
      Alert.alert('Error', String(res.error ?? 'No se pudo actualizar el bloque'));
      return;
    }
    Alert.alert('Bloque actualizado', `${codigo.trim()} (${numFilas}×${numColumnas})`);
    closeEdit();
    await fetchData();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#16A34A" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {user && (
        <View style={styles.userBar}>
          <FontAwesome name="user-circle" size={20} color="#15803D" />
          <Text style={styles.userEmail}>{user.email}</Text>
          <TouchableOpacity onPress={signOut}>
            <Text style={styles.logoutText}>Cerrar sesión</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Bloques registrados</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setCrearModalOpen(true)} activeOpacity={0.9}>
          <FontAwesome name="plus" size={14} color="#FFF" />
          <Text style={styles.addButtonText}>Nuevo bloque</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={bloques}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.bloqueRow}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.bloqueCodigo} numberOfLines={1}>{(item as any).nombre ?? item.codigo}</Text>
              <Text style={styles.bloqueDetail} numberOfLines={1}>
                {zonaNameById.get(item.zona_id) ?? (item as any).cemn_zonas?.nombre ?? `Zona ${item.zona_id}`} · {item.codigo} · {item.filas}F × {item.columnas}C
              </Text>
            </View>
            <Text style={styles.bloqueNichos}>{item.filas * item.columnas} nichos</Text>
            <TouchableOpacity style={styles.iconBtn} onPress={() => openEdit(item)} activeOpacity={0.85}>
              <FontAwesome name="edit" size={16} color="rgba(15,23,42,0.70)" />
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No hay bloques registrados aún</Text>
        }
      />

      <CrearBloqueModal
        open={crearModalOpen}
        onClose={() => setCrearModalOpen(false)}
        onSaved={async () => {
          setCrearModalOpen(false);
          await fetchData();
        }}
      />

      <Modal visible={!!editBloque} transparent animationType="slide" onRequestClose={closeEdit}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Editar bloque</Text>
              <TouchableOpacity style={styles.iconBtn} onPress={closeEdit} activeOpacity={0.85}>
                <FontAwesome name="times" size={18} color="rgba(15,23,42,0.70)" />
              </TouchableOpacity>
            </View>

            <Text style={styles.formLabel}>Zona</Text>
            <View style={styles.zonaSelector}>
              {zonas.map((z) => (
                <TouchableOpacity
                  key={z.id}
                  style={[
                    styles.zonaOption,
                    zonaId === String(z.id) && styles.zonaOptionActive,
                  ]}
                  onPress={() => setZonaId(String(z.id))}
                >
                  <Text
                    style={[
                      styles.zonaOptionText,
                      zonaId === String(z.id) && styles.zonaOptionTextActive,
                    ]}
                  >
                    {z.nombre}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.formLabel}>Nombre</Text>
            <TextInput style={styles.input} value={nombre} onChangeText={setNombre} placeholder="Bloque 1" />

            <Text style={styles.formLabel}>Código</Text>
            <TextInput style={styles.input} value={codigo} onChangeText={setCodigo} autoCapitalize="characters" />

            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={styles.formLabel}>Filas</Text>
                <TextInput style={styles.input} value={filas} onChangeText={setFilas} keyboardType="numeric" />
              </View>
              <View style={styles.halfField}>
                <Text style={styles.formLabel}>Columnas</Text>
                <TextInput style={styles.input} value={columnas} onChangeText={setColumnas} keyboardType="numeric" />
              </View>
            </View>

            <TouchableOpacity style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={guardarEdicion} disabled={saving} activeOpacity={0.9}>
              {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveButtonText}>Guardar cambios</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#DCFCE7',
    borderBottomWidth: 1,
    borderBottomColor: '#BBF7D0',
  },
  userEmail: {
    flex: 1,
    fontSize: 13,
    color: '#15803D',
    fontWeight: '500',
  },
  logoutText: {
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#16A34A',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1F2937',
  },
  zonaSelector: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  zonaOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  zonaOptionActive: {
    backgroundColor: '#15803D',
    borderColor: '#15803D',
  },
  zonaOptionText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  zonaOptionTextActive: {
    color: '#FFFFFF',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  saveButton: {
    backgroundColor: '#22C55E',
    borderRadius: 10,
    paddingVertical: 14,
    marginTop: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  bloqueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    marginVertical: 3,
  },
  bloqueCodigo: {
    fontSize: 16,
    fontWeight: '700',
    color: '#15803D',
  },
  bloqueDetail: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  bloqueNichos: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 16, maxHeight: '92%' },
  modalHandle: { width: 44, height: 5, borderRadius: 999, backgroundColor: 'rgba(15,23,42,0.18)', alignSelf: 'center', marginBottom: 10 },
  modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  emptyText: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 40,
  },
});
