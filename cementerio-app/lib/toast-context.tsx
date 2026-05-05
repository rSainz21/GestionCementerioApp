import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ToastKind = 'success' | 'error' | 'warning' | 'info';

interface ToastMessage {
  id: number;
  kind: ToastKind;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  show: (kind: ToastKind, message: string, duration?: number) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const ICONS: Record<ToastKind, React.ComponentProps<typeof FontAwesome>['name']> = {
  success: 'check-circle',
  error: 'exclamation-circle',
  warning: 'exclamation-triangle',
  info: 'info-circle',
};

const COLORS: Record<ToastKind, { bg: string; border: string; icon: string; text: string }> = {
  success: { bg: '#F0FDF4', border: '#86EFAC', icon: '#16A34A', text: '#166534' },
  error: { bg: '#FEF2F2', border: '#FECACA', icon: '#DC2626', text: '#991B1B' },
  warning: { bg: '#FFFBEB', border: '#FDE68A', icon: '#D97706', text: '#92400E' },
  info: { bg: '#EFF6FF', border: '#BFDBFE', icon: '#2563EB', text: '#1E40AF' },
};

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const insets = useSafeAreaInsets();

  const show = useCallback((kind: ToastKind, message: string, duration = 3000) => {
    const id = ++nextId;
    setToasts((prev) => [...prev.slice(-2), { id, kind, message, duration }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const success = useCallback((msg: string) => show('success', msg), [show]);
  const error = useCallback((msg: string) => show('error', msg, 4000), [show]);
  const warning = useCallback((msg: string) => show('warning', msg, 3500), [show]);
  const info = useCallback((msg: string) => show('info', msg), [show]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ show, success, error, warning, info }}>
      {children}
      <View style={[s.container, { top: insets.top + 8 }]} pointerEvents="box-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: () => void }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;

  useState(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
  });

  const colors = COLORS[toast.kind];
  const icon = ICONS[toast.kind];

  return (
    <Animated.View
      style={[
        s.toast,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
          opacity: fadeAnim,
          transform: [{ translateY }],
        },
      ]}
    >
      <FontAwesome name={icon} size={16} color={colors.icon} />
      <Text style={[s.toastText, { color: colors.text }]} numberOfLines={3}>
        {toast.message}
      </Text>
      <TouchableOpacity onPress={onDismiss} hitSlop={8} activeOpacity={0.7}>
        <FontAwesome name="times" size={14} color={colors.icon} />
      </TouchableOpacity>
    </Animated.View>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}

const s = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 9999,
    gap: 8,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  toastText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
});
