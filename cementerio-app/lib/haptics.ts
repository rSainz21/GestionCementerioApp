import { Platform } from 'react-native';

let H: any = null;
async function getHaptics() {
  if (Platform.OS === 'web') return null;
  if (H) return H;
  try {
    // Import dinámico: no rompe si falta el paquete.
    H = await import('expo-haptics');
    return H;
  } catch {
    return null;
  }
}

export async function hapticSuccess() {
  const m = await getHaptics();
  if (!m) return;
  try {
    await m.notificationAsync(m.NotificationFeedbackType.Success);
  } catch {}
}

export async function hapticWarning() {
  const m = await getHaptics();
  if (!m) return;
  try {
    await m.notificationAsync(m.NotificationFeedbackType.Warning);
  } catch {}
}

export async function hapticError() {
  const m = await getHaptics();
  if (!m) return;
  try {
    await m.notificationAsync(m.NotificationFeedbackType.Error);
  } catch {}
}

export async function hapticLight() {
  const m = await getHaptics();
  if (!m) return;
  try {
    await m.impactAsync(m.ImpactFeedbackStyle.Light);
  } catch {}
}

