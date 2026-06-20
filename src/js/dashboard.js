    const invoke = window.__TAURI__ ? window.__TAURI__.core.invoke : null;
    const listen = window.__TAURI__ ? window.__TAURI__.event.listen : null;
    const { getCurrentWindow } = window.__TAURI__ ? window.__TAURI__.window : { getCurrentWindow: null };

    let notes = [];
    let appWindow = null;
    let localSyncTimer = null;
    let cloudSyncTimer = null;

    let settings = {
      theme: "system",
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
      ],
      localSync: {
        enabled: false,
        dir: "",
        mode: "manual",
        interval: 60
      },
      cloudSync: {
        enabled: false,
        endpoint: "",
        token: "",
        mode: "manual",
        interval: 60
      }
    };

    const themeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    function normalizeThemeSetting(theme) {
      if (theme === 'dark' || theme === 'light' || theme === 'system') return theme;
      return 'system';
    }

    function resolveEffectiveTheme(theme) {
      const mode = normalizeThemeSetting(theme ?? settings.theme);
      if (mode === 'system') {
        return themeMediaQuery.matches ? 'dark' : 'light';
      }
      return mode;
    }

    function applyDashboardTheme(themeSetting) {
      document.body.classList.toggle('dark-mode', resolveEffectiveTheme(themeSetting) === 'dark');
    }

    function updateThemeSegmentedUI() {
      const mode = normalizeThemeSetting(settings.theme);
      const container = document.getElementById('theme-mode-segmented');
      if (!container) return;
      container.dataset.theme = mode;
      container.querySelectorAll('.theme-segment').forEach(btn => {
        const active = btn.dataset.theme === mode;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-checked', active ? 'true' : 'false');
      });
    }

    window.setThemeMode = function(mode) {
      settings.theme = normalizeThemeSetting(mode);
      updateThemeSegmentedUI();
      applyDashboardTheme(settings.theme);
      saveSettings();
    };

    function setupThemeSystemListener() {
      const onSystemThemeChange = () => {
        if (normalizeThemeSetting(settings.theme) === 'system') {
          applyDashboardTheme('system');
        }
      };
      if (themeMediaQuery.addEventListener) {
        themeMediaQuery.addEventListener('change', onSystemThemeChange);
      } else {
        themeMediaQuery.addListener(onSystemThemeChange);
      }
    }

    if (getCurrentWindow) {
      appWindow = getCurrentWindow();
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

    // Initialize Dashboard UI
    document.addEventListener('DOMContentLoaded', () => {
      setupThemeSystemListener();

      // 1. Setup programmatic dragging listener to fix Wayland borderless dragging
      if (appWindow) {
        document.getElementById('drag-header').addEventListener('mousedown', (e) => {
          if (!e.target.closest('.no-drag')) {
            appWindow.startDragging();
          }
        });
        setupWindowResizeHandles();
      }

      // 3. Load Settings from Rust & populate UI
      loadSettings().then(() => {
        // 4. Load all notes and spawn previously open notes
        loadAllNotes(true); // openPrevious = true
      });

      // 5. Watch for changes from other windows
      if (listen) {
        listen('notes-changed', () => {
          loadAllNotes(false); // reload but don't reopen (already open)
        });
        
        listen('create-note', () => {
          createNewNote();
        });

        listen('settings-changed', () => {
          loadSettings();
        });
      }
    });

    // Window controls
    document.getElementById('min-btn').addEventListener('click', () => {
      if (appWindow) appWindow.minimize();
    });

    document.getElementById('close-btn').addEventListener('click', () => {
      if (appWindow) appWindow.close(); // hides to system tray in Rust
    });

    // Tab switcher
    window.switchTab = function(tabId) {
      document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
      document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));

      document.getElementById(tabId).classList.add('active');
      event.target.classList.add('active');
    };

    // Load Settings
    async function loadSettings() {
      if (invoke) {
        try {
          const sJson = await invoke('load_settings');
          const loaded = JSON.parse(sJson);
          
          // Merge objects
          if (loaded.colors) {
            settings = { ...settings, ...loaded };
          } else {
            // Keep default colors if empty/null
            settings = { ...settings, ...loaded, colors: settings.colors };
          }
        } catch(e) {
          console.error("Failed to load settings:", e);
        }
      } else {
        const sJson = localStorage.getItem('carrotnotes_settings');
        if (sJson) {
          try { settings = JSON.parse(sJson); } catch(e){}
        }
      }

      settings.theme = normalizeThemeSetting(settings.theme);
      applyDashboardTheme(settings.theme);
      
      populateSettingsUI();
      startSyncSchedulers();
    }

    function populateSettingsUI() {
      // Appearance
      updateThemeSegmentedUI();
      
      // Default note formatting
      document.getElementById('strict-readonly-toggle').checked = settings.readOnlyMode;
      document.getElementById('default-readonly-toggle').checked = settings.defaultReadOnly || false;
      document.getElementById('autosave-toggle').checked = settings.autosave;
      document.getElementById('autosave-interval').value = settings.autosaveInterval;
      document.getElementById('default-width').value = settings.defaultSize.width;
      document.getElementById('default-height').value = settings.defaultSize.height;
      
      // Rebuild and sync custom fonts select elements
      rebuildUIFontSelects();
      
      // Local Sync Settings
      document.getElementById('local-sync-toggle').checked = settings.localSync.enabled;
      document.getElementById('local-sync-dir').value = settings.localSync.dir || '';
      document.getElementById('local-sync-mode').value = settings.localSync.mode;
      document.getElementById('local-sync-interval').value = settings.localSync.interval;
      
      // Cloud Sync Settings
      document.getElementById('cloud-sync-toggle').checked = settings.cloudSync.enabled;
      document.getElementById('cloud-sync-endpoint').value = settings.cloudSync.endpoint || '';
      document.getElementById('cloud-sync-token').value = settings.cloudSync.token || '';
      document.getElementById('cloud-sync-mode').value = settings.cloudSync.mode;
      document.getElementById('cloud-sync-interval').value = settings.cloudSync.interval;
      
      updateIntervalVisibility();
      updateSyncDisabledStates();
      renderColorManager();
      renderCustomFontsAndSizes();
    }

    function updateSyncDisabledStates() {
      const localEnabled = document.getElementById('local-sync-toggle').checked;
      document.getElementById('local-sync-dir').disabled = !localEnabled;
      document.getElementById('local-sync-mode').disabled = !localEnabled;
      document.getElementById('local-sync-interval').disabled = !localEnabled;
      const localBtn = document.querySelector('button[onclick="syncLocalNow()"]');
      if (localBtn) {
        localBtn.disabled = !localEnabled;
        localBtn.classList.toggle('disabled-btn', !localEnabled);
      }

      const cloudEnabled = document.getElementById('cloud-sync-toggle').checked;
      document.getElementById('cloud-sync-endpoint').disabled = !cloudEnabled;
      document.getElementById('cloud-sync-token').disabled = !cloudEnabled;
      document.getElementById('cloud-sync-mode').disabled = !cloudEnabled;
      document.getElementById('cloud-sync-interval').disabled = !cloudEnabled;
      const cloudBtn = document.querySelector('button[onclick="syncCloudNow()"]');
      if (cloudBtn) {
        cloudBtn.disabled = !cloudEnabled;
        cloudBtn.classList.toggle('disabled-btn', !cloudEnabled);
      }
      if (window.initCustomSelects) {
        window.initCustomSelects();
      }
    }

    function updateIntervalVisibility() {
      const localMode = document.getElementById('local-sync-mode').value;
      document.getElementById('local-interval-group').style.display = localMode === 'scheduled' ? 'block' : 'none';
      
      const cloudMode = document.getElementById('cloud-sync-mode').value;
      document.getElementById('cloud-interval-group').style.display = cloudMode === 'scheduled' ? 'block' : 'none';
      
      const autosave = document.getElementById('autosave-toggle').checked;
      document.getElementById('autosave-interval-group').style.display = autosave ? 'block' : 'none';
    }

    function readSettingsFromUI() {
      const activeThemeBtn = document.querySelector('#theme-mode-segmented .theme-segment.active');
      if (activeThemeBtn) {
        settings.theme = normalizeThemeSetting(activeThemeBtn.dataset.theme);
      }
      settings.readOnlyMode = document.getElementById('strict-readonly-toggle').checked;
      settings.defaultReadOnly = document.getElementById('default-readonly-toggle').checked;
      settings.autosave = document.getElementById('autosave-toggle').checked;
      settings.autosaveInterval = parseInt(document.getElementById('autosave-interval').value, 10) || 5;
      settings.defaultSize.width = parseInt(document.getElementById('default-width').value, 10) || 280;
      settings.defaultSize.height = parseInt(document.getElementById('default-height').value, 10) || 300;
      settings.defaultFont.family = document.getElementById('default-font-family').value;
      settings.defaultFont.size = document.getElementById('default-font-size').value;
      
      // Determine default color based on ordering (first enabled color in list)
      const firstActiveColor = settings.colors.find(c => c.enabled) || settings.colors[0];
      settings.defaultColor = firstActiveColor ? firstActiveColor.id : 'theme-orange';
      
      settings.localSync.enabled = document.getElementById('local-sync-toggle').checked;
      settings.localSync.dir = document.getElementById('local-sync-dir').value.trim();
      settings.localSync.mode = document.getElementById('local-sync-mode').value;
      settings.localSync.interval = parseInt(document.getElementById('local-sync-interval').value, 10) || 60;
      
      settings.cloudSync.enabled = document.getElementById('cloud-sync-toggle').checked;
      settings.cloudSync.endpoint = document.getElementById('cloud-sync-endpoint').value.trim();
      settings.cloudSync.token = document.getElementById('cloud-sync-token').value.trim();
      settings.cloudSync.mode = document.getElementById('cloud-sync-mode').value;
      settings.cloudSync.interval = parseInt(document.getElementById('cloud-sync-interval').value, 10) || 60;
    }

    window.saveSettings = function() {
      readSettingsFromUI();
      updateIntervalVisibility();
      updateSyncDisabledStates();
      
      const settingsJson = JSON.stringify(settings);
      localStorage.setItem('carrotnotes_settings', settingsJson);
      
      if (invoke) {
        invoke('save_settings', { settingsJson })
          .then(() => {
            if (window.__TAURI__) {
              window.__TAURI__.event.emit('settings-changed');
            }
          })
          .catch(console.error);
      }
      
      applyDashboardTheme(settings.theme);
      
      startSyncSchedulers();
    };

    // Color manager rendering
    function renderColorManager() {
      const container = document.getElementById('color-manager-list');
      if (!container) return;
      container.innerHTML = '';
      
      settings.colors.forEach((color, index) => {
        const item = document.createElement('div');
        item.className = 'color-item';
        
        const left = document.createElement('div');
        left.className = 'color-item-left';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = color.enabled;
        checkbox.title = "Enable color";
        checkbox.addEventListener('change', () => {
          color.enabled = checkbox.checked;
          saveSettings();
        });
        
        const dot = document.createElement('span');
        dot.className = 'color-preview-dot';
        if (color.isBuiltIn) {
          dot.style.backgroundColor = color.dot;
        } else {
          dot.style.backgroundColor = color.bg;
        }
        
        const label = document.createElement('span');
        label.className = 'color-label';
        label.innerText = color.name;
        
        const badge = document.createElement('span');
        badge.className = 'color-badge';
        badge.innerText = color.isBuiltIn ? "Built-in" : "Custom";
        
        left.appendChild(checkbox);
        left.appendChild(dot);
        left.appendChild(label);
        left.appendChild(badge);
        
        // Show "Default" indicator if it's the first active color
        const firstActiveColor = settings.colors.find(c => c.enabled) || settings.colors[0];
        if (firstActiveColor && firstActiveColor.id === color.id) {
          const defBadge = document.createElement('span');
          defBadge.className = 'color-badge';
          defBadge.style.backgroundColor = 'var(--primary-color)';
          defBadge.style.color = 'white';
          defBadge.style.fontSize = '9px';
          defBadge.innerText = "Default";
          left.appendChild(defBadge);
        }
        
        const actions = document.createElement('div');
        actions.className = 'color-item-actions';
        
        // Up Arrow
        const upBtn = document.createElement('button');
        upBtn.className = 'btn-arrow';
        upBtn.title = "Move Up";
        upBtn.disabled = index === 0;
        upBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="19" x2="12" y2="5"></line>
            <polyline points="5 12 12 5 19 12"></polyline>
          </svg>
        `;
        upBtn.addEventListener('click', () => {
          if (index > 0) {
            const temp = settings.colors[index - 1];
            settings.colors[index - 1] = settings.colors[index];
            settings.colors[index] = temp;
            saveSettings();
            renderColorManager();
          }
        });
        
        // Down Arrow
        const downBtn = document.createElement('button');
        downBtn.className = 'btn-arrow';
        downBtn.title = "Move Down";
        downBtn.disabled = index === settings.colors.length - 1;
        downBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <polyline points="19 12 12 19 5 12"></polyline>
          </svg>
        `;
        downBtn.addEventListener('click', () => {
          if (index < settings.colors.length - 1) {
            const temp = settings.colors[index + 1];
            settings.colors[index + 1] = settings.colors[index];
            settings.colors[index] = temp;
            saveSettings();
            renderColorManager();
          }
        });
        
        actions.appendChild(upBtn);
        actions.appendChild(downBtn);
        
        if (!color.isBuiltIn) {
          const delBtn = document.createElement('button');
          delBtn.className = 'btn-color-delete';
          delBtn.title = "Delete Custom Color";
          delBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          `;
          delBtn.addEventListener('click', async () => {
            if (await showCustomConfirm(`Remove custom color "${color.name}"?`, "Delete Color")) {
              if (settings.defaultColor === color.id) {
                settings.defaultColor = "theme-orange";
              }
              settings.colors = settings.colors.filter(c => c.id !== color.id);
              saveSettings();
              renderColorManager();
            }
          });
          actions.appendChild(delBtn);
        }
        
        item.appendChild(left);
        item.appendChild(actions);
        container.appendChild(item);
      });
    }

    window.addCustomColor = async function() {
      const nameEl = document.getElementById('new-color-name');
      const bgEl = document.getElementById('new-color-bg');
      const textEl = document.getElementById('new-color-text');
      
      const name = nameEl.value.trim();
      if (!name) {
        await showCustomAlert("Please enter a color name", "Missing Input");
        return;
      }
      
      const bg = bgEl.value;
      const text = textEl.value;
      const id = 'custom_' + Date.now();
      
      const newColor = {
        id,
        name,
        bg,
        text,
        isBuiltIn: false,
        enabled: true
      };
      
      settings.colors.push(newColor);
      nameEl.value = '';
      
      saveSettings();
      renderColorManager();
    };

    function rebuildUIFontSelects() {
      const familySelect = document.getElementById('default-font-family');
      const sizeSelect = document.getElementById('default-font-size');
      if (!familySelect || !sizeSelect) return;
      
      const currentFamily = settings.defaultFont.family;
      const currentSize = settings.defaultFont.size;
      
      // Populate family select
      familySelect.innerHTML = `
        <option value="Caveat">Handwriting</option>
        <option value="Inter">Inter (UI)</option>
        <option value="Roboto">Roboto</option>
        <option value="Courier Prime">Monospace</option>
      `;
      if (settings.customFonts) {
        settings.customFonts.forEach(font => {
          const opt = document.createElement('option');
          opt.value = font;
          opt.innerText = font;
          familySelect.appendChild(opt);
        });
      }
      familySelect.value = currentFamily;
      if (!familySelect.value && familySelect.options.length > 0) {
        familySelect.value = familySelect.options[0].value;
      }
      
      // Populate size select
      sizeSelect.innerHTML = `
        <option value="14px">14px</option>
        <option value="16px">16px</option>
        <option value="18px">18px</option>
        <option value="20px">20px</option>
        <option value="22px">22px</option>
        <option value="24px">24px</option>
        <option value="28px">28px</option>
      `;
      if (settings.customFontSizes) {
        settings.customFontSizes.forEach(size => {
          let normalized = size;
          if (!normalized.endsWith('px')) normalized += 'px';
          const opt = document.createElement('option');
          opt.value = normalized;
          opt.innerText = normalized;
          let exists = Array.from(sizeSelect.options).some(o => o.value === normalized);
          if (!exists) {
            sizeSelect.appendChild(opt);
          }
        });
      }
      sizeSelect.value = currentSize;
      if (!sizeSelect.value && sizeSelect.options.length > 0) {
        sizeSelect.value = sizeSelect.options[0].value;
      }
      if (window.initCustomSelects) {
        window.initCustomSelects();
      }
    }

    function renderCustomFontsAndSizes() {
      const fontsContainer = document.getElementById('custom-fonts-manager-list');
      const sizesContainer = document.getElementById('custom-sizes-manager-list');
      if (!fontsContainer || !sizesContainer) return;
      
      fontsContainer.innerHTML = '';
      sizesContainer.innerHTML = '';
      
      // Render custom fonts
      if (!settings.customFonts || settings.customFonts.length === 0) {
        fontsContainer.innerHTML = '<div style="font-size: 11px; opacity: 0.5; padding: 4px;">No custom fonts</div>';
      } else {
        settings.customFonts.forEach(font => {
          const item = document.createElement('div');
          item.className = 'color-item';
          item.style.padding = '6px 10px';
          
          const name = document.createElement('span');
          name.className = 'color-label';
          name.style.fontSize = '12px';
          name.innerText = font;
          
          const delBtn = document.createElement('button');
          delBtn.className = 'btn-color-delete';
          delBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:12px; height:12px;">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          `;
          delBtn.addEventListener('click', () => {
            settings.customFonts = settings.customFonts.filter(f => f !== font);
            saveSettings();
            renderCustomFontsAndSizes();
            rebuildUIFontSelects();
          });
          
          item.appendChild(name);
          item.appendChild(delBtn);
          fontsContainer.appendChild(item);
        });
      }
      
      // Render custom sizes
      if (!settings.customFontSizes || settings.customFontSizes.length === 0) {
        sizesContainer.innerHTML = '<div style="font-size: 11px; opacity: 0.5; padding: 4px;">No custom sizes</div>';
      } else {
        settings.customFontSizes.forEach(size => {
          const item = document.createElement('div');
          item.className = 'color-item';
          item.style.padding = '6px 10px';
          
          const name = document.createElement('span');
          name.className = 'color-label';
          name.style.fontSize = '12px';
          name.innerText = size.endsWith('px') ? size : size + 'px';
          
          const delBtn = document.createElement('button');
          delBtn.className = 'btn-color-delete';
          delBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:12px; height:12px;">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          `;
          delBtn.addEventListener('click', () => {
            settings.customFontSizes = settings.customFontSizes.filter(s => s !== size);
            saveSettings();
            renderCustomFontsAndSizes();
            rebuildUIFontSelects();
          });
          
          item.appendChild(name);
          item.appendChild(delBtn);
          sizesContainer.appendChild(item);
        });
      }
    }

    window.addCustomFont = async function() {
      const input = document.getElementById('new-font-name');
      const font = input.value.trim();
      if (!font) {
        await showCustomAlert("Please enter a font name", "Missing Input");
        return;
      }
      if (!settings.customFonts) settings.customFonts = [];
      if (!settings.customFonts.includes(font)) {
        settings.customFonts.push(font);
      }
      input.value = '';
      saveSettings();
      renderCustomFontsAndSizes();
      rebuildUIFontSelects();
    };

    window.addCustomFontSize = async function() {
      const input = document.getElementById('new-font-size');
      let size = input.value.trim();
      if (!size) {
        await showCustomAlert("Please enter a font size", "Missing Input");
        return;
      }
      if (!size.endsWith('px')) {
        size += 'px';
      }
      if (!settings.customFontSizes) settings.customFontSizes = [];
      if (!settings.customFontSizes.includes(size)) {
        settings.customFontSizes.push(size);
      }
      input.value = '';
      saveSettings();
      renderCustomFontsAndSizes();
      rebuildUIFontSelects();
    };

    // Load and render note listings
    function loadAllNotes(openPrevious = false) {
      const render = (jsonString) => {
        try {
          notes = JSON.parse(jsonString || '[]');
          const pinnedListEl = document.getElementById('pinned-notes-list');
          const recentListEl = document.getElementById('notes-list');
          const pinnedSection = document.getElementById('pinned-section');
          const emptyState = document.getElementById('empty-state');

          pinnedListEl.innerHTML = '';
          recentListEl.innerHTML = '';
          
          if (notes.length === 0) {
            pinnedSection.style.display = 'none';
            emptyState.style.display = 'flex';
            return;
          }

          emptyState.style.display = 'none';

          // Separate pinned and recent notes
          const pinnedNotes = notes.filter(n => n.pinned);
          const recentNotes = notes.filter(n => !n.pinned);

          // Sort each group (reverse chronological)
          const sortedPinned = [...pinnedNotes].reverse();
          const sortedRecent = [...recentNotes].reverse();

          if (sortedPinned.length > 0) {
            pinnedSection.style.display = 'block';
          } else {
            pinnedSection.style.display = 'none';
          }

          const renderNoteCard = (note, container) => {
            const previewCard = document.createElement('div');
            previewCard.className = 'note-card-preview';
            
            // Apply color class/styles
            const colorObj = settings.colors.find(c => c.id === note.theme) || { id: note.theme, isBuiltIn: true };
            let noteAreaClass = 'preview-note-area';
            let noteAreaStyle = '';
            if (colorObj.isBuiltIn) {
              const themeId = colorObj.id || 'theme-orange';
              previewCard.classList.add(themeId);
              noteAreaClass += ` ${themeId}`;
            } else {
              noteAreaStyle = `background-color:${colorObj.bg};color:${colorObj.text};`;
              previewCard.style.borderLeftColor = colorObj.dot || colorObj.bg;
            }
            
            const isOpen = note.isOpen || false;
            const textContent = note.content
              ? escapeHtml(formatNotePreview(note.content))
              : 'Empty note...';
            
            // Badges
            const statusHtml = `<span class="status-badge ${isOpen ? 'active' : 'archived'}">${isOpen ? 'Floating' : 'Archived'}</span>`;
            const tempHtml = note.isTemporary ? `<span class="status-badge" style="background:#ff7a00; color:white; margin-left:4px;">Temporary</span>` : '';

            // Note title
            const noteTitle = note.title || "Untitled Note";

            // Pin button
            const isNotePinned = note.pinned || false;
            const pinIconHtml = `
              <button class="preview-action-btn no-drag pin-card-btn ${isNotePinned ? 'pinned' : ''}" onclick="togglePinStickyNote(event, '${note.id}')" title="${isNotePinned ? 'Unpin Note' : 'Pin Note'}">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="${isNotePinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2.5">
                  <line x1="12" y1="17" x2="12" y2="22"></line>
                  <path d="M5 17h14v-1.76a2 2 0 0 0-.44-1.24l-2.78-3.55A2 2 0 0 1 15 9.21V5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v4.21a2 2 0 0 1-.78 1.24L5.44 14a2 2 0 0 0-.44 1.24V17z"></path>
                </svg>
              </button>
            `;

            previewCard.innerHTML = `
              <div class="preview-header">
                <div>
                  ${statusHtml}
                  ${tempHtml}
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                  ${pinIconHtml}
                  <!-- Rename button -->
                  <button class="preview-action-btn no-drag" onclick="renameStickyNoteInline(event, '${note.id}')" title="Rename Note">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                  </button>
                </div>
              </div>
              <div class="${noteAreaClass}"${noteAreaStyle ? ` style="${noteAreaStyle}"` : ''}>
                <div class="preview-title" style="font-size: 11px; font-weight:700; opacity:0.8;">${noteTitle}</div>
                <div class="preview-body">${textContent}</div>
              </div>
              <div class="preview-footer">
                <button class="preview-action-btn no-drag" onclick="toggleStickyWindowState(event, '${note.id}')" title="${isOpen ? 'Close Note Window' : 'Float Note'}">
                  ${isOpen ? `
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="9" y1="9" x2="15" y2="15"></line>
                      <line x1="15" y1="9" x2="9" y2="15"></line>
                    </svg>
                  ` : `
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <polyline points="9 11 12 14 22 4"></polyline>
                      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                    </svg>
                  `}
                </button>
                <button class="preview-action-btn no-drag" onclick="duplicateStickyNote(event, '${note.id}')" title="Duplicate Note">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                </button>
                <button class="preview-action-btn delete-btn no-drag" onclick="deleteStickyNote(event, '${note.id}')" title="Delete Note">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                  </svg>
                </button>
              </div>
            `;
            
            previewCard.addEventListener('click', (e) => {
              if (e.target.closest('.no-drag') || e.target.closest('input') || e.target.closest('button')) {
                return;
              }
              openStickyWindow(note.id);
            });

            container.appendChild(previewCard);

            // Restore previously opened windows on startup
            if (openPrevious && isOpen) {
              openStickyWindow(note.id, false); 
            }
          };

          sortedPinned.forEach(note => {
            renderNoteCard(note, pinnedListEl);
          });

          sortedRecent.forEach(note => {
            renderNoteCard(note, recentListEl);
          });

        } catch (e) {
          console.error(e);
        }
      };

      if (invoke) {
        invoke('load_notes')
          .then(render)
          .catch(err => {
            console.error(err);
            render(localStorage.getItem('carrotnotes_notes'));
          });
      } else {
        render(localStorage.getItem('carrotnotes_notes'));
      }
    }

    // Toggle Pin/Unpin of a Sticky Note
    window.togglePinStickyNote = function(e, id) {
      if (e) e.stopPropagation();
      const note = notes.find(n => n.id === id);
      if (note) {
        note.pinned = !note.pinned;
        persistNotes();
        loadAllNotes(false);
      }
    };

    function escapeHtml(text) {
      return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    function formatNotePreview(content) {
      if (window.CarrotMarkdown) {
        const preview = CarrotMarkdown.plainTextPreview(content);
        if (preview) return preview.length > 280 ? preview.slice(0, 280) + '…' : preview;
      }
      return content.length > 280 ? content.slice(0, 280) + '…' : content;
    }

    // Create New Sticky Note
    window.createNewNote = function() {
      const defaultColor = settings.defaultColor || 'theme-orange';
      const noteId = 'note_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      
      // Smart note numbering logic
      let n = 1;
      while (notes.some(note => note.title.trim().toLowerCase() === `note ${n}`)) {
        n++;
      }
      const defaultTitle = `Note ${n}`;

      const newNote = {
        id: noteId,
        title: defaultTitle,
        content: '',
        theme: defaultColor,
        rotation: (Math.random() * 3 - 1.5).toFixed(2),
        pinned: false,
        alwaysOnTop: false,
        isOpen: true,
        isTemporary: true,
        fontFamily: settings.defaultFont.family,
        fontSize: settings.defaultFont.size,
        width: settings.defaultSize.width,
        height: settings.defaultSize.height
      };

      notes.push(newNote);
      persistNotes();
      
      openStickyWindow(noteId);
    };

    window.toggleStickyWindowState = function(e, id) {
      if (e) e.stopPropagation();
      const note = notes.find(n => n.id === id);
      if (note) {
        note.isOpen = !note.isOpen;
        persistNotes();
        if (note.isOpen) {
          openStickyWindow(id);
        } else {
          // Close using bulletproof Rust command
          if (invoke) {
            invoke('close_note_window', { id }).catch(console.error);
          } else if (window.__TAURI__) {
            const win = window.__TAURI__.window.WebviewWindow.getByLabel(`note_${id}`);
            if (win) win.close();
          }
        }
        loadAllNotes(false);
      }
    };

    function generateDuplicateTitle(sourceTitle) {
      const base = (sourceTitle || 'Untitled Note').replace(/\s*\(Copy(?:\s+\d+)?\)\s*$/i, '').trim() || 'Untitled Note';
      let candidate = `${base} (Copy)`;
      let n = 2;
      while (notes.some(note => note.title.trim().toLowerCase() === candidate.toLowerCase())) {
        candidate = `${base} (Copy ${n})`;
        n++;
      }
      return candidate;
    }

    window.duplicateStickyNote = function(e, id) {
      if (e) e.stopPropagation();
      const source = notes.find(n => n.id === id);
      if (!source) return;

      const noteId = 'note_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      const duplicate = {
        id: noteId,
        title: generateDuplicateTitle(source.title),
        content: source.content || '',
        theme: source.theme || settings.defaultColor || 'theme-orange',
        rotation: source.rotation || 0,
        pinned: false,
        alwaysOnTop: false,
        isOpen: false,
        isTemporary: false,
        readOnly: source.readOnly || false,
        fontFamily: source.fontFamily || settings.defaultFont.family,
        fontSize: source.fontSize || settings.defaultFont.size,
        width: source.width || settings.defaultSize.width,
        height: source.height || settings.defaultSize.height
      };

      if (typeof source.x === 'number') duplicate.x = source.x + 24;
      if (typeof source.y === 'number') duplicate.y = source.y + 24;

      notes.push(duplicate);
      persistNotes();
      loadAllNotes(false);
    };

    window.deleteStickyNote = async function(e, id) {
      if (e) e.stopPropagation();
      if (await showCustomConfirm('Delete this sticky note permanently?', 'Delete Note')) {
        notes = notes.filter(n => n.id !== id);
        persistNotes();
        
        // Close using bulletproof Rust command
        if (invoke) {
          invoke('close_note_window', { id }).catch(console.error);
        } else if (window.__TAURI__) {
          const win = window.__TAURI__.window.WebviewWindow.getByLabel(`note_${id}`);
          if (win) win.close();
        }
        
        loadAllNotes(false);
      }
    };

    window.renameStickyNoteInline = function(e, id) {
      if (e) e.stopPropagation();
      const card = e.currentTarget.closest('.note-card-preview');
      const titleEl = card.querySelector('.preview-title');
      const oldTitle = titleEl.innerText;
      
      const input = document.createElement('input');
      input.type = 'text';
      input.value = oldTitle;
      input.className = 'inline-rename-input';
      
      titleEl.replaceWith(input);
      input.focus();
      input.select();
      
      const finishRename = () => {
        const newTitle = input.value.trim() || oldTitle;
        const note = notes.find(n => n.id === id);
        if (note) {
          note.title = newTitle;
          note.isTemporary = false;
          persistNotes();
          
          // Emit settings-changed event to trigger note page refresh
          if (window.__TAURI__) {
            window.__TAURI__.event.emit('notes-changed');
          }
        }
        loadAllNotes(false);
      };
      
      input.addEventListener('keydown', (evt) => {
        if (evt.key === 'Enter') {
          finishRename();
        } else if (evt.key === 'Escape') {
          loadAllNotes(false);
        }
      });
      
      input.addEventListener('blur', finishRename);
      input.addEventListener('click', (evt) => evt.stopPropagation());
    };

    window.openStickyWindow = function(id, focus = true) {
      const note = notes.find(n => n.id === id);
      if (note) {
        note.isOpen = true;
        persistNotes();
        loadAllNotes(false);

        if (invoke) {
          invoke('open_note_window', {
            id: note.id,
            x: note.x || null,
            y: note.y || null,
            width: note.width || settings.defaultSize.width,
            height: note.height || settings.defaultSize.height,
            alwaysOnTop: note.alwaysOnTop || false
          }).catch(console.error);
        }
      }
    };

    function persistNotes() {
      const notesJson = JSON.stringify(notes);
      localStorage.setItem('carrotnotes_notes', notesJson);

      // Perform local/cloud sync if in on_save mode
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

    function triggerSyncIfOnSave(notesJson) {
      if (settings.localSync.enabled && settings.localSync.mode === 'on_save') {
        if (invoke) {
          invoke('sync_to_local_directory', { dirPath: settings.localSync.dir, notesJson })
            .catch(console.error);
        }
      }
      if (settings.cloudSync.enabled && settings.cloudSync.mode === 'on_save') {
        if (invoke) {
          invoke('sync_notes_to_cloud', { 
            endpoint: settings.cloudSync.endpoint, 
            token: settings.cloudSync.token, 
            notesJson 
          }).catch(console.error);
        }
      }
    }

    function startSyncSchedulers() {
      clearInterval(localSyncTimer);
      clearInterval(cloudSyncTimer);
      
      if (settings.localSync.enabled && settings.localSync.mode === 'scheduled') {
        const intervalSec = parseInt(settings.localSync.interval, 10) || 60;
        localSyncTimer = setInterval(() => {
          syncLocalNow();
        }, intervalSec * 1000);
      }
      
      if (settings.cloudSync.enabled && settings.cloudSync.mode === 'scheduled') {
        const intervalSec = parseInt(settings.cloudSync.interval, 10) || 60;
        cloudSyncTimer = setInterval(() => {
          syncCloudNow();
        }, intervalSec * 1000);
      }
    }

    window.syncLocalNow = async function() {
      if (!settings.localSync.enabled) return;
      const statusEl = document.getElementById('local-sync-status');
      const dirPath = settings.localSync.dir;
      
      if (!dirPath) {
        statusEl.textContent = "Status: Error - Missing local folder path";
        statusEl.style.color = '#ff4d4d';
        return;
      }
      
      statusEl.textContent = "Status: Syncing...";
      statusEl.style.color = '';
      
      const notesJson = localStorage.getItem('carrotnotes_notes') || '[]';
      
      if (invoke) {
        invoke('sync_to_local_directory', { dirPath, notesJson })
          .then(() => {
             statusEl.textContent = `Status: Sync success - ${new Date().toLocaleTimeString()}`;
             statusEl.style.color = '#3cd69e';
          })
          .catch(err => {
             statusEl.textContent = `Status: Error - ${err}`;
             statusEl.style.color = '#ff4d4d';
          });
      } else {
        setTimeout(() => {
          statusEl.textContent = `Status: Mock Sync Success (Web Sandbox) - ${new Date().toLocaleTimeString()}`;
          statusEl.style.color = '#3cd69e';
        }, 1000);
      }
    };

    const restoreReasonLabels = {
      deleted_locally: 'Deleted in app — still in sync source',
      modified_locally: 'Changed in app — older copy in sync source',
      archived: 'Archived in sync deleted folder'
    };

    function getRestoreSyncSource() {
      return document.getElementById('restore-sync-source')?.value || 'local';
    }

    function setRestoreStatus(message, color = '') {
      const statusEl = document.getElementById('restore-status');
      if (!statusEl) return;
      statusEl.textContent = message;
      statusEl.style.color = color;
    }

    function renderRestoreItem(item) {
      const reason = restoreReasonLabels[item.reason] || item.reason;
      return `
        <div class="restore-item">
          <div class="restore-item-info">
            <div class="restore-item-title">${escapeHtml(item.title || 'Untitled Note')}</div>
            <div class="restore-item-meta">${escapeHtml(reason)}</div>
          </div>
          <button class="btn-restore no-drag" onclick="restoreNoteFromSync('${item.id}', '${item.source}')">Restore</button>
        </div>
      `;
    }

    function renderRestoreGroup(label, items, withSeparator) {
      if (!items.length) return '';
      return `
        <div class="restore-group">
          ${withSeparator ? '<div class="restore-group-separator"></div>' : ''}
          <div class="restore-group-label">${escapeHtml(label)}</div>
          <div class="restore-group-list">
            ${items.map(renderRestoreItem).join('')}
          </div>
        </div>
      `;
    }

    function renderRestorableNotes(items) {
      const listEl = document.getElementById('restore-list');
      if (!listEl) return;

      if (!items.length) {
        listEl.innerHTML = '<div class="restore-empty">No restorable notes found for the selected sync source.</div>';
        return;
      }

      const syncItems = items.filter(item => item.source !== 'deleted');
      const deletedItems = items.filter(item => item.source === 'deleted');

      listEl.innerHTML =
        renderRestoreGroup('Sync copy', syncItems, false) +
        renderRestoreGroup('Trash', deletedItems, syncItems.length > 0);
    }

    window.scanRestorableNotes = async function() {
      const listEl = document.getElementById('restore-list');
      const syncSource = getRestoreSyncSource();
      const notesJson = localStorage.getItem('carrotnotes_notes') || '[]';

      if (listEl) {
        listEl.innerHTML = '';
      }
      setRestoreStatus('Status: Scanning...');

      if (!invoke) {
        renderRestorableNotes([]);
        setRestoreStatus('Status: Restore is unavailable outside the desktop app');
        return;
      }

      try {
        let resultJson = '[]';

        if (syncSource === 'cloud') {
          const endpoint = settings.cloudSync?.endpoint?.trim();
          const token = settings.cloudSync?.token?.trim() || '';
          if (!endpoint) {
            setRestoreStatus('Status: Error - Missing cloud endpoint URL', '#ff4d4d');
            if (listEl) {
              listEl.innerHTML = '<div class="restore-empty">Configure a cloud sync endpoint above first.</div>';
            }
            return;
          }
          resultJson = await invoke('list_restorable_cloud_notes', {
            endpoint,
            token,
            currentNotesJson: notesJson
          });
        } else {
          const dirPath = settings.localSync?.dir?.trim();
          if (!dirPath) {
            setRestoreStatus('Status: Error - Missing local sync folder path', '#ff4d4d');
            if (listEl) {
              listEl.innerHTML = '<div class="restore-empty">Configure a local sync directory above first.</div>';
            }
            return;
          }
          resultJson = await invoke('list_restorable_sync_notes', { dirPath, currentNotesJson: notesJson });
        }

        const items = JSON.parse(resultJson || '[]');
        renderRestorableNotes(Array.isArray(items) ? items : []);
        const count = Array.isArray(items) ? items.length : 0;
        setRestoreStatus(
          count
            ? `Status: Found ${count} restorable note${count === 1 ? '' : 's'} - ${new Date().toLocaleTimeString()}`
            : `Status: No restorable notes found - ${new Date().toLocaleTimeString()}`,
          count ? '#3cd69e' : ''
        );
      } catch (err) {
        if (listEl) {
          listEl.innerHTML = `<div class="restore-empty">Scan failed: ${escapeHtml(String(err))}</div>`;
        }
        setRestoreStatus(`Status: Error - ${err}`, '#ff4d4d');
      }
    };

    window.restoreNoteFromSync = async function(noteId, source) {
      if (!invoke) return;

      const syncSource = getRestoreSyncSource();
      const confirmMsg = source === 'deleted'
        ? 'Restore this note from the sync deleted folder?'
        : 'Replace the local version with the copy from your sync source?';

      if (!await showCustomConfirm(confirmMsg, 'Restore Note')) return;

      setRestoreStatus('Status: Restoring...');

      try {
        let noteJson;

        if (syncSource === 'cloud') {
          const endpoint = settings.cloudSync?.endpoint?.trim();
          const token = settings.cloudSync?.token?.trim() || '';
          if (!endpoint) {
            throw new Error('Missing cloud endpoint URL');
          }
          noteJson = await invoke('restore_note_from_cloud', { endpoint, token, noteId });
        } else {
          const dirPath = settings.localSync?.dir?.trim();
          if (!dirPath) {
            throw new Error('Missing local sync folder path');
          }
          noteJson = await invoke('restore_note_from_sync', { dirPath, noteId, source });
        }

        const restored = JSON.parse(noteJson);
        const idx = notes.findIndex(n => n.id === noteId);

        if (idx >= 0) {
          const wasOpen = notes[idx].isOpen;
          notes[idx] = { ...restored, isOpen: wasOpen };
        } else {
          restored.isOpen = false;
          notes.push(restored);
        }

        persistNotes();
        loadAllNotes(false);
        await scanRestorableNotes();

        if (window.__TAURI__) {
          window.__TAURI__.event.emit('notes-changed');
        }

        setRestoreStatus(`Status: Restored "${restored.title || 'Untitled Note'}" - ${new Date().toLocaleTimeString()}`, '#3cd69e');
      } catch (err) {
        setRestoreStatus(`Status: Error - ${err}`, '#ff4d4d');
        await showCustomAlert(String(err), 'Restore Failed');
      }
    };

    window.syncCloudNow = async function() {
      if (!settings.cloudSync.enabled) return;
      const statusEl = document.getElementById('cloud-sync-status');
      const endpoint = settings.cloudSync.endpoint;
      const token = settings.cloudSync.token;
      
      if (!endpoint) {
        statusEl.textContent = "Status: Error - Missing URL endpoint";
        statusEl.style.color = '#ff4d4d';
        return;
      }
      
      statusEl.textContent = "Status: Syncing...";
      statusEl.style.color = '';
      
      const notesJson = localStorage.getItem('carrotnotes_notes') || '[]';
      
      if (invoke) {
        invoke('sync_notes_to_cloud', { endpoint, token, notesJson })
          .then(() => {
            statusEl.textContent = `Status: Sync success - ${new Date().toLocaleTimeString()}`;
            statusEl.style.color = '#3cd69e';
          })
          .catch(err => {
            statusEl.textContent = `Status: Error - ${err}`;
            statusEl.style.color = '#ff4d4d';
          });
      } else {
        setTimeout(() => {
          statusEl.textContent = `Status: Mock Sync Success (Web Sandbox) - ${new Date().toLocaleTimeString()}`;
          statusEl.style.color = '#3cd69e';
        }, 1000);
      }
    };

    // Custom alert/confirm Dialogs Implementation
    function resetCustomDialogInput() {
      const inputWrap = document.getElementById('custom-dialog-input-wrap');
      const input = document.getElementById('custom-dialog-input');
      const okBtn = document.getElementById('custom-dialog-ok');
      if (inputWrap) inputWrap.classList.remove('show');
      if (input) {
        input.value = '';
        input.oninput = null;
        input.onkeydown = null;
      }
      if (okBtn) {
        okBtn.className = 'btn-dialog-primary';
        okBtn.textContent = 'OK';
        okBtn.disabled = false;
      }
    }

    window.showCustomAlert = function(message, title = "Alert") {
      return new Promise((resolve) => {
        const overlay = document.getElementById('custom-dialog-overlay');
        const titleEl = document.getElementById('custom-dialog-title');
        const msgEl = document.getElementById('custom-dialog-message');
        const okBtn = document.getElementById('custom-dialog-ok');
        const cancelBtn = document.getElementById('custom-dialog-cancel');
        
        resetCustomDialogInput();
        titleEl.innerText = title;
        msgEl.innerText = message;
        cancelBtn.style.display = 'none';
        overlay.style.display = 'flex';
        
        const onOk = () => {
          okBtn.removeEventListener('click', onOk);
          overlay.style.display = 'none';
          resetCustomDialogInput();
          resolve();
        };
        
        okBtn.addEventListener('click', onOk);
      });
    };

    window.showCustomConfirm = function(message, title = "Confirm") {
      return new Promise((resolve) => {
        const overlay = document.getElementById('custom-dialog-overlay');
        const titleEl = document.getElementById('custom-dialog-title');
        const msgEl = document.getElementById('custom-dialog-message');
        const okBtn = document.getElementById('custom-dialog-ok');
        const cancelBtn = document.getElementById('custom-dialog-cancel');
        
        resetCustomDialogInput();
        titleEl.innerText = title;
        msgEl.innerText = message;
        cancelBtn.style.display = 'inline-block';
        overlay.style.display = 'flex';
        
        const onOk = () => {
          okBtn.removeEventListener('click', onOk);
          cancelBtn.removeEventListener('click', onCancel);
          overlay.style.display = 'none';
          resetCustomDialogInput();
          resolve(true);
        };
        
        const onCancel = () => {
          okBtn.removeEventListener('click', onOk);
          cancelBtn.removeEventListener('click', onCancel);
          overlay.style.display = 'none';
          resetCustomDialogInput();
          resolve(false);
        };
        
        okBtn.addEventListener('click', onOk);
        cancelBtn.addEventListener('click', onCancel);
      });
    };

    window.showTypedConfirm = function(message, title, requiredWord) {
      return new Promise((resolve) => {
        const overlay = document.getElementById('custom-dialog-overlay');
        const titleEl = document.getElementById('custom-dialog-title');
        const msgEl = document.getElementById('custom-dialog-message');
        const okBtn = document.getElementById('custom-dialog-ok');
        const cancelBtn = document.getElementById('custom-dialog-cancel');
        const inputWrap = document.getElementById('custom-dialog-input-wrap');
        const inputLabel = document.getElementById('custom-dialog-input-label');
        const input = document.getElementById('custom-dialog-input');

        resetCustomDialogInput();
        titleEl.innerText = title;
        msgEl.innerText = message;
        cancelBtn.style.display = 'inline-block';
        inputWrap.classList.add('show');
        inputLabel.textContent = `Type "${requiredWord}" to confirm`;
        input.value = '';
        okBtn.textContent = 'Confirm';
        okBtn.className = 'btn-dialog-danger';
        okBtn.disabled = true;
        overlay.style.display = 'flex';

        const cleanup = () => {
          okBtn.removeEventListener('click', onOk);
          cancelBtn.removeEventListener('click', onCancel);
          input.removeEventListener('input', checkInput);
          input.removeEventListener('keydown', onKeydown);
          overlay.style.display = 'none';
          resetCustomDialogInput();
        };

        const checkInput = () => {
          okBtn.disabled = input.value.trim() !== requiredWord;
        };

        const onKeydown = (e) => {
          if (e.key === 'Enter' && !okBtn.disabled) {
            e.preventDefault();
            onOk();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            onCancel();
          }
        };

        const onOk = () => {
          if (input.value.trim() !== requiredWord) return;
          cleanup();
          resolve(true);
        };

        const onCancel = () => {
          cleanup();
          resolve(false);
        };

        input.addEventListener('input', checkInput);
        input.addEventListener('keydown', onKeydown);
        okBtn.addEventListener('click', onOk);
        cancelBtn.addEventListener('click', onCancel);
        setTimeout(() => input.focus(), 0);
      });
    };

    function setDangerZoneStatus(message, color = '') {
      const statusEl = document.getElementById('danger-zone-status');
      if (!statusEl) return;
      statusEl.textContent = message;
      statusEl.style.color = color;
    }

    window.runSyncDangerAction = async function(source, action) {
      const isTrash = action === 'trash';
      const sourceLabel = source === 'local' ? 'local folder sync' : 'cloud server sync';
      const actionTitle = isTrash ? 'Clean Trash' : 'Remove Everything';
      const confirmWord = isTrash ? 'clean' : 'delete';

      const firstMessage = isTrash
        ? `This will permanently delete all archived notes in the ${sourceLabel} deleted folder. This cannot be undone.`
        : `This will permanently delete all synced notes from the ${sourceLabel} source, including backups and deleted archives. This cannot be undone.`;

      if (!await showCustomConfirm(firstMessage, actionTitle)) return;

      const typedMessage = isTrash
        ? `You are about to clean the trash for ${sourceLabel}. Type "${confirmWord}" below to proceed.`
        : `You are about to remove everything synced for ${sourceLabel}. Type "${confirmWord}" below to proceed.`;

      if (!await showTypedConfirm(typedMessage, 'Final Confirmation', confirmWord)) return;

      if (!invoke) {
        await showCustomAlert('This action is only available in the desktop app.', 'Unavailable');
        return;
      }

      setDangerZoneStatus('Status: Working...');

      try {
        let resultMessage = 'Action completed';

        if (source === 'local') {
          const dirPath = settings.localSync?.dir?.trim();
          if (!dirPath) throw new Error('Missing local sync folder path');

          if (isTrash) {
            resultMessage = await invoke('clean_local_sync_trash', { dirPath });
          } else {
            resultMessage = await invoke('remove_all_local_sync', { dirPath });
          }
        } else {
          const endpoint = settings.cloudSync?.endpoint?.trim();
          const token = settings.cloudSync?.token?.trim() || '';
          if (!endpoint) throw new Error('Missing cloud endpoint URL');

          if (isTrash) {
            resultMessage = await invoke('clean_cloud_sync_trash', { endpoint, token });
          } else {
            resultMessage = await invoke('remove_all_cloud_sync', { endpoint, token });
          }
        }

        setDangerZoneStatus(`Status: ${resultMessage} - ${new Date().toLocaleTimeString()}`, '#3cd69e');

        const restoreList = document.getElementById('restore-list');
        if (restoreList && restoreList.innerHTML.trim()) {
          await scanRestorableNotes();
        }
      } catch (err) {
        setDangerZoneStatus(`Status: Error - ${err}`, '#ff4d4d');
        await showCustomAlert(String(err), 'Action Failed');
      }
    };

    // Custom Number Input Spinner functions
    window.stepUp = function(id) {
      const input = document.getElementById(id);
      if (input && !input.disabled) {
        input.stepUp();
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    };
    
    window.stepDown = function(id) {
      const input = document.getElementById(id);
      if (input && !input.disabled) {
        input.stepDown();
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    };

    function initCustomSelects() {
      const selects = document.querySelectorAll('.form-group select');
      selects.forEach(select => {
        let container = select.nextElementSibling;
        if (!container || !container.classList.contains('custom-select-container')) {
          container = document.createElement('div');
          container.className = 'custom-select-container';
          select.parentNode.insertBefore(container, select.nextSibling);
        }
        
        container.innerHTML = '';
        
        const trigger = document.createElement('div');
        trigger.className = 'custom-select-trigger';
        
        const selectedOpt = select.options[select.selectedIndex];
        trigger.textContent = selectedOpt ? selectedOpt.textContent : '';
        
        const optionsList = document.createElement('div');
        optionsList.className = 'custom-select-options';
        
        Array.from(select.options).forEach(opt => {
          const customOpt = document.createElement('div');
          customOpt.className = 'custom-select-option';
          if (opt.value === select.value) {
            customOpt.classList.add('selected');
          }
          customOpt.textContent = opt.textContent;
          customOpt.setAttribute('data-value', opt.value);
          
          customOpt.addEventListener('click', (e) => {
            e.stopPropagation();
            if (select.disabled) return;
            select.value = opt.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            optionsList.classList.remove('show');
            container.classList.remove('active');
          });
          
          optionsList.appendChild(customOpt);
        });
        
        trigger.addEventListener('click', (e) => {
          e.stopPropagation();
          if (select.disabled) return;
          
          const isShow = optionsList.classList.contains('show');
          
          document.querySelectorAll('.custom-select-options').forEach(el => {
            if (el !== optionsList) el.classList.remove('show');
          });
          document.querySelectorAll('.custom-select-container').forEach(el => {
            if (el !== container) el.classList.remove('active');
          });
          
          if (!isShow) {
            optionsList.classList.add('show');
            container.classList.add('active');
          } else {
            optionsList.classList.remove('show');
            container.classList.remove('active');
          }
        });
        
        container.appendChild(trigger);
        container.appendChild(optionsList);
        
        if (select.disabled) {
          container.classList.add('disabled');
        } else {
          container.classList.remove('disabled');
        }
      });
    }
    
    document.addEventListener('click', () => {
      document.querySelectorAll('.custom-select-options.show').forEach(el => el.classList.remove('show'));
      document.querySelectorAll('.custom-select-container.active').forEach(el => el.classList.remove('active'));
    });
    
    window.initCustomSelects = initCustomSelects;
