import { Platform } from 'react-native';

import NumerosEditorNative from './numeros-editor.native';
import NumerosEditorWeb from './numeros-editor.web';

export default Platform.OS === 'web' ? NumerosEditorWeb : NumerosEditorNative;

