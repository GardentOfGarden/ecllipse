const express = require('express');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Временное хранилище данных (в реальном приложении используйте базу данных)
let users = {};
let applications = {};
let licenseKeys = {};

// Генерация уникального ID
function generateId() {
    return crypto.randomBytes(8).toString('hex');
}

// Генерация лицензионного ключа
function generateLicenseKey(prefix = 'ECL') {
    const segments = [
        crypto.randomBytes(2).toString('hex').toUpperCase(),
        crypto.randomBytes(2).toString('hex').toUpperCase(),
        crypto.randomBytes(2).toString('hex').toUpperCase(),
        crypto.randomBytes(2).toString('hex').toUpperCase()
    ];
    return `${prefix}-${segments.join('-')}`;
}

// API Routes

// Аутентификация
app.post('/api/auth/register', (req, res) => {
    const { username, email, password } = req.body;
    
    if (users[email]) {
        return res.status(400).json({ 
            success: false, 
            message: 'Пользователь с таким email уже существует' 
        });
    }
    
    const userId = generateId();
    users[email] = {
        id: userId,
        username,
        email,
        password, // В реальном приложении хэшируйте пароль!
        createdAt: new Date().toISOString()
    };
    
    res.json({ 
        success: true, 
        message: 'Регистрация успешна',
        user: { id: userId, username, email }
    });
});

app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    const user = users[email];
    
    if (!user || user.password !== password) {
        return res.status(401).json({ 
            success: false, 
            message: 'Неверный email или пароль' 
        });
    }
    
    res.json({ 
        success: true, 
        message: 'Вход выполнен успешно',
        user: { id: user.id, username: user.username, email: user.email }
    });
});

// Приложения
app.get('/api/apps', (req, res) => {
    const userApps = Object.values(applications).filter(app => 
        app.ownerId === req.query.userId
    );
    
    res.json({ success: true, apps: userApps });
});

app.post('/api/apps', (req, res) => {
    const { name, version, language, ownerId } = req.body;
    
    const appId = generateId();
    applications[appId] = {
        id: appId,
        name,
        version,
        language,
        ownerId,
        secret: crypto.randomBytes(32).toString('hex'),
        createdAt: new Date().toISOString(),
        status: 'active'
    };
    
    res.json({ 
        success: true, 
        message: 'Приложение создано',
        app: applications[appId]
    });
});

app.put('/api/apps/:id', (req, res) => {
    const appId = req.params.id;
    const updates = req.body;
    
    if (!applications[appId]) {
        return res.status(404).json({ 
            success: false, 
            message: 'Приложение не найдено' 
        });
    }
    
    applications[appId] = { ...applications[appId], ...updates };
    
    res.json({ 
        success: true, 
        message: 'Приложение обновлено',
        app: applications[appId]
    });
});

app.delete('/api/apps/:id', (req, res) => {
    const appId = req.params.id;
    
    if (!applications[appId]) {
        return res.status(404).json({ 
            success: false, 
            message: 'Приложение не найдено' 
        });
    }
    
    delete applications[appId];
    
    // Удаляем все ключи этого приложения
    Object.keys(licenseKeys).forEach(key => {
        if (licenseKeys[key].appId === appId) {
            delete licenseKeys[key];
        }
    });
    
    res.json({ success: true, message: 'Приложение удалено' });
});

// Ключи
app.get('/api/keys', (req, res) => {
    const { appId, status } = req.query;
    let keys = Object.values(licenseKeys);
    
    if (appId) {
        keys = keys.filter(key => key.appId === appId);
    }
    
    if (status) {
        keys = keys.filter(key => key.status === status);
    }
    
    res.json({ success: true, keys });
});

app.post('/api/keys/generate', (req, res) => {
    const { appId, count, expiryDays, prefix } = req.body;
    
    if (!applications[appId]) {
        return res.status(404).json({ 
            success: false, 
            message: 'Приложение не найдено' 
        });
    }
    
    const generatedKeys = [];
    
    for (let i = 0; i < count; i++) {
        const key = generateLicenseKey(prefix);
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + expiryDays);
        
        licenseKeys[key] = {
            key,
            appId,
            status: 'active',
            createdAt: new Date().toISOString(),
            expiresAt: expiryDate.toISOString(),
            usedAt: null,
            hwid: null
        };
        
        generatedKeys.push(licenseKeys[key]);
    }
    
    res.json({ 
        success: true, 
        message: `Сгенерировано ${count} ключей`,
        keys: generatedKeys
    });
});

app.delete('/api/keys/:key', (req, res) => {
    const key = req.params.key;
    
    if (!licenseKeys[key]) {
        return res.status(404).json({ 
            success: false, 
            message: 'Ключ не найден' 
        });
    }
    
    delete licenseKeys[key];
    
    res.json({ success: true, message: 'Ключ удален' });
});

// Валидация ключа (для использования в приложениях)
app.post('/api/validate', (req, res) => {
    const { key, hwid, appSecret } = req.body;
    
    if (!licenseKeys[key]) {
        return res.json({ 
            success: false, 
            message: 'Неверный лицензионный ключ' 
        });
    }
    
    const license = licenseKeys[key];
    
    // Проверка секрета приложения
    const app = Object.values(applications).find(a => a.secret === appSecret);
    if (!app || app.id !== license.appId) {
        return res.json({ 
            success: false, 
            message: 'Неверный секрет приложения' 
        });
    }
    
    // Проверка срока действия
    if (new Date(license.expiresAt) < new Date()) {
        return res.json({ 
            success: false, 
            message: 'Срок действия ключа истек' 
        });
    }
    
    // Проверка статуса
    if (license.status !== 'active') {
        return res.json({ 
            success: false, 
            message: 'Ключ не активен' 
        });
    }
    
    // Проверка HWID
    if (license.hwid && license.hwid !== hwid) {
        return res.json({ 
            success: false, 
            message: 'Ключ уже используется на другом устройстве' 
        });
    }
    
    // Активация ключа (при первом использовании)
    if (!license.hwid && hwid) {
        license.hwid = hwid;
        license.usedAt = new Date().toISOString();
    }
    
    res.json({ 
        success: true, 
        message: 'Ключ валиден',
        data: {
            expiresAt: license.expiresAt,
            createdAt: license.createdAt
        }
    });
});

// Статистика
app.get('/api/stats/:userId', (req, res) => {
    const userId = req.params.userId;
    const userApps = Object.values(applications).filter(app => app.ownerId === userId);
    const appIds = userApps.map(app => app.id);
    const userKeys = Object.values(licenseKeys).filter(key => appIds.includes(key.appId));
    
    const stats = {
        totalSales: userKeys.length,
        activeLicenses: userKeys.filter(key => key.status === 'active').length,
        totalRevenue: userKeys.length * 29.99, // Примерная стоимость
        conversionRate: 86.5,
        activeUsers: userKeys.filter(key => key.hwid).length,
        onlineUsers: Math.floor(Math.random() * 1000) + 7000, // Примерные данные
        healthScore: 90
    };
    
    res.json({ success: true, stats });
});

// Обслуживание статических файлов
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Сервер Eclipse запущен на порту ${PORT}`);
});
