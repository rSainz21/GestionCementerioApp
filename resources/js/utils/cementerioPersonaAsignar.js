import api from '@/services/api';

export const CONFIRMACION_DOC_EXHUMACION_MSJ =
  '¿Tienes completa la documentación de la exhumación?\n\n' +
  'Si eliges Aceptar, el inhumado actual pasará a restos y el nuevo quedará como titular del nicho. ' +
  'Si eliges Cancelar, no se realizará ningún cambio.';

/**
 * Asigna una persona (difunto) a una sepultura. Si el nicho tiene otro inhumado activo,
 * el backend exige confirmación; en ese caso se pregunta al usuario y se reintenta con el flag.
 * @returns {Promise<import('axios').AxiosResponse|null>} respuesta axios, o `null` si el usuario canceló el diálogo
 */
export async function putPersonaAsignarSepulturaConConfirmacionDoc(personaId, sepulturaId) {
  const url = `/api/cementerio/personas/${personaId}/asignar-sepultura`;
  const body = { sepultura_id: sepulturaId };
  try {
    return await api.put(url, body);
  } catch (e) {
    const errs = e?.response?.data?.errors;
    if (e?.response?.status === 422 && errs?.confirmacion_documentacion_exhumacion) {
      if (!window.confirm(CONFIRMACION_DOC_EXHUMACION_MSJ)) return null;
      return await api.put(url, {
        ...body,
        confirmacion_documentacion_exhumacion: true,
      });
    }
    throw e;
  }
}
