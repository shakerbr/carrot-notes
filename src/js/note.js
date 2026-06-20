    const invoke = window.__TAURI__ ? window.__TAURI__.core.invoke : null;
    const { getCurrentWindow } = window.__TAURI__ ? window.__TAURI__.window : { getCurrentWindow: null };
    const listen = window.__TAURI__ ? window.__TAURI__.event.listen : null;

    let appWindow = null;
    if (getCurrentWindow) {
      appWindow = getCurrentWindow();
    }

    const urlParams = new URLSearchParams(window.location.search);
    let noteId = urlParams.get('id');
    if (!noteId && appWindow?.label?.startsWith('note_')) {
      noteId = appWindow.label.slice('note_'.length);
    }

    let noteCardEl = document.getElementById('note-card');
    let editorHostEl = document.getElementById('editor-host');
    let noteEditor = null;
    let typingTimer = null;
    let alwaysTopBtn = document.getElementById('always-top-btn');
    let moreBtn = document.getElementById('more-btn');
    let closeBtn = document.getElementById('close-btn');
    let saveBtn = document.getElementById('save-btn');
    let lockBtn = document.getElementById('lock-btn');
    let noteTitleInput = document.getElementById('note-title-input');
    let editTitleBtn = document.getElementById('edit-title-btn');

    let notes = [];
    let noteData = null;
    let isAlwaysOnTop = false;
    let isLocked = false;

    // Global settings loaded from Rust
    let settings = {
      defaultSize: { width: 280, height: 300 },
      defaultFont: { family: "Caveat", size: "20px" },
      defaultColor: "theme-orange",
      autosave: true,
      autosaveInterval: 5,
      readOnlyMode: false,
      defaultReadOnly: false,
      customFonts: [],
      customFontSizes: [],
      colors: [
        { id: "theme-orange", name: "Carrot Orange", bg: "#FFF2E6", text: "#5C2D00", dot: "#FF9E42", isBuiltIn: true, enabled: true },
        { id: "theme-yellow", name: "Soft Yellow", bg: "#FFFDE6", text: "#4A4000", dot: "#E6D33C", isBuiltIn: true, enabled: true },
        { id: "theme-green", name: "Mint Green", bg: "#EAFDF5", text: "#034A2E", dot: "#3CD69E", isBuiltIn: true, enabled: true },
        { id: "theme-blue", name: "Ice Blue", bg: "#EAF9FF", text: "#003F5C", dot: "#3CB8E6", isBuiltIn: true, enabled: true },
        { id: "theme-lavender", name: "Lavender Purple", bg: "#F9EFFF", text: "#38006E", dot: "#B069F5", isBuiltIn: true, enabled: true },
        { id: "theme-dark", name: "Clean Dark Gray", bg: "#2D2D35", text: "#E2E2EA", dot: "#5C5C6B", isBuiltIn: true, enabled: true }
      ]
    };

    function getEditorContent() {
      if (noteEditor) {
        try {
          return noteEditor.getMarkdown() || '';
        } catch (e) {
          return noteData?.content || '';
        }
      }
      return noteData?.content || '';
    }

    function fontFamilyCSSValue(font) {
      if (font === 'Caveat') return "var(--font-hand)";
      if (font === 'Inter') return "var(--font-ui)";
      if (font === 'Roboto') return "'Roboto', sans-serif";
      if (font === 'Courier Prime') return "'Courier Prime', monospace";
      return `'${font}', sans-serif`;
    }

    function applyEditorTypography() {
      if (!editorHostEl || !noteData) return;
      editorHostEl.style.fontFamily = fontFamilyCSSValue(noteData.fontFamily || settings.defaultFont.family);
      editorHostEl.style.fontSize = noteData.fontSize || settings.defaultFont.size;
    }

    function initWysiwygEditor(initialContent) {
      if (!window.CarrotEditor || !editorHostEl) return;

      window.__carrotSave = () => {
        if (!isReadOnly()) saveNoteManual();
      };
      window.__carrotApplyLineFormat = (format) => {
        if (isReadOnly() || !noteEditor || !window.CarrotLineFormat) return;
        CarrotLineFormat.apply(noteEditor, format);
        syncEditorContent();
        updateFormatStates();
      };
      window.__carrotUpdateFormatStates = () => updateFormatStates();

      const {
        Editor, StarterKit, Underline, TaskList, TaskItem, Placeholder, Markdown,
        CarrotShortcuts, CarrotInputRules, BulletListNoInput, OrderedListNoInput,
      } = CarrotEditor;

      noteEditor = new Editor({
        element: editorHostEl,
        content: initialContent || '',
        contentType: 'markdown',
        editable: true,
        extensions: [
          StarterKit.configure({
            heading: { levels: [1, 2, 3] },
            bulletList: false,
            orderedList: false,
          }),
          BulletListNoInput,
          OrderedListNoInput,
          Underline,
          TaskList.configure({
            HTMLAttributes: { class: 'carrot-task-list', 'data-type': 'taskList' },
          }),
          TaskItem.configure({
            nested: true,
            HTMLAttributes: { class: 'carrot-task-item', 'data-type': 'taskItem' },
          }),
          Placeholder.configure({
            placeholder: 'Type thoughts here...',
          }),
          Markdown,
          CarrotInputRules,
          CarrotShortcuts,
        ],
        editorProps: {
          attributes: {
            class: 'tiptap',
          },
        },
        onUpdate: () => {
          onEditorDocChanged();
        },
        onSelectionUpdate: () => {
          updateFormatStates();
        },
        onFocus: () => {
          updateFormatStates();
        },
        onBlur: () => {
          updateFormatStates();
        },
        onTransaction: () => {
          updateFormatStates();
        },
      });

      applyEditorTypography();
    }

    function setEditorEditable(editable) {
      if (!noteEditor) return;
      noteEditor.setEditable(editable);
    }

    function onEditorDocChanged() {
      if (isReadOnly() || !noteData) return;
      noteData.content = getEditorContent();
      if (settings.autosave) {
        scheduleAutosave();
      } else {
        markUnsavedChanges();
      }
    }

    function scheduleAutosave() {
      markUnsavedChanges();
      clearTimeout(typingTimer);
      typingTimer = setTimeout(() => {
        if (noteData) {
          noteData.content = getEditorContent();
        }
        persistNotes();
        clearUnsavedChanges();
      }, (settings.autosaveInterval || 5) * 1000);
    }

    function syncEditorContent() {
      if (!noteData) return;
      noteData.content = getEditorContent();
      if (settings.autosave) {
        clearTimeout(typingTimer);
        persistNotes();
        clearUnsavedChanges();
      } else {
        markUnsavedChanges();
      }
    }

    function setupWindowResizeHandles() {
      if (!appWindow) return;
      document.querySelectorAll('.window-resize-handle').forEach(handle => {
        handle.addEventListener('mousedown', (e) => {
          if (e.buttons !== 1) return;
          e.preventDefault();
          e.stopPropagation();
          const direction = handle.getAttribute('data-direction');
          appWindow.startResizeDragging(direction).catch(console.error);
        });
      });
    }

    // Initialize Note State
    document.addEventListener('DOMContentLoaded', async () => {
      // 1. Setup programmatic dragging listener to bypass Wayland drag limits
      if (appWindow) {
        const dragHeader = document.getElementById('drag-header');
        dragHeader.addEventListener('mousedown', (e) => {
          if (!e.target.closest('.no-drag')) {
            isWindowDragging = true;
            const sel = window.getSelection();
            if (sel) sel.removeAllRanges();
            appWindow.startDragging();
          }
        });
        document.addEventListener('mouseup', () => {
          isWindowDragging = false;
        });
        setupWindowResizeHandles();
      }

      // Load Settings from backend if available
      await loadSettings();

      // Load all notes from storage
      const savedNotesJson = localStorage.getItem('carrotnotes_notes') || '[]';
      try {
        notes = JSON.parse(savedNotesJson);
      } catch (e) {
        console.error(e);
      }

      noteData = notes.find(n => n.id === noteId);
      if (!noteData) {
        // Find smart Note {n} title
        let n = 1;
        while (notes.some(note => note.title.trim().toLowerCase() === `note ${n}`)) {
          n++;
        }
        noteData = {
          id: noteId,
          title: `Note ${n}`,
          content: '',
          theme: settings.defaultColor || 'theme-orange',
          rotation: 0,
          pinned: false,
          alwaysOnTop: false,
          isOpen: true,
          isTemporary: true
        };
        notes.push(noteData);
      }

      // Fill in defaults if not present
      if (noteData.isTemporary === undefined) noteData.isTemporary = false;
      if (!noteData.title) {
        let n = 1;
        while (notes.some(note => note.title.trim().toLowerCase() === `note ${n}`)) {
          n++;
        }
        noteData.title = `Note ${n}`;
      }
      if (!noteData.fontFamily) noteData.fontFamily = settings.defaultFont.family;
      if (!noteData.fontSize) noteData.fontSize = settings.defaultFont.size;

      // Populate Title Display and Input
      const noteTitleDisplay = document.getElementById('note-title-display');
      const editTitleBtn = document.getElementById('edit-title-btn');
      const cancelTitleBtn = document.getElementById('cancel-title-btn');
      let isCancellingTitleEdit = false;

      noteTitleDisplay.innerText = noteData.title;
      noteTitleInput.value = noteData.title;
      updateTemporaryIndicator();

      // Pencil-gated title renaming logic
      editTitleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isReadOnly()) return;
        noteTitleDisplay.style.display = 'none';
        editTitleBtn.style.display = 'none';
        
        noteTitleInput.style.display = 'inline-block';
        if (cancelTitleBtn) cancelTitleBtn.style.display = 'inline-flex';
        
        noteTitleInput.focus();
        noteTitleInput.select();
      });

      const cancelTitleEdit = () => {
        isCancellingTitleEdit = true;
        noteTitleInput.value = noteData.title;
        noteTitleInput.blur(); // Triggers blur event handler synchronously
        
        noteTitleInput.style.display = 'none';
        if (cancelTitleBtn) cancelTitleBtn.style.display = 'none';
        
        noteTitleDisplay.style.display = 'inline-block';
        editTitleBtn.style.display = 'inline-flex';
        updateTemporaryIndicator();
        
        isCancellingTitleEdit = false;
      };

      if (cancelTitleBtn) {
        cancelTitleBtn.addEventListener('mousedown', (e) => {
          isCancellingTitleEdit = true;
        });
        cancelTitleBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          cancelTitleEdit();
        });
      }

      const saveTitleEdit = () => {
        if (isCancellingTitleEdit) return;
        const newTitle = noteTitleInput.value.trim() || "Untitled Note";
        noteData.title = newTitle;
        noteData.isTemporary = false;
        noteData.content = getEditorContent();
        noteTitleDisplay.innerText = newTitle;
        noteTitleInput.value = newTitle;
        
        noteTitleInput.style.display = 'none';
        if (cancelTitleBtn) cancelTitleBtn.style.display = 'none';
        
        noteTitleDisplay.style.display = 'inline-block';
        editTitleBtn.style.display = 'inline-flex';
        updateTemporaryIndicator();
        
        clearTimeout(typingTimer);
        persistNotes();
        clearUnsavedChanges();
      };

      noteTitleInput.addEventListener('blur', () => {
        if (isCancellingTitleEdit) return;
        saveTitleEdit();
      });

      noteTitleInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          saveTitleEdit();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          cancelTitleEdit();
        }
      });

      // Render WYSIWYG editor (markdown stored, not shown)
      initWysiwygEditor(noteData.content || '');
      
      // Apply theme color
      applyColor(noteData.theme || 'theme-orange');

      // Apply font settings
      buildFontDropdownMenu();
      applyFontFamily(noteData.fontFamily);
      applyFontSize(noteData.fontSize);

      // Apply read-only state
      isLocked = settings.defaultReadOnly ? true : (noteData.readOnly || false);
      updateReadOnlyUI();

      isAlwaysOnTop = noteData.alwaysOnTop || false;
      updateAlwaysOnTopUI();

      // Populate custom color list in dropdown
      buildColorDropdownMenu();

      // Setup dropdown menus click listeners
      setupDropdowns();

      // Listen for notes-changed global event to sync always-on-top/title updates
      if (listen) {
        listen('notes-changed', () => {
          const savedNotes = JSON.parse(localStorage.getItem('carrotnotes_notes') || '[]');
          const updatedNote = savedNotes.find(n => n.id === noteId);
          if (updatedNote) {
            // Update title if changed and not currently editing
            if (noteTitleInput.style.display === 'none' && updatedNote.title !== noteData.title) {
              noteData.title = updatedNote.title;
              noteTitleDisplay.innerText = updatedNote.title;
              noteTitleInput.value = updatedNote.title;
            }
            // Update pin/always-on-top if changed
            if (updatedNote.pinned !== noteData.pinned) {
              noteData.pinned = updatedNote.pinned;
            }
            if (updatedNote.alwaysOnTop !== noteData.alwaysOnTop) {
              noteData.alwaysOnTop = updatedNote.alwaysOnTop;
              isAlwaysOnTop = updatedNote.alwaysOnTop || false;
              updateAlwaysOnTopUI();
              if (appWindow && invoke) {
                invoke('set_always_on_top', { alwaysOnTop: isAlwaysOnTop, noteId }).catch(console.error);
              }
            }
            // Update readOnly if changed
            if (updatedNote.readOnly !== noteData.readOnly) {
              noteData.readOnly = updatedNote.readOnly;
              isLocked = updatedNote.readOnly;
              updateReadOnlyUI();
            }
            // Update temporary status if changed
            if (updatedNote.isTemporary !== noteData.isTemporary) {
              noteData.isTemporary = updatedNote.isTemporary;
              updateTemporaryIndicator();
            }
          }
        });

        listen('settings-changed', () => {
          loadSettings();
        });
      }

      // Setup responsive resize collapsing
      const handleResize = () => {
        const width = window.innerWidth;
        const headerControls = document.querySelector('.header-controls');
        const subToolbar = document.getElementById('sub-toolbar');
        const actionsList = document.getElementById('actions-list');
        const moreBtnEl = document.getElementById('more-btn');

        noteCardEl.classList.toggle('very-narrow-layout', width < 220);
        noteCardEl.classList.toggle('tiny-layout', width < 160);

        if (width < 300) {
          noteCardEl.classList.add('narrow-layout');
          if (actionsList && actionsList.parentElement !== subToolbar) {
            subToolbar.appendChild(actionsList);
          }
        } else {
          noteCardEl.classList.remove('narrow-layout');
          subToolbar.classList.remove('show');
          if (actionsList && actionsList.parentElement !== headerControls) {
            headerControls.insertBefore(actionsList, moreBtnEl);
          }
        }
      };
      
      window.addEventListener('resize', handleResize);
      // Run once layout sizing is complete
      setTimeout(handleResize, 100);

      // Toggle sub-toolbar from more button
      const moreBtn = document.getElementById('more-btn');
      const subToolbar = document.getElementById('sub-toolbar');
      moreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        subToolbar.classList.toggle('show');
      });

      // Listen to resize/move to save sizes dynamically
      if (appWindow) {
        let saveTimer;
        const savePositionSize = async () => {
          clearTimeout(saveTimer);
          saveTimer = setTimeout(async () => {
            const pos = await appWindow.outerPosition();
            const size = await appWindow.innerSize();
            noteData.x = pos.x;
            noteData.y = pos.y;
            noteData.width = size.width;
            noteData.height = size.height;
            persistNotes();
          }, 300);
        };
        appWindow.onResized(savePositionSize);
        appWindow.onMoved(savePositionSize);
      }

      // Auto-save handled by CodeMirror updateListener (onEditorDocChanged)
      
      // Hook active formatting state listeners
      if (noteEditor) {
        noteEditor.view.dom.addEventListener('focus', updateFormatStates);
        noteEditor.view.dom.addEventListener('blur', updateFormatStates);
      }
      
      // Initialize format states
      updateFormatStates();
    });

    function updateTemporaryIndicator() {
      if (!editTitleBtn || !noteData) return;
      const isTemp = !!noteData.isTemporary;
      editTitleBtn.classList.toggle('temp-note-indicator', isTemp);
      editTitleBtn.title = isTemp ? 'Temporary note — excluded from sync' : 'Rename Note';
    }

    function isReadOnly() {
      return settings.readOnlyMode || isLocked;
    }

    // Dynamic color picker building
    function buildColorDropdownMenu() {
      const menu = document.getElementById('color-dropdown-menu');
      menu.innerHTML = '';
      
      // List only enabled colors
      const activeColors = settings.colors.filter(c => c.enabled);
      if (activeColors.length === 0) {
        // Fallback to built-in orange if everything disabled
        activeColors.push({ id: "theme-orange", name: "Carrot Orange", bg: "#FFF2E6", text: "#5C2D00", dot: "#FF9E42", isBuiltIn: true });
      }

      activeColors.forEach(color => {
        const item = document.createElement('div');
        item.className = 'color-option-row';
        
        const dot = document.createElement('span');
        dot.className = 'color-option-dot';
        if (color.isBuiltIn) {
          dot.style.backgroundColor = color.dot;
        } else {
          dot.style.backgroundColor = color.bg;
        }
        
        const label = document.createElement('span');
        label.innerText = color.name;
        
        item.appendChild(dot);
        item.appendChild(label);
        
        item.addEventListener('click', () => {
          applyColor(color);
          closeAllDropdowns();
        });
        
        menu.appendChild(item);
      });
    }

    function buildFontDropdownMenu() {
      const fontMenu = document.getElementById('font-dropdown-menu');
      if (!fontMenu) return;
      fontMenu.innerHTML = '';
      
      const titleFamily = document.createElement('div');
      titleFamily.className = 'menu-title';
      titleFamily.innerText = 'Font Family';
      fontMenu.appendChild(titleFamily);
      
      // Built-ins
      const builtInFonts = [
        { name: 'Handwriting', font: 'Caveat', style: "font-family: 'Caveat', cursive;" },
        { name: 'Inter (UI)', font: 'Inter', style: "font-family: 'Inter', sans-serif;" },
        { name: 'Roboto', font: 'Roboto', style: "font-family: 'Roboto', sans-serif;" },
        { name: 'Monospace', font: 'Courier Prime', style: "font-family: 'Courier Prime', monospace;" }
      ];
      
      builtInFonts.forEach(f => {
        const div = document.createElement('div');
        div.className = 'font-option';
        div.setAttribute('data-font', f.font);
        div.setAttribute('style', f.style);
        div.innerText = f.name;
        div.addEventListener('click', (e) => {
          e.stopPropagation();
          applyFontFamily(f.font);
          closeAllDropdowns();
        });
        fontMenu.appendChild(div);
      });
      
      // Custom fonts
      if (settings.customFonts && settings.customFonts.length > 0) {
        settings.customFonts.forEach(f => {
          const div = document.createElement('div');
          div.className = 'font-option';
          div.setAttribute('data-font', f);
          div.setAttribute('style', `font-family: '${f}', sans-serif;`);
          div.innerText = f;
          div.addEventListener('click', (e) => {
            e.stopPropagation();
            applyFontFamily(f);
            closeAllDropdowns();
          });
          fontMenu.appendChild(div);
        });
      }
      
      const separator = document.createElement('div');
      separator.className = 'menu-separator';
      fontMenu.appendChild(separator);
      
      const titleSize = document.createElement('div');
      titleSize.className = 'menu-title';
      titleSize.innerText = 'Font Size';
      fontMenu.appendChild(titleSize);
      
      const sizesDiv = document.createElement('div');
      sizesDiv.className = 'font-sizes';
      
      // Built-ins
      const builtInSizes = ['14px', '16px', '18px', '20px', '22px', '24px', '28px'];
      let allSizes = [...builtInSizes];
      if (settings.customFontSizes && settings.customFontSizes.length > 0) {
        settings.customFontSizes.forEach(s => {
          let normalized = s.trim();
          if (!normalized.endsWith('px')) {
            normalized += 'px';
          }
          if (!allSizes.includes(normalized)) {
            allSizes.push(normalized);
          }
        });
        allSizes.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
      }
      
      allSizes.forEach(sz => {
        const span = document.createElement('span');
        span.className = 'size-btn';
        span.setAttribute('data-size', sz);
        span.innerText = parseInt(sz, 10);
        span.addEventListener('click', (e) => {
          e.stopPropagation();
          applyFontSize(sz);
          closeAllDropdowns();
        });
        sizesDiv.appendChild(span);
      });
      
      fontMenu.appendChild(sizesDiv);
    }

    // Apply color values
    window.applyColor = function(color) {
      let colorId = typeof color === 'string' ? color : color.id;
      const colorObj = settings.colors.find(c => c.id === colorId) || { id: colorId, isBuiltIn: true };

      // Reset classes
      noteCardEl.className = '';
      
      if (colorObj.isBuiltIn) {
        noteCardEl.classList.add(colorObj.id);
        noteCardEl.style.backgroundColor = '';
        noteCardEl.style.color = '';
        noteCardEl.style.setProperty('--note-bg', '');
        noteCardEl.style.setProperty('--note-text', '');
        noteCardEl.style.setProperty('--note-accent', '');
        noteCardEl.style.setProperty('--note-accent-light', '');
        
        // Update the button indicator
        document.getElementById('color-btn-dot').style.backgroundColor = colorObj.dot || '#FF9E42';
        document.getElementById('color-btn-dot').style.border = '';
      } else {
        // Custom color
        noteCardEl.style.backgroundColor = colorObj.bg;
        noteCardEl.style.color = colorObj.text;
        
        // Dynamic variable updates
        noteCardEl.style.setProperty('--note-bg', colorObj.bg);
        noteCardEl.style.setProperty('--note-text', colorObj.text);
        noteCardEl.style.setProperty('--note-accent', colorObj.text);
        
        let accentLight = 'rgba(0,0,0,0.1)';
        if (colorObj.text.startsWith('#')) {
          const hex = colorObj.text.replace('#', '');
          let r = 0, g = 0, b = 0;
          if (hex.length === 3) {
            r = parseInt(hex[0]+hex[0], 16);
            g = parseInt(hex[1]+hex[1], 16);
            b = parseInt(hex[2]+hex[2], 16);
          } else if (hex.length === 6) {
            r = parseInt(hex.substring(0,2), 16);
            g = parseInt(hex.substring(2,4), 16);
            b = parseInt(hex.substring(4,6), 16);
          }
          accentLight = `rgba(${r}, ${g}, ${b}, 0.12)`;
        }
        noteCardEl.style.setProperty('--note-accent-light', accentLight);
        
        // Update the button indicator
        document.getElementById('color-btn-dot').style.backgroundColor = colorObj.bg;
        document.getElementById('color-btn-dot').style.border = '1px solid rgba(0,0,0,0.15)';
      }
      
      if (noteData) {
        noteData.theme = colorObj.id;
        if (settings.autosave) {
          persistNotes();
        } else {
          markUnsavedChanges();
        }
      }
    };

    // Dropdown helpers
    function setupDropdowns() {
      const toggleDropdown = (btnId, menuId) => {
        const btn = document.getElementById(btnId);
        const menu = document.getElementById(menuId);
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (isReadOnly()) {
            return;
          }
          const isShow = menu.classList.contains('show');
          closeAllDropdowns();
          if (!isShow) {
            menu.classList.add('show');
          }
        });
      };

      const fmtBtn = document.getElementById('format-dropdown-btn');
      if (fmtBtn) {
        fmtBtn.addEventListener('mousedown', (e) => {
          e.preventDefault();
        });
      }
      toggleDropdown('color-dropdown-btn', 'color-dropdown-menu');
      toggleDropdown('font-dropdown-btn', 'font-dropdown-menu');
      toggleDropdown('format-dropdown-btn', 'format-dropdown-menu');

      const formatMenu = document.getElementById('format-dropdown-menu');
      const formatBtn = document.getElementById('format-dropdown-btn');
      if (formatBtn && formatMenu) {
        formatBtn.addEventListener('click', () => {
          if (formatMenu.classList.contains('show')) {
            updateFormatStates();
          }
        });
      }

      // Click outside to close
      document.addEventListener('click', () => {
        closeAllDropdowns();
      });

      // Format menu option click handler
      document.querySelectorAll('.format-option').forEach(el => {
        el.addEventListener('mousedown', (e) => {
          e.preventDefault();
        });
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          const cmd = el.getAttribute('data-cmd');
          formatDoc(cmd);
          closeAllDropdowns();
        });
      });
    }

    function closeAllDropdowns() {
      document.querySelectorAll('.dropdown-menu').forEach(el => el.classList.remove('show'));
    }

    function applyFontFamily(font) {
      if (noteData) {
        noteData.fontFamily = font;
        applyEditorTypography();
      }
      
      document.querySelectorAll('.font-option').forEach(el => {
        if (el.getAttribute('data-font') === font) {
          el.classList.add('active');
        } else {
          el.classList.remove('active');
        }
      });
      
      if (noteData) {
        if (settings.autosave) {
          persistNotes();
        } else {
          markUnsavedChanges();
        }
      }
    }

    function applyFontSize(size) {
      if (noteData) {
        noteData.fontSize = size;
        applyEditorTypography();
      }
      
      document.querySelectorAll('.size-btn').forEach(el => {
        if (el.getAttribute('data-size') === size) {
          el.classList.add('active');
        } else {
          el.classList.remove('active');
        }
      });
      
      if (noteData) {
        if (settings.autosave) {
          persistNotes();
        } else {
          markUnsavedChanges();
        }
      }
    }

    // Always-on-top window toggle (independent from dashboard pin)
    alwaysTopBtn.addEventListener('click', () => {
      isAlwaysOnTop = !isAlwaysOnTop;
      noteData.alwaysOnTop = isAlwaysOnTop;
      updateAlwaysOnTopUI();
      if (appWindow && invoke) {
        invoke('set_always_on_top', { alwaysOnTop: isAlwaysOnTop, noteId }).catch(console.error);
      }
      persistNotes();
    });

    function updateAlwaysOnTopUI() {
      if (isAlwaysOnTop) {
        alwaysTopBtn.classList.add('active');
      } else {
        alwaysTopBtn.classList.remove('active');
      }
    }

    // Lock toggle handler
    lockBtn.addEventListener('click', () => {
      isLocked = !isLocked;
      noteData.readOnly = isLocked;
      updateReadOnlyUI();
      persistNotes();
    });

    function updateReadOnlyUI() {
      const readOnlyActive = isReadOnly();
      
      if (readOnlyActive) {
        setEditorEditable(false);
        noteTitleInput.disabled = true;
        lockBtn.classList.add('active');
        
        // Disable top menus
        document.getElementById('font-dropdown-btn').classList.add('controls-disabled');
        document.getElementById('color-dropdown-btn').classList.add('controls-disabled');
        document.getElementById('format-dropdown-btn').classList.add('controls-disabled');
        document.getElementById('save-btn').classList.add('controls-disabled');
        
        // Show locked icon
        lockBtn.innerHTML = `
          <svg id="lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        `;
      } else {
        setEditorEditable(true);
        noteTitleInput.disabled = false;
        lockBtn.classList.remove('active');
        
        // Enable top menus
        document.getElementById('font-dropdown-btn').classList.remove('controls-disabled');
        document.getElementById('color-dropdown-btn').classList.remove('controls-disabled');
        document.getElementById('format-dropdown-btn').classList.remove('controls-disabled');
        document.getElementById('save-btn').classList.remove('controls-disabled');
        
        // Show unlocked icon
        lockBtn.innerHTML = `
          <svg id="lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
          </svg>
        `;
      }
      updateFormatStates();
    }

    // Save indicators
    function markUnsavedChanges() {
      saveBtn.classList.add('unsaved');
      if (moreBtn) moreBtn.classList.add('unsaved');
    }
    
    function clearUnsavedChanges() {
      saveBtn.classList.remove('unsaved');
      if (moreBtn) moreBtn.classList.remove('unsaved');
    }

    // Save button click
    saveBtn.addEventListener('click', () => {
      if (isReadOnly()) return;
      saveNoteManual();
    });

    // Manual save handler
    window.saveNoteManual = function() {
      clearTimeout(typingTimer);
      noteData.content = getEditorContent();
      persistNotes();
      clearUnsavedChanges();
    };

    // Window controls
    closeBtn.addEventListener('click', () => {
      // Close window. Rust backend event handles the isOpen setting update
      if (appWindow) appWindow.close();
    });

    // WYSIWYG formatting (Notion-style — no visible markdown syntax)
    window.formatDoc = function(cmd) {
      if (isReadOnly() || !noteEditor) return;

      const lineFormats = {
        insertUnorderedList: 'bullet',
        insertOrderedList: 'number',
        insertChecklist: 'checklist',
      };

      if (lineFormats[cmd]) {
        if (window.CarrotLineFormat) {
          CarrotLineFormat.apply(noteEditor, lineFormats[cmd]);
        }
      } else {
        const chain = noteEditor.chain().focus();
        switch (cmd) {
          case 'bold':
            chain.toggleBold().run();
            break;
          case 'italic':
            chain.toggleItalic().run();
            break;
          case 'underline':
            chain.toggleUnderline().run();
            break;
          case 'strikeThrough':
            chain.toggleStrike().run();
            break;
          case 'removeFormat':
            chain.unsetAllMarks().run();
            break;
          default:
            return;
        }
      }

      syncEditorContent();
      updateFormatStates();
    };

    window.insertChecklist = function() {
      formatDoc('insertChecklist');
    };

    // Persist storage and emit notes-changed event globally
    function persistNotes() {
      let latestNotes = [];
      try {
        latestNotes = JSON.parse(localStorage.getItem('carrotnotes_notes') || '[]');
      } catch (e) {
        latestNotes = notes;
      }

      const idx = latestNotes.findIndex(n => n.id === noteId);
      if (idx !== -1) {
        latestNotes[idx] = noteData;
      } else {
        latestNotes.push(noteData);
      }

      const notesJson = JSON.stringify(latestNotes);
      localStorage.setItem('carrotnotes_notes', notesJson);

      // Perform local sync if in on_save mode
      triggerSyncIfOnSave(notesJson);

      if (invoke) {
        invoke('save_notes', { notesJson })
          .then(() => {
            if (window.__TAURI__) {
              window.__TAURI__.event.emit('notes-changed');
            }
          })
          .catch(console.error);
      }
    }
    
    let isWindowDragging = false;

    function isEditorFocused() {
      return !!(noteEditor && noteEditor.isFocused);
    }

    // Global save shortcut fallback when editor is not focused
    document.addEventListener('keydown', (e) => {
      if (isReadOnly()) return;
      if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveNoteManual();
      }
    });

    // Helper for syncing on save
    function triggerSyncIfOnSave(notesJson) {
      if (settings.localSync && settings.localSync.enabled && settings.localSync.mode === 'on_save') {
        if (invoke) {
          invoke('sync_to_local_directory', { dirPath: settings.localSync.dir, notesJson })
            .catch(console.error);
        }
      }
      if (settings.cloudSync && settings.cloudSync.enabled && settings.cloudSync.mode === 'on_save') {
        if (invoke) {
          invoke('sync_notes_to_cloud', { 
            endpoint: settings.cloudSync.endpoint, 
            token: settings.cloudSync.token, 
            notesJson 
          }).catch(console.error);
        }
      }
    }

    // Active formats pill and toast controls
    let activeFormats = {
      bold: false,
      italic: false,
      underline: false,
      strikeThrough: false
    };
    let toastTimeout = null;

    const formatIcons = {
      bold: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 10px; height: 10px;"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path></svg>`,
      italic: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 10px; height: 10px;"><line x1="19" y1="4" x2="10" y2="4"></line><line x1="14" y1="20" x2="5" y2="20"></line><line x1="15" y1="4" x2="9" y2="20"></line></svg>`,
      underline: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 10px; height: 10px;"><path d="M6 3v7a6 6 0 0 0 12 0V3"></path><line x1="4" y1="21" x2="20" y2="21"></line></svg>`,
      strikeThrough: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 10px; height: 10px;"><path d="M16 4H9a3 3 0 0 0-2.83 4H19a3 3 0 0 1-2.83 4H7a4 4 0 0 0 4 4h7"></path><line x1="4" y1="12" x2="20" y2="12"></line></svg>`
    };

    function getFormatActiveState() {
      if (!noteEditor || !noteEditor.isFocused || isWindowDragging) {
        return { bold: false, italic: false, underline: false, strikeThrough: false };
      }
      return {
        bold: noteEditor.isActive('bold'),
        italic: noteEditor.isActive('italic'),
        underline: noteEditor.isActive('underline'),
        strikeThrough: noteEditor.isActive('strike'),
      };
    }

    function updateFormatStates() {
      if (isReadOnly()) {
        document.getElementById('active-formats-indicator').innerHTML = '';
        document.querySelectorAll('.format-option[data-cmd="bold"], .format-option[data-cmd="italic"], .format-option[data-cmd="underline"], .format-option[data-cmd="strikeThrough"]').forEach(el => {
          el.classList.remove('active');
        });
        return;
      }

      const formats = [
        { name: 'bold', label: 'Bold' },
        { name: 'italic', label: 'Italic' },
        { name: 'underline', label: 'Underline' },
        { name: 'strikeThrough', label: 'Strikethrough' }
      ];

      const container = document.getElementById('active-formats-indicator');
      if (!container) return;

      // Ignore stale command state while dragging the window or when focus left the editor
      if (isWindowDragging || !isEditorFocused()) {
        container.innerHTML = '';
        formats.forEach(f => {
          document.querySelector(`.format-option[data-cmd="${f.name}"]`)?.classList.remove('active');
        });
        return;
      }

      container.innerHTML = '';
      
      const active = getFormatActiveState();
      
      formats.forEach(f => {
        const isActive = !!active[f.name];
        
        const formatOption = document.querySelector(`.format-option[data-cmd="${f.name}"]`);
        if (formatOption) {
          formatOption.classList.toggle('active', isActive);
        }
        
        if (isActive && !activeFormats[f.name]) {
          showFormatToast(`${f.label} Enabled`);
        }
        
        activeFormats[f.name] = isActive;
        
        if (isActive) {
          const pill = document.createElement('div');
          pill.className = 'format-pill';
          pill.title = `Disable ${f.label}`;
          pill.innerHTML = formatIcons[f.name];
          pill.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            e.preventDefault();
          });
          pill.addEventListener('click', (e) => {
            e.stopPropagation();
            formatDoc(f.name);
            updateFormatStates();
          });
          container.appendChild(pill);
        }
      });
    }

    function showFormatToast(message) {
      const toast = document.getElementById('format-toast');
      if (!toast) return;
      toast.innerText = message;
      toast.classList.add('show');
      
      clearTimeout(toastTimeout);
      toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
      }, 1500);
    }

    async function loadSettings() {
      if (invoke) {
        try {
          const sJson = await invoke('load_settings');
          const loaded = JSON.parse(sJson);
          settings = { ...settings, ...loaded };
        } catch (e) {
          console.error("Failed to load settings:", e);
        }
      }
      
      // Re-apply settings
      if (noteData) {
        buildFontDropdownMenu();
        applyFontFamily(noteData.fontFamily || settings.defaultFont.family);
        applyFontSize(noteData.fontSize || settings.defaultFont.size);
        applyEditorTypography();
        
        buildColorDropdownMenu();
        applyColor(noteData.theme || settings.defaultColor || 'theme-orange');
      }
    }
