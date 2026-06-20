import { Editor, Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from '@tiptap/markdown';

const CarrotShortcuts = Extension.create({
  name: 'carrotShortcuts',
  priority: 1000,
  addKeyboardShortcuts() {
    return {
      'Mod-b': () => this.editor.commands.toggleBold(),
      'Mod-i': () => this.editor.commands.toggleItalic(),
      'Mod-u': () => this.editor.commands.toggleUnderline(),
      'Mod-s': () => {
        if (typeof window.__carrotSave === 'function') {
          window.__carrotSave();
          return true;
        }
        return false;
      },
      'Mod-Shift-l': () => {
        window.__carrotApplyLineFormat?.('bullet');
        return true;
      },
      'Mod-Shift-o': () => {
        window.__carrotApplyLineFormat?.('number');
        return true;
      },
      'Mod-Shift-c': () => {
        window.__carrotApplyLineFormat?.('checklist');
        return true;
      },
      'Mod-Shift-x': () => this.editor.commands.toggleStrike(),
    };
  },
});

export {
  Editor,
  Extension,
  StarterKit,
  Underline,
  TaskList,
  TaskItem,
  Placeholder,
  Markdown,
  CarrotShortcuts,
};
