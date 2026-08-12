
        (() => {
            const root = document.documentElement;
            const themeToggle = document.getElementById('theme-toggle');
            const sidebar = document.getElementById('app-sidebar');
            const menuButton = document.getElementById('mobile-menu-button');
            const sidebarOverlay = document.getElementById('sidebar-overlay');
            const themeStorageKey = 'PROF_REQUERIMENTOS_THEME';

            const updateThemeLabel = () => {
                if (!themeToggle) return;
                const nextTheme = root.dataset.theme === 'dark' ? 'claro' : 'escuro';
                themeToggle.setAttribute('aria-label', `Ativar tema ${nextTheme}`);
                themeToggle.setAttribute('title', `Ativar tema ${nextTheme}`);
            };

            const closeSidebar = () => {
                if (!sidebar || !menuButton) return;
                sidebar.classList.remove('is-open');
                menuButton.setAttribute('aria-expanded', 'false');
                menuButton.setAttribute('aria-label', 'Abrir menu lateral');
            };

            themeToggle?.addEventListener('click', () => {
                const nextTheme = root.dataset.theme === 'dark' ? 'light' : 'dark';
                root.dataset.theme = nextTheme;
                try { localStorage.setItem(themeStorageKey, nextTheme); } catch {}
                updateThemeLabel();
            });

            menuButton?.addEventListener('click', () => {
                if (!sidebar) return;
                const isOpen = sidebar.classList.toggle('is-open');
                menuButton.setAttribute('aria-expanded', String(isOpen));
                menuButton.setAttribute('aria-label', isOpen ? 'Fechar menu lateral' : 'Abrir menu lateral');
            });

            sidebarOverlay?.addEventListener('click', closeSidebar);
            document.addEventListener('keydown', (event) => {
                if (event.key === 'Escape') closeSidebar();
            });
            window.addEventListener('resize', () => {
                if (window.innerWidth >= 768) closeSidebar();
            });

            const getFieldLabel = (field) => {
                const optionLabel = field.tagName === 'SELECT'
                    ? field.querySelector('option')?.textContent
                    : '';
                const rawLabel = field.dataset.fieldLabel
                    || field.getAttribute('placeholder')
                    || field.getAttribute('aria-label')
                    || optionLabel
                    || field.getAttribute('name')
                    || 'Campo';

                return rawLabel
                    .split('—')[0]
                    .replace(/_/g, ' ')
                    .replace(/\s*\([^)]*\)\s*$/, '')
                    .trim();
            };

            document.querySelectorAll('.form-container .input-field').forEach((field, index) => {
                if (field.type === 'hidden' || field.closest('.field-group')) return;

                const wrapper = document.createElement('div');
                const label = document.createElement('label');
                const fieldId = field.id || `request-field-${index + 1}`;

                field.id = fieldId;
                wrapper.className = 'field-group';
                label.className = 'field-label';
                label.htmlFor = fieldId;
                label.textContent = getFieldLabel(field);

                field.parentNode.insertBefore(wrapper, field);
                wrapper.append(label, field);
            });

            const pageTitle = document.getElementById('request-page-title');
            const topbarTitle = document.getElementById('request-topbar-title');
            document.querySelectorAll('.dropdown > li').forEach((item) => {
                item.addEventListener('click', () => {
                    const rawTitle = item.querySelector('a')?.textContent?.trim();
                    if (!rawTitle) return;
                    const formattedTitle = rawTitle
                        .toLocaleLowerCase('pt-BR')
                        .split(' ')
                        .map((word) => word ? word.charAt(0).toLocaleUpperCase('pt-BR') + word.slice(1) : word)
                        .join(' ');

                    if (pageTitle) pageTitle.textContent = formattedTitle;
                    if (topbarTitle) topbarTitle.textContent = formattedTitle;
                });
            });

            const tagForm = document.getElementById('attlist_postagem');
            const tagValue = document.getElementById('attlist_tag');
            const tagCharacters = Array.from(document.querySelectorAll('.tag-character-input'));

            const syncTagValue = () => {
                if (!tagValue) return '';
                const value = tagCharacters.map((field) => field.value).join('');
                tagValue.value = value;
                tagValue.dispatchEvent(new Event('input', { bubbles: true }));
                tagValue.classList.toggle('invalid', Array.from(value).length > 0 && Array.from(value).length !== 3);
                return value;
            };

            const fillTagFrom = (startIndex, rawValue) => {
                const characters = Array.from(rawValue.replace(/\s/g, '')).slice(0, 3 - startIndex);
                characters.forEach((character, offset) => {
                    tagCharacters[startIndex + offset].value = character;
                });
                syncTagValue();
                const nextIndex = Math.min(startIndex + characters.length, tagCharacters.length - 1);
                tagCharacters[nextIndex]?.focus();
                tagCharacters[nextIndex]?.select();
            };

            tagCharacters.forEach((field, index) => {
                field.addEventListener('input', () => {
                    const value = field.value.replace(/\s/g, '');
                    field.value = '';
                    if (value) fillTagFrom(index, value);
                    else syncTagValue();

                    if (value && index < tagCharacters.length - 1) {
                        tagCharacters[index + 1].focus();
                        tagCharacters[index + 1].select();
                    }
                });

                field.addEventListener('paste', (event) => {
                    const pastedValue = event.clipboardData?.getData('text') || '';
                    if (!pastedValue) return;
                    event.preventDefault();
                    fillTagFrom(index, pastedValue);
                });

                field.addEventListener('keydown', (event) => {
                    if (event.key === 'Backspace' && !field.value && index > 0) {
                        tagCharacters[index - 1].value = '';
                        tagCharacters[index - 1].focus();
                        syncTagValue();
                    } else if (event.key === 'ArrowLeft' && index > 0) {
                        event.preventDefault();
                        tagCharacters[index - 1].focus();
                    } else if (event.key === 'ArrowRight' && index < tagCharacters.length - 1) {
                        event.preventDefault();
                        tagCharacters[index + 1].focus();
                    }
                });
            });

            tagForm?.addEventListener('submit', () => {
                const value = syncTagValue();
                const isComplete = Array.from(value).length === 3;
                tagValue?.classList.toggle('invalid', !isComplete);
                if (!isComplete) {
                    (tagCharacters.find((field) => !field.value) || tagCharacters[0])?.focus();
                }
            }, true);

            const toastOverlay = document.getElementById('customModalOverlay');
            const toastContent = document.getElementById('customModal');
            const toastTitle = document.getElementById('modalTitle');
            const toastText = document.getElementById('modalText');
            const toastIcon = document.querySelector('.modal-icon i');
            const toastClose = document.getElementById('modalCloseBtn');
            let toastVisible = false;
            let toastExitTimer = null;
            let nativeAlertTimer = null;

            /* O overlay legado fica desativado; o toast independente é inicializado após o script principal. */
            if (false && toastOverlay && toastContent) {
                const toastObserver = new MutationObserver(() => {
                    const isOpen = toastOverlay.classList.contains('show');

                    if (isOpen) {
                        clearTimeout(toastExitTimer);
                        toastOverlay.classList.remove('is-exiting');
                        toastVisible = true;

                        if (/atualiza[cç][aã]o enviada/i.test(toastTitle?.textContent || '')) {
                            tagCharacters.forEach((field) => { field.value = ''; });
                            syncTagValue();
                        }
                        return;
                    }

                    if (!toastVisible || toastOverlay.classList.contains('is-exiting')) return;
                    toastVisible = false;
                    toastOverlay.classList.add('is-exiting');
                    toastExitTimer = setTimeout(() => {
                        toastOverlay.classList.remove('is-exiting');
                    }, 660);
                });

                toastObserver.observe(toastOverlay, { attributes: true, attributeFilter: ['class'] });

                window.alert = (message) => {
                    clearTimeout(nativeAlertTimer);
                    if (toastTitle) toastTitle.textContent = 'Atenção';
                    if (toastText) toastText.textContent = String(message ?? '');
                    if (toastIcon) {
                        toastIcon.className = 'fas fa-exclamation-triangle';
                        toastIcon.style.color = 'var(--warning)';
                    }
                    if (toastClose) toastClose.style.display = 'none';
                    toastOverlay.classList.add('show');
                    nativeAlertTimer = setTimeout(() => toastOverlay.classList.remove('show'), 5200);
                };
            }

            updateThemeLabel();
        })();
