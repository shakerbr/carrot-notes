/**
 * Apply bullet / numbered / checklist formatting to selected block(s) only.
 */
(function (global) {
  function getItemKind(item) {
    const { node, parentNode } = item;
    if (node.type.name === 'taskItem') return 'checklist';
    if (node.type.name === 'listItem') {
      const parentType = parentNode?.type.name;
      if (parentType === 'orderedList') return 'number';
      if (parentType === 'bulletList') return 'bullet';
    }
    if (node.type.name === 'paragraph') return 'paragraph';
    return 'paragraph';
  }

  function collectSelectedBlocks(state) {
    const { from, to, empty } = state.selection;
    const items = [];
    const seen = new Set();

    const add = (node, pos, parentNode) => {
      if (seen.has(pos)) return;
      seen.add(pos);
      items.push({ node, pos, parentNode });
    };

    const scan = (start, end) => {
      state.doc.nodesBetween(start, end, (node, pos, parent) => {
        if (node.type.name === 'taskItem') {
          add(node, pos, parent);
          return false;
        }
        if (node.type.name === 'listItem') {
          add(node, pos, parent);
          return false;
        }
        if (node.type.name === 'paragraph' && parent?.type.name === 'doc') {
          add(node, pos, null);
          return false;
        }
      });
    };

    if (empty) {
      const $from = state.selection.$from;
      for (let depth = $from.depth; depth > 0; depth--) {
        const node = $from.node(depth);
        if (node.type.name === 'taskItem' || node.type.name === 'listItem') {
          add(node, $from.before(depth), $from.node(depth - 1));
          break;
        }
        if (node.type.name === 'paragraph' && $from.node(depth - 1).type.name === 'doc') {
          add(node, $from.before(depth), null);
          break;
        }
      }
    } else {
      scan(from, to);
    }

    return items.sort((a, b) => a.pos - b.pos);
  }

  function resolveBlockAtPos(state, pos) {
    const clamped = Math.max(1, Math.min(pos + 1, state.doc.content.size - 1));
    const $pos = state.doc.resolve(clamped);

    for (let depth = $pos.depth; depth > 0; depth--) {
      const node = $pos.node(depth);
      if (node.type.name === 'taskItem' || node.type.name === 'listItem') {
        return { node, pos: $pos.before(depth), parentNode: $pos.node(depth - 1) };
      }
      if (node.type.name === 'paragraph' && $pos.node(depth - 1).type.name === 'doc') {
        return { node, pos: $pos.before(depth), parentNode: null };
      }
    }

    const top = state.doc.nodeAt(pos);
    if (top) {
      return { node: top, pos, parentNode: null };
    }
    return null;
  }

  function caretPosForBlock(block) {
    const { pos, node } = block;
    if (node.type.name === 'listItem' || node.type.name === 'taskItem') {
      const paraPos = pos + 1;
      return Math.min(paraPos + 1, pos + node.nodeSize - 2);
    }
    return Math.min(pos + 1, pos + node.nodeSize - 1);
  }

  function turnOffListFormat(editor, kind, caret) {
    if (kind === 'paragraph') return true;

    if (kind === 'checklist') {
      if (editor.chain().focus().setTextSelection(caret).liftListItem('taskItem').run()) {
        return true;
      }
      return editor.chain().focus().setTextSelection(caret).toggleTaskList().run();
    }

    if (editor.chain().focus().setTextSelection(caret).liftListItem('listItem').run()) {
      return true;
    }

    if (kind === 'number') {
      return editor.chain().focus().setTextSelection(caret).toggleOrderedList().run();
    }
    return editor.chain().focus().setTextSelection(caret).toggleBulletList().run();
  }

  function turnOnListFormat(editor, target, caret) {
    if (target === 'paragraph') return true;

    const chain = editor.chain().focus().setTextSelection(caret);

    if (target === 'bullet') return chain.toggleBulletList().run();
    if (target === 'number') return chain.toggleOrderedList().run();
    if (target === 'checklist') return chain.toggleTaskList().run();
    return false;
  }

  function applyListCommandToSelection(editor, target, selFrom, selTo) {
    const chain = editor.chain().focus().setTextSelection({ from: selFrom, to: selTo });
    if (target === 'bullet') return chain.toggleBulletList().run();
    if (target === 'number') return chain.toggleOrderedList().run();
    if (target === 'checklist') return chain.toggleTaskList().run();
    return false;
  }

  function convertBlock(editor, block, target) {
    const kind = getItemKind(block);
    const caret = caretPosForBlock(block);

    if (target === 'paragraph') {
      return turnOffListFormat(editor, kind, caret);
    }

    if (kind === target) {
      return turnOffListFormat(editor, kind, caret);
    }

    if (kind !== 'paragraph') {
      turnOffListFormat(editor, kind, caret);
    }

    return turnOnListFormat(editor, target, caret);
  }

  function apply(editor, format) {
    if (!editor || editor.isDestroyed) return false;

    const { from, to, empty } = editor.state.selection;
    const selFrom = Math.min(from, to);
    const selTo = Math.max(from, to);

    const initialBlocks = collectSelectedBlocks(editor.state);
    if (!initialBlocks.length) return false;

    const kinds = initialBlocks.map(getItemKind);
    const target =
      kinds.every((k) => k === format) && format !== 'paragraph' ? 'paragraph' : format;

    if (target === 'paragraph') {
      for (const snapshot of [...initialBlocks].sort((a, b) => b.pos - a.pos)) {
        const block = resolveBlockAtPos(editor.state, snapshot.pos);
        if (!block || getItemKind(block) === 'paragraph') continue;
        convertBlock(editor, block, target);
      }
    } else if (kinds.every((k) => k === 'paragraph')) {
      applyListCommandToSelection(editor, target, selFrom, selTo);
    } else {
      for (const snapshot of [...initialBlocks].sort((a, b) => b.pos - a.pos)) {
        const block = resolveBlockAtPos(editor.state, snapshot.pos);
        if (!block) continue;
        if (getItemKind(block) === target) continue;
        convertBlock(editor, block, target);
      }
    }

    if (!empty) {
      editor.commands.setTextSelection({ from: selFrom, to: selTo });
    }

    return true;
  }

  global.CarrotLineFormat = { apply };
})(typeof window !== 'undefined' ? window : globalThis);
