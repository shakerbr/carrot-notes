import { EditorView, keymap, drawSelection, highlightActiveLine } from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';

export {
  EditorView,
  EditorState,
  Compartment,
  keymap,
  drawSelection,
  highlightActiveLine,
  markdown,
  markdownLanguage,
  defaultKeymap,
  history,
  historyKeymap,
  syntaxHighlighting,
  defaultHighlightStyle,
};
