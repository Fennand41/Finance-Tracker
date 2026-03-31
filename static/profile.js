document.addEventListener("DOMContentLoaded", function() {
    // 1. Инициализация всех обработчиков
    initEventListeners();

    // 2. Загрузка данных (цели, подписки, долги)
    loadData();

    // 3. Обработка аватара
    setupAvatarUpload();
});

// ===== ОСНОВНЫЕ ФУНКЦИИ =====

function initEventListeners() {
    // Кнопки показа форм
    document.getElementById('add-goal-btn')?.addEventListener('click', showAddGoalForm);
    document.getElementById('add-subscription-btn')?.addEventListener('click', showAddSubscriptionForm);
    document.getElementById('add-debt-btn')?.addEventListener('click', showAddDebtForm);

    // Кнопки отмены
    document.getElementById('cancel-goal-btn')?.addEventListener('click', hideAddGoalForm);
    document.getElementById('cancel-subscription-btn')?.addEventListener('click', hideAddSubscriptionForm);
    document.getElementById('cancel-debt-btn')?.addEventListener('click', hideAddDebtForm);

    // Кнопки сохранения
    document.getElementById('save-goal-btn')?.addEventListener('click', saveGoal);
    document.getElementById('save-subscription-btn')?.addEventListener('click', saveSubscription);
    document.getElementById('save-debt-btn')?.addEventListener('click', saveDebt);

    // Делегирование событий
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('add-funds-btn')) addFundsToGoal(e);
        if (e.target.classList.contains('delete-goal-btn')) deleteGoal(e);
        if (e.target.classList.contains('mark-paid-btn')) markDebtAsPaid(e);
        if (e.target.classList.contains('delete-btn')) deleteSubscription(e);
        if (e.target.classList.contains('slider') || e.target.classList.contains('switch')) toggleSubscriptionStatus(e);
    });
        // Обработчики для переключения вкладок
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            // Удаляем класс active у всех кнопок
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

            // Добавляем класс active текущей кнопке
            this.classList.add('active');

            // Получаем имя вкладки из data-атрибута
            const tabName = this.dataset.tab;

            // Скрываем все списки
            document.getElementById('subscriptions-list').style.display = 'none';
            document.getElementById('debts-list').style.display = 'none';

            // Показываем нужный список
            document.getElementById(`${tabName}-list`).style.display = 'block';
        });
    });
        document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            // Удаляем класс active у всех кнопок
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

            // Добавляем класс active текущей кнопке
            this.classList.add('active');

            // Получаем имя вкладки из data-атрибута
            const tabName = this.dataset.tab;

            // Скрываем все списки
            document.getElementById('subscriptions-list').style.display = 'none';
            document.getElementById('debts-list').style.display = 'none';

            // Показываем нужный список и загружаем данные
            if (tabName === 'subscriptions') {
                document.getElementById('subscriptions-list').style.display = 'block';
                loadSubscriptions();
            } else {
                document.getElementById('debts-list').style.display = 'block';
                loadDebts();
            }
        });
    });
}

function setupAvatarUpload() {
    const avatarContainer = document.getElementById('avatar-container');
    const avatarInput = document.getElementById('avatar-input');
    const avatarImage = document.getElementById('avatar-image');
    const avatarForm = document.getElementById('avatar-form');

    if (!avatarContainer || !avatarInput) return;

    // Клик по аватару
    avatarContainer.addEventListener('click', () => {
        avatarInput.click();
    });

    // При выборе файла
    avatarInput.addEventListener('change', function() {
        if (!this.files || !this.files[0]) return;

        // Превью перед загрузкой
        const reader = new FileReader();
        reader.onload = function(e) {
            avatarImage.src = e.target.result;
        };
        reader.readAsDataURL(this.files[0]);

        // Отправка на сервер
        const formData = new FormData(avatarForm);

        fetch(avatarForm.action, {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (response.ok) {
                showAlert('success', 'Аватар успішно оновлено!');
            } else {
                throw new Error('Помилка сервера');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('error', 'Не вдалося оновити аватар');
        });
    });
}

// ===== ФУНКЦИИ ДЛЯ ЦЕЛЕЙ =====
async function loadGoals() {
    try {
        const response = await fetch("/api/goals", { credentials: 'include' });
        const goals = await response.json();
        renderGoals(goals);
    } catch (error) {
        showAlert('error', 'Не вдалося завантажити цілі');
    }
}

function renderGoals(goals) {
    const goalsList = document.getElementById('goals-list');
    if (!goalsList) {
        console.error('Goals list element not found!');
        return;
    }

    goalsList.innerHTML = goals.map(goal => `
        <div class="goal-item" data-id="${goal.id}">
            <div class="goal-header">
                <h3>${goal.name}</h3>
                <span>${goal.current_amount.toFixed(2)} / ${goal.target_amount.toFixed(2)} грн</span>
            </div>
            <div class="progress-bar">
                <div class="progress" style="width: ${Math.min((goal.current_amount / goal.target_amount) * 100, 100)}%"></div>
            </div>
            <div class="goal-footer">
                <span>Дедлайн: ${goal.deadline || 'Не вказано'}</span>
                <div class="goal-actions">
                    <button class="add-funds-btn" data-id="${goal.id}">Додати кошти</button>
                    <button class="delete-goal-btn" data-id="${goal.id}">
                        <i class="fas fa-trash-alt"></i> Видалити
                    </button>
                </div>
            </div>
        </div>
    `).join('');

    console.log('Goals rendered:', goalsList.innerHTML); // Проверка сгенерированного HTML
}

// ===== ФУНКЦИИ ДЛЯ ПОДПИСОК =====
async function loadSubscriptions() {
    try {
        const response = await fetch("/api/subscriptions", { credentials: 'include' });
        const subscriptions = await response.json();
        renderSubscriptions(subscriptions);
    } catch (error) {
        showAlert('error', 'Не вдалося завантажити підписки');
    }
}

function renderSubscriptions(subs) {
    const list = document.getElementById('subscriptions-list');
    if (!list) return;

    list.innerHTML = subs.map(sub => `
        <div class="subscription-item">
            <div class="subscription-info">
                <h3>${sub.name}</h3>
                <span>${sub.amount.toFixed(2)} грн (${sub.payment_date} число)</span>
            </div>
            <div class="subscription-actions">
                <label class="switch">
                    <input type="checkbox" ${sub.is_active ? 'checked' : ''} data-id="${sub.id}">
                    <span class="slider round"></span>
                </label>
                <button class="delete-btn" data-id="${sub.id}">Видалити</button>
            </div>
        </div>
    `).join('');
}

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====
function showAlert(type, message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    document.body.appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), 3000);
}

// ===== ЗАГРУЗКА ВСЕХ ДАННЫХ =====
function loadData() {
    // Всегда загружаем цели
    loadGoals();

    // Загружаем данные для активной вкладки
    const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab || 'subscriptions';

    if (activeTab === 'subscriptions') {
        loadSubscriptions();
    } else {
        loadDebts();
    }
}

// ===== Функции показа/скрытия форм =====
function showAddGoalForm(e) {
    e.preventDefault();
    document.getElementById('add-goal-form').style.display = 'block';
    resetForm('add-goal-form');
}

function showAddSubscriptionForm(e) {
    e.preventDefault();
    document.getElementById('add-subscription-form').style.display = 'block';
    document.getElementById('add-debt-form').style.display = 'none';
    resetForm('add-subscription-form');
}

function showAddDebtForm(e) {
    e.preventDefault();
    document.getElementById('add-debt-form').style.display = 'block';
    document.getElementById('add-subscription-form').style.display = 'none';
    resetForm('add-debt-form');
}

function hideAddGoalForm(e) {
    e.preventDefault();
    document.getElementById('add-goal-form').style.display = 'none';
}

function hideAddSubscriptionForm(e) {
    e.preventDefault();
    document.getElementById('add-subscription-form').style.display = 'none';
}

function hideAddDebtForm(e) {
    e.preventDefault();
    document.getElementById('add-debt-form').style.display = 'none';
}

function resetForm(formId) {
    const form = document.getElementById(formId);
    if (form) {
        form.reset();
    }
}

// ===== Функции сохранения =====
async function saveGoal(e) {
    e.preventDefault();

    const formData = {
        name: document.getElementById('goal-name').value,
        target_amount: parseFloat(document.getElementById('goal-target').value),
        current_amount: 0, // Начальное значение всегда 0
        deadline: document.getElementById('goal-deadline').value || null
    };

    if (!formData.name || isNaN(formData.target_amount)) {
        showAlert('error', 'Будь ласка, заповніть обов\'язкові поля коректно');
        return;
    }

    try {
        const response = await fetch("/api/goals", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(formData),
            credentials: 'include'
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Помилка сервера');
        }

        const data = await response.json();
        showAlert('success', 'Ціль успішно додана!');
        hideAddGoalForm(e);
        loadGoals();

        // Очищаем форму
        document.getElementById('goal-name').value = '';
        document.getElementById('goal-target').value = '';
        document.getElementById('goal-deadline').value = '';
    } catch (error) {
        console.error('Помилка збереження цілі:', error);
        showAlert('error', error.message || 'Помилка збереження цілі');
    }
}

async function saveSubscription(e) {
    e.preventDefault();

    const formData = {
        name: document.getElementById('subscription-name').value,
        amount: parseFloat(document.getElementById('subscription-amount').value),
        payment_date: parseInt(document.getElementById('subscription-day').value)
    };

    if (!formData.name || isNaN(formData.amount) || isNaN(formData.payment_date)) {
        showAlert('error', 'Будь ласка, заповніть обов\'язкові поля');
        return;
    }

    try {
        const response = await fetch("/api/subscriptions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(formData),
            credentials: 'include'
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Помилка сервера');
        }

        const data = await response.json();
        showAlert('success', 'Підписка успішно додана!');
        hideAddSubscriptionForm(e);
        loadSubscriptions();
    } catch (error) {
        console.error('Помилка збереження підписки:', error);
        showAlert('error', error.message || 'Помилка збереження підписки');
    }
}

async function saveDebt(e) {
    e.preventDefault();

    const formData = {
        name: document.getElementById('debt-name').value.trim(),
        amount: parseFloat(document.getElementById('debt-amount').value),
        is_owed: document.getElementById('debt-type').value === 'owed',
        due_date: document.getElementById('debt-due-date').value || null
    };

    // Валидация
    if (!formData.name || isNaN(formData.amount) || formData.amount <= 0) {
        showAlert('error', 'Будь ласка, введіть коректні дані (назва та сума більше 0)');
        return;
    }

    try {
        const response = await fetch("/api/debts", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(formData),
            credentials: 'include'
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Помилка сервера при збереженні боргу');
        }

        const data = await response.json();
        showAlert('success', 'Борг успішно додано!');
        hideAddDebtForm(e);
        loadDebts(); // Перезагружаем список долгов

        // Очищаем форму
        document.getElementById('debt-name').value = '';
        document.getElementById('debt-amount').value = '';
        document.getElementById('debt-due-date').value = '';
    } catch (error) {
        console.error('Помилка збереження боргу:', error);
        showAlert('error', error.message || 'Помилка збереження боргу');
    }
}

// ===== Функции для работы с целями =====
async function addFundsToGoal(e) {
    const goalId = e.target.dataset.id;
    const amount = prompt("Введіть суму для додавання:");

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        showAlert('error', 'Будь ласка, введіть коректну суму');
        return;
    }

    try {
        const response = await fetch(`/api/goals/${goalId}/add`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ amount: parseFloat(amount) }),
            credentials: 'include'
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Помилка сервера');
        }

        const data = await response.json();
        showAlert('success', 'Кошти успішно додані!');
        loadGoals();
    } catch (error) {
        console.error('Помилка додавання коштів:', error);
        showAlert('error', error.message || 'Помилка додавання коштів');
    }
}

async function deleteGoal(e) {
    e.stopPropagation();
    const goalId = e.target.dataset.id;

    if (!confirm('Ви впевнені, що хочете видалити цю ціль? Цю дію неможливо скасувати.')) {
        return;
    }

    try {
        const response = await fetch(`/api/goals/${goalId}`, {
            method: "DELETE",
            credentials: 'include'
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Помилка сервера');
        }

        showAlert('success', 'Ціль успішно видалена!');
        e.target.closest('.goal-item').remove();
    } catch (error) {
        console.error('Помилка видалення цілі:', error);
        showAlert('error', error.message || 'Помилка видалення цілі');
    }
}

// ===== Функции для работы с подписками =====
async function deleteSubscription(e) {
    e.stopPropagation(); // Предотвращаем всплытие события
    const subId = e.target.dataset.id;

    if (!confirm('Ви впевнені, що хочете видалити цю підписку?')) return;

    try {
        const response = await fetch(`/api/subscriptions/${subId}`, {
            method: "DELETE",
            credentials: 'include'
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Помилка сервера');
        }

        showAlert('success', 'Підписка успішно видалена!');
        loadSubscriptions(); // Перезагружаем список подписок
    } catch (error) {
        console.error('Помилка видалення підписки:', error);
        showAlert('error', error.message || 'Помилка видалення підписки');
    }
}

async function toggleSubscriptionStatus(e) {
    const checkbox = e.target.closest('.switch').querySelector('input[type="checkbox"]');
    const subId = checkbox.dataset.id;
    const isActive = checkbox.checked;

    try {
        const response = await fetch(`/api/subscriptions/${subId}/toggle`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ is_active: isActive }),
            credentials: 'include'
        });

        if (!response.ok) {
            // Откатываем изменение, если сервер вернул ошибку
            checkbox.checked = !isActive;
            const errorData = await response.json();
            throw new Error(errorData.error || 'Помилка сервера');
        }

        showAlert('success', 'Статус підписки оновлено!');
    } catch (error) {
        console.error('Помилка зміни статусу підписки:', error);
        showAlert('error', error.message || 'Помилка зміни статусу підписки');
    }
}

// ===== Функции для работы с долгами =====
async function markDebtAsPaid(e) {
    const debtId = e.target.dataset.id;
    if (!confirm('Ви впевнені, що хочете позначити цей борг як сплачений?')) return;

    try {
        const response = await fetch(`/api/debts/${debtId}/mark_paid`, {
            method: "POST",
            credentials: 'include'
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Помилка сервера');
        }

        showAlert('success', 'Борг успішно позначено як сплачений!');
        loadDebts();
    } catch (error) {
        console.error('Помилка оновлення боргу:', error);
        showAlert('error', error.message || 'Помилка оновлення боргу');
    }
}

// ===== Вспомогательные функции =====
function showAlert(type, message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;

    document.body.appendChild(alertDiv);

    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}

// ===== Функции загрузки данных =====
async function loadGoals() {
    try {
        console.log('Loading goals...'); // Логирование
        const response = await fetch("/api/goals", {
            credentials: 'include',
            headers: {
                'Cache-Control': 'no-cache'
            }
        });

        console.log('Goals response:', response); // Логирование ответа

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const goals = await response.json();
        console.log('Goals data:', goals); // Логирование данных
        renderGoals(goals);
    } catch (error) {
        console.error("Error loading goals:", error);
        showAlert('error', 'Не вдалося завантажити цілі');
    }
}

async function loadSubscriptions() {
    try {
        const response = await fetch("/api/subscriptions", { credentials: 'include' });

        if (!response.ok) {
            throw new Error('Помилка завантаження підписок');
        }

        const subscriptions = await response.json();
        renderSubscriptions(subscriptions);
    } catch (error) {
        console.error("Помилка завантаження підписок:", error);
        showAlert('error', 'Не вдалося завантажити підписки');
    }
}

async function loadDebts() {
    try {
        const response = await fetch("/api/debts", {
            credentials: 'include',
            headers: {
                'Cache-Control': 'no-cache' // Чтобы избежать кеширования
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const debts = await response.json();
        console.log('Received debts:', debts); // Для отладки
        renderDebts(debts);
    } catch (error) {
        console.error("Error loading debts:", error);
        showAlert('error', 'Не вдалося завантажити борги');
    }
}

// ===== Функции отрисовки =====
function renderGoals(goals) {
    const goalsList = document.getElementById('goals-list');
    if (!goalsList) return;

    goalsList.innerHTML = '';

    goals.forEach(goal => {
        const progress = goal.target_amount > 0
            ? (goal.current_amount / goal.target_amount) * 100
            : 0;

        const goalElement = document.createElement('div');
        goalElement.className = 'goal-item';
        goalElement.innerHTML = `
            <div class="goal-header">
                <h3>${goal.name}</h3>
                <span>${goal.current_amount.toFixed(2)} / ${goal.target_amount.toFixed(2)} грн</span>
            </div>
            <div class="progress-bar">
                <div class="progress" style="width: ${Math.min(progress, 100)}%"></div>
            </div>
            <div class="goal-footer">
                <span>Дедлайн: ${goal.deadline || 'Не вказано'}</span>
                <button class="add-funds-btn" data-id="${goal.id}">Додати кошти</button>
            </div>
        `;
        goalsList.appendChild(goalElement);
    });
}

function renderSubscriptions(subscriptions) {
    const list = document.getElementById('subscriptions-list');
    if (!list) return;

    list.innerHTML = '';

    subscriptions.forEach(sub => {
        const subElement = document.createElement('div');
        subElement.className = 'subscription-item';
        subElement.innerHTML = `
            <div class="subscription-info">
                <h3>${sub.name}</h3>
                <span>${sub.amount.toFixed(2)} грн (${sub.payment_date} число)</span>
            </div>
            <div class="subscription-actions">
                <label class="switch">
                    <input type="checkbox" ${sub.is_active ? 'checked' : ''} data-id="${sub.id}">
                    <span class="slider round"></span>
                </label>
                <button class="delete-btn" data-id="${sub.id}">Видалити</button>
            </div>
        `;
        list.appendChild(subElement);
    });
}

function renderDebts(debts) {
    const debtsList = document.getElementById('debts-list');
    if (!debtsList) {
        console.error('Element debts-list not found');
        return;
    }

    if (!debts || !Array.isArray(debts)) {
        console.error('Invalid debts data:', debts);
        debtsList.innerHTML = '<p>Помилка завантаження боргів</p>';
        return;
    }

    if (debts.length === 0) {
        debtsList.innerHTML = '<p>У вас немає жодних боргів</p>';
        return;
    }

    debtsList.innerHTML = debts.map(debt => `
        <div class="debt-item ${debt.is_owed ? 'owed' : 'owing'}">
            <div class="debt-info">
                <h3>${debt.name}</h3>
                <span>${debt.amount.toFixed(2)} грн</span>
                <span class="debt-type">${debt.is_owed ? 'Мені повинні' : 'Я повинен'}</span>
            </div>
            <div class="debt-actions">
                <span>Термін: ${debt.due_date || 'Не вказано'}</span>
                <button class="mark-paid-btn" data-id="${debt.id}">Позначити як сплачений</button>
            </div>
        </div>
    `).join('');
}