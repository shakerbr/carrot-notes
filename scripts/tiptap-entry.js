import { Editor, Extension, wrappingInputRule } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from '@tiptap/markdown';
import { BulletList } from '@tiptap/extension-bullet-list';
import { OrderedList } from '@tiptap/extension-ordered-list';

const BulletListNoInput = BulletList.extend({
  addInputRules() {
    return [];
  },
});

const OrderedListNoInput = OrderedList.extend({
  addInputRules() {
    return [];
  },
});

const CarrotInputRules = Extension.create({
  name: 'carrotInputRules',
  priority: 1010,
  addInputRules() {
    const { taskItem, bulletList, orderedList } = this.editor.schema.nodes;

    return [
      wrappingInputRule({
        find: /^\s*-\s*\[\s*([xX ])?\s*\]\s$/,
        type: taskItem,
        getAttributes: (match) => ({
          checked: (match[1] || '').trim().toLowerCase() === 'x',
        }),
      }),
      wrappingInputRule({
        find: /^\s*([-+*])\s$/,
        type: bulletList,
      }),
      wrappingInputRule({
        find: /^(\d+)\.\s$/,
        type: orderedList,
      }),
    ];
  },
});

const CarrotShortcuts = Extension.create({
  name: 'carrotShortcuts',
  priority: 1000,
  addKeyboardShortcuts() {
    const afterFormat = () => {
      window.__carrotUpdateFormatStates?.();
      return true;
    };

    return {
      'Mod-b': () => {
        this.editor.commands.toggleBold();
        return afterFormat();
      },
      'Mod-i': () => {
        this.editor.commands.toggleItalic();
        return afterFormat();
      },
      'Mod-u': () => {
        this.editor.commands.toggleUnderline();
        return afterFormat();
      },
      'Mod-Shift-x': () => {
        this.editor.commands.toggleStrike();
        return afterFormat();
      },
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
  CarrotInputRules,
  BulletListNoInput,
  OrderedListNoInput,
};
