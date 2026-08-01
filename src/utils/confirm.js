import { Alert, Platform } from 'react-native';

/**
 * Muestra un diálogo de confirmación compatible con Web (window.confirm)
 * y Móvil (Alert.alert).
 */
export function confirmAction({ title, message, confirmText = 'Eliminar', onConfirm }) {
  if (Platform.OS === 'web') {
    const ok = window.confirm(`${title}\n\n${message}`);
    if (ok) {
      onConfirm();
    }
  } else {
    Alert.alert(
      title,
      message,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: confirmText, style: 'destructive', onPress: onConfirm },
      ],
      { cancelable: true }
    );
  }
}
