import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import type { Bloque, Sepultura, Zona } from '@/lib/types';
import { NichoGrid } from '@/components/NichoGrid';

export default function AdminScreen() {
  const { user, signOut } = useAuth();
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [bloques, setBloques] = useState<Bloque[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [zonaId, setZonaId] = useState('');
  const [codigo, setCodigo] = useState('');
  const [filas, setFilas] = useState('4');
  const [columnas, setColumnas] = useState('');
  const [saving, setSaving] = useState(false);

  const numFilasPreview = Math.max(1, Math.min(12, parseInt(filas, 10) || 4));
  const numColumnasPreview = Math.max(1, Math.min(60, parseInt(columnas, 10) || 1));
  const previewCount = numFilasPreview * numColumnasPreview;

  const previewSepulturas: Sepultura[] = Array.from({ length: previewCount }, (_, idx) => {
    const col = Math.floor(idx / numFilasPreview) + 1;
    const fil = (idx % numFilasPreview) + 1;
    return {
      id: -(idx + 1),
      zona_id: parseInt(zonaId || '0', 10) || 0,
      bloque_id: null,
      tipo: 'nicho',
      numero: idx + 1,
      fila: fil,
      columna: col,
      codigo: null,
      estado: 'libre',
      ubicacion_texto: null,
      notas: null,
    };
  });

  const fetchData = async () => {
    const [zonasRes, bloquesRes] = await Promise.all([
      supabase.from('cemn_zonas').select('*').order('id'),
      supabase.from('cemn_bloques').select('*').order('id'),
    ]);
    if (zonasRes.error) Alert.alert('Error', zonasRes.error.message);
    if (bloquesRes.error) Alert.alert('Error', bloquesRes.error.message);
    setZonas(zonasRes.data ?? []);
    setBloques(bloquesRes.data ?? []);
  };

  useEffect(() => {
    fetchData().finally(() => setLoading(false));
  }, []);

  const crearBloque = async () => {
    if (!zonaId || !codigo.trim() || !columnas.trim()) {
      Alert.alert('Error', 'Completa todos los campos obligatorios');
      return;
    }

    setSaving(true);

    const numFilas = parseInt(filas, 10) || 4;
    const numColumnas = parseInt(columnas, 10);

    const { data: nuevoBloque, error: bloqueError } = await supabase
      .from('cemn_bloques')
      .insert({
        zona_id: parseInt(zonaId, 10),
        codigo: codigo.trim(),
        filas: numFilas,
        columnas: numColumnas,
      })
      .select()
      .single();

    if (bloqueError || !nuevoBloque) {
      Alert.alert('Error', bloqueError?.message ?? 'No se pudo crear el bloque');
      setSaving(false);
      return;
    }

    const sepulturas = [];
    let numero = 1;

    const { data: maxNumero } = await supabase
      .from('cemn_sepulturas')
      .select('numero')
      .order('numero', { ascending: false })
      .limit(1)
      .single();

    if (maxNumero?.numero) numero = maxNumero.numero + 1;

    for (let col = 1; col <= numColumnas; col++) {
      for (let fil = 1; fil <= numFilas; fil++) {
        sepulturas.push({
          zona_id: parseInt(zonaId, 10),
          bloque_id: nuevoBloque.id,
          tipo: 'nicho' as const,
          numero,
          fila: fil,
          columna: col,
          codigo: `${zonas.find((z) => z.id === parseInt(zonaId, 10))?.codigo ?? ''}-${codigo.trim()}-N${numero}`,
          estado: 'libre' as const,
        });
        numero++;
      }
    }

    const { error: sepError } = await supabase.from('cemn_sepulturas').insert(sepulturas);

    if (sepError) {
      Alert.alert('Error', sepError.message);
    } else {
      Alert.alert(
        'Bloque creado',
        `${codigo.trim()} con ${sepulturas.length} nichos (${numFilas}×${numColumnas})`
      );
      setCodigo('');
      setColumnas('');
      setShowForm(false);
      await fetchData();
    }

    setSaving(false);
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
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowForm(!showForm)}
        >
          <FontAwesome name={showForm ? 'minus' : 'plus'} size={14} color="#FFF" />
          <Text style={styles.addButtonText}>{showForm ? 'Cancelar' : 'Nuevo bloque'}</Text>
        </TouchableOpacity>
      </View>

      {showForm && (
        <View style={styles.form}>
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

          <Text style={styles.formLabel}>Código del bloque</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: B9, B10..."
            value={codigo}
            onChangeText={setCodigo}
            autoCapitalize="characters"
          />

          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={styles.formLabel}>Filas (alturas)</Text>
              <TextInput
                style={styles.input}
                placeholder="4"
                value={filas}
                onChangeText={setFilas}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.formLabel}>Columnas</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: 32"
                value={columnas}
                onChangeText={setColumnas}
                keyboardType="numeric"
              />
            </View>
          </View>

          {columnas && filas && (
            <Text style={styles.preview}>
              Se crearán {parseInt(filas, 10) * parseInt(columnas, 10) || 0} nichos
            </Text>
          )}

          {!!columnas.trim() && (
            <View style={styles.previewBox}>
              <Text style={styles.previewTitle}>Previsualización ({numFilasPreview}×{numColumnasPreview})</Text>
              <Text style={styles.previewHint}>Esto es un dibujo aproximado. La numeración final se asigna al crear.</Text>
              <View style={{ height: 280 }}>
                <NichoGrid sepulturas={previewSepulturas} filas={numFilasPreview} columnas={numColumnasPreview} />
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={crearBloque}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.saveButtonText}>Crear bloque y generar nichos</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={bloques}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.bloqueRow}>
            <View>
              <Text style={styles.bloqueCodigo}>{item.codigo}</Text>
              <Text style={styles.bloqueDetail}>
                {(item as any).cemn_zonas?.nombre ?? 'Zona ?'} · {item.filas}F × {item.columnas}C
              </Text>
            </View>
            <Text style={styles.bloqueNichos}>
              {item.filas * item.columnas} nichos
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No hay bloques registrados aún</Text>
        }
      />
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
  form: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
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
  preview: {
    marginTop: 12,
    fontSize: 14,
    color: '#15803D',
    fontWeight: '600',
    textAlign: 'center',
  },
  previewBox: {
    marginTop: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F8FAFC',
    padding: 12,
  },
  previewTitle: { fontSize: 13, fontWeight: '800', color: '#1F2937' },
  previewHint: { marginTop: 6, fontSize: 12, color: '#6B7280', fontWeight: '600' },
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
  emptyText: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 40,
  },
});
