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

  function caretPosForBlock(block) {
    const { pos, node } = block;
    if (node.type.name === 'listItem' || node.type.name === 'taskItem') {
      return Math.min(pos + 2, pos + node.nodeSize - 2);
    }
    return Math.min(pos + 1, pos + node.nodeSize - 1);
  }

  function convertBlock(editor, block, target) {
    const kind = getItemKind(block);
    const chain = editor.chain().focus().setTextSelection(caretPosForBlock(block));

    if (kind === 'bullet') chain.toggleBulletList();
    else if (kind === 'number') chain.toggleOrderedList();
    else if (kind === 'checklist') chain.toggleTaskList();

    if (target === 'bullet') chain.toggleBulletList();
    else if (target === 'number') chain.toggleOrderedList();
    else if (target === 'checklist') chain.toggleTaskList();

    chain.run();
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

    for (let i = 0; i < initialBlocks.length; i++) {
      if (!empty) {
        editor.commands.setTextSelection({ from: selFrom, to: selTo });
      }

      const blocks = collectSelectedBlocks(editor.state);
      if (!blocks.length) break;

      convertBlock(editor, blocks[blocks.length - 1], target);
    }

    if (!empty) {
      editor.commands.setTextSelection({ from: selFrom, to: selTo });
    }

    return true;
  }

  global.CarrotLineFormat = { apply };
})(typeof window !== 'undefined' ? window : globalThis);
