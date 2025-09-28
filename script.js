// Основной JavaScript для Eclipse

document.addEventListener('DOMContentLoaded', function() {
    // Инициализация модальных окон
    initModals();
    
    // Инициализация таблиц
    initTables();
    
    // Инициализация форм
    initForms();
});

// Функции для модальных окон
function initModals() {
    const modals = {
        'addAppBtn': 'addAppModal',
        'generateKeyBtn': 'generateKeyModal',
        'cancelAppBtn': 'addAppModal',
        'cancelKeyBtn': 'generateKeyModal'
    };
    
    for (const [btnId, modalId] of Object.entries(modals)) {
        const btn = document.getElementById(btnId);
        const modal = document.getElementById(modalId);
        
        if (btn && modal) {
            if (btnId.startsWith('cancel')) {
                btn.addEventListener('click', () => closeModal(modal));
            } else {
                btn.addEventListener('click', () => openModal(modal));
            }
        }
    }
    
    // Закрытие модальных окон при клике на крестик
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            closeModal(modal);
        });
    });
    
    // Закрытие модальных окон при клике вне их
    window.addEventListener('click', function(event) {
        document.querySelectorAll('.modal').forEach(modal => {
            if (event.target === modal) {
                closeModal(modal);
            }
        });
    });
}

function openModal(modal) {
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modal) {
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Функции для таблиц
function initTables() {
    // Добавление функциональности копирования ключей
    document.querySelectorAll('.btn-action').forEach(btn => {
        if (btn.textContent === 'Копировать') {
            btn.addEventListener('click', function() {
                const key = this.closest('tr').querySelector('.key-value').textContent;
                copyToClipboard(key);
                
                // Визуальная обратная связь
                const originalText = btn.textContent;
                btn.textContent = 'Скопировано!';
                btn.style.background = '#10b981';
                btn.style.color = 'white';
                
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.style.background = '';
                    btn.style.color = '';
                }, 2000);
            });
        }
    });
}

// Функции для форм
function initForms() {
    // Форма добавления приложения
    const addAppForm = document.getElementById('addAppForm');
    if (addAppForm) {
        addAppForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const appName = document.getElementById('appName').value;
            const appVersion = document.getElementById('appVersion').value;
            const appLanguage = document.getElementById('appLanguage').value;
            
            // Здесь будет код для отправки данных на сервер
            console.log('Добавление приложения:', { appName, appVersion, appLanguage });
            
            // Закрытие модального окна после успешного добавления
            closeModal(document.getElementById('addAppModal'));
            
            // Очистка формы
            addAppForm.reset();
            
            // Показать уведомление об успехе
            showNotification('Приложение успешно добавлено!', 'success');
        });
    }
    
    // Форма генерации ключей
    const generateKeyForm = document.getElementById('generateKeyForm');
    if (generateKeyForm) {
        generateKeyForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const keyApp = document.getElementById('keyApp').value;
            const keyCount = document.getElementById('keyCount').value;
            const keyExpiry = document.getElementById('keyExpiry').value;
            const keyPrefix = document.getElementById('keyPrefix').value;
            
            // Здесь будет код для отправки данных на сервер
            console.log('Генерация ключей:', { keyApp, keyCount, keyExpiry, keyPrefix });
            
            // Закрытие модального окна после успешной генерации
            closeModal(document.getElementById('generateKeyModal'));
            
            // Очистка формы
            generateKeyForm.reset();
            
            // Показать уведомление об успехе
            showNotification(`Сгенерировано ${keyCount} ключей!`, 'success');
        });
    }
}

// Вспомогательные функции
function copyToClipboard(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
}

function showNotification(message, type = 'info') {
    // Создание элемента уведомления
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Стилизация уведомления
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        transition: transform 0.3s ease;
    `;
    
    if (type === 'success') {
        notification.style.background = '#10b981';
    } else if (type === 'error') {
        notification.style.background = '#ef4444';
    } else {
        notification.style.background = '#6366f1';
    }
    
    // Добавление уведомления на страницу
    document.body.appendChild(notification);
    
    // Автоматическое удаление уведомления через 3 секунды
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// API функции для взаимодействия с сервером
const EclipseAPI = {
    baseURL: '/api',
    
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };
        
        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }
        
        try {
            const response = await fetch(url, config);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Ошибка API');
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            showNotification(error.message, 'error');
            throw error;
        }
    },
    
    // Методы для приложений
    async getApps() {
        return this.request('/apps');
    },
    
    async createApp(appData) {
        return this.request('/apps', {
            method: 'POST',
            body: appData
        });
    },
    
    async updateApp(appId, appData) {
        return this.request(`/apps/${appId}`, {
            method: 'PUT',
            body: appData
        });
    },
    
    async deleteApp(appId) {
        return this.request(`/apps/${appId}`, {
            method: 'DELETE'
        });
    },
    
    // Методы для ключей
    async getKeys(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/keys?${query}`);
    },
    
    async generateKeys(keyData) {
        return this.request('/keys/generate', {
            method: 'POST',
            body: keyData
        });
    },
    
    async deleteKey(keyId) {
        return this.request(`/keys/${keyId}`, {
            method: 'DELETE'
        });
    },
    
    // Методы для аутентификации
    async login(credentials) {
        return this.request('/auth/login', {
            method: 'POST',
            body: credentials
        });
    },
    
    async register(userData) {
        return this.request('/auth/register', {
            method: 'POST',
            body: userData
        });
    },
    
    async logout() {
        return this.request('/auth/logout');
    }
};
