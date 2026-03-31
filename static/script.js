document.addEventListener("DOMContentLoaded", function () {
    const transactionList = document.getElementById("transaction-list");
    const transactionForm = document.getElementById("transaction-form");
    const incomeBtn = document.getElementById("income-btn");
    const expenseBtn = document.getElementById("expense-btn");
    const amountInput = document.getElementById("amount");
    const categoryInput = document.getElementById("category");
    const descriptionInput = document.getElementById("description");

    let transactions = [];
    let transactionType = "income"; // По умолчанию - доход
    let chart = null; // Переменная для хранения экземпляра графика

    // Переключение между "Доход" и "Расход"
    incomeBtn.addEventListener("click", () => {
        transactionType = "income";
        incomeBtn.classList.add("active");
        expenseBtn.classList.remove("active");
    });

    expenseBtn.addEventListener("click", () => {
        transactionType = "expense";
        expenseBtn.classList.add("active");
        incomeBtn.classList.remove("active");
    });

    // Обработчик формы добавления транзакции
    transactionForm.addEventListener("submit", function (event) {
        event.preventDefault();
        const amount = parseFloat(amountInput.value);
        const category = categoryInput.value;
        const description = descriptionInput.value.trim();

        if (!amount || amount <= 0) {
            alert("Введіть коректну суму!");
            return;
        }
        if (!category) {
            alert("Оберіть категорію!");
            return;
        }

        const newTransaction = {
            type: transactionType,
            amount,
            category,
            description,
            date: new Date().toISOString().split("T")[0]
        };

        addTransactionToDOM(newTransaction, true);
        transactionForm.reset();
        incomeBtn.classList.add("active");
        expenseBtn.classList.remove("active");
        transactionType = "income";
    });

    // Функция для получения всех транзакций
    function fetchTransactions() {
        fetch("/get_transactions")
            .then(response => response.json())
            .then(data => {
                transactions = data;
                renderTransactions(data);
                updateSummary();
                updateChart();
            })
            .catch(error => console.error("Помилка завантаження транзакцій:", error));
    }

    // Функция отображения списка транзакций
    function renderTransactions(transactions) {
        transactionList.innerHTML = "";
        transactions.forEach(t => addTransactionToDOM(t, false));
    }

    // Добавление транзакции в DOM
    function addTransactionToDOM(transaction, saveToDB = true) {
        const li = document.createElement("li");
        li.classList.add("transaction-item", transaction.type === "income" ? "transaction-income" : "transaction-expense");

        const categoryIcons = {
            "Зарплата": "static/icons/salary.png",
            "Продукти": "static/icons/food.png",
            "Транспорт": "static/icons/transport.png",
            "Здоров'я": "static/icons/health.png",
            "Підробіток": "static/icons/side-job.png"
        };

        const iconSrc = categoryIcons[transaction.category] || "static/icons/default.png";

        // Обработка длинных комментариев
        let descriptionHTML = "";
        if (transaction.description) {
            if (transaction.description.length > 50) {
                descriptionHTML = `
                    <div class="transaction-description-container">
                        <p class="transaction-description">
                            ${transaction.description.substring(0, 50)}...
                        </p>
                        <button class="show-full-description">Показати повністю</button>
                        <span class="full-description" style="display:none;">${transaction.description}</span>
                        <button class="hide-full-description" style="display:none;">Сховати</button>
                    </div>
                `;
            } else {
                descriptionHTML = `<p class="transaction-description">${transaction.description}</p>`;
            }
        }

        li.innerHTML = `
            <div class="transaction-content">
                <img src="${iconSrc}" alt="${transaction.category}" class="category-icon">
                <span>${transaction.date} | ${transaction.category} | ${transaction.type === "income" ? '+' : '-'} ${transaction.amount} грн</span>
            </div>
            ${descriptionHTML}
        `;

        transactionList.prepend(li);

        // Обработчик показа полного комментария
        if (transaction.description && transaction.description.length > 50) {
            const showFullButton = li.querySelector(".show-full-description");
            const fullDescription = li.querySelector(".full-description");
            const hideFullButton = li.querySelector(".hide-full-description");

            showFullButton.addEventListener("click", () => {
                fullDescription.style.display = "inline";
                hideFullButton.style.display = "inline";
                showFullButton.style.display = "none";
            });

            hideFullButton.addEventListener("click", () => {
                fullDescription.style.display = "none";
                hideFullButton.style.display = "none";
                showFullButton.style.display = "inline";
            });
        }

        if (saveToDB) {
            saveTransactionToDB(transaction);
        }
    }

    // Отправка транзакции в БД
    function saveTransactionToDB(transaction) {
        fetch("/add_transaction", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(transaction)
        })
        .then(response => response.json())
        .then(() => {
            fetchTransactions();
        })
        .catch(error => console.error("Помилка при додаванні транзакції:", error));
    }

    // Обновление финансового обзора
    function updateSummary() {
        fetch("/get_summary")
            .then(response => response.json())
            .then(data => {
                document.getElementById("income-amount").textContent = `${data.income} грн`;
                document.getElementById("expense-amount").textContent = `${data.expense} грн`;
                document.getElementById("balance-amount").textContent = `${data.balance} грн`;
            })
            .catch(error => console.error("Помилка завантаження даних:", error));
    }

    // Функция обновления графика
    function updateChart() {
        const ctx = document.getElementById('category-chart').getContext('2d');

        // Получаем выбранные категории
        const selectedCategories = Array.from(
            document.querySelectorAll('.category-checkboxes input[type="checkbox"]:checked')
        ).map(checkbox => checkbox.value);

        // Получаем тип операций
        const selectedType = document.getElementById('type-filter').value;

        // Получаем даты
        const startDate = document.getElementById('start-date-chart').value;
        const endDate = document.getElementById('end-date-chart').value;

        // Фильтрация транзакций
        const filteredTransactions = transactions.filter(t => {
            return (selectedType === "all" || t.type === selectedType) &&
                   (selectedCategories.includes("all") || selectedCategories.includes(t.category)) &&
                   (!startDate || t.date >= startDate) &&
                   (!endDate || t.date <= endDate);
        });

        // Группировка по категориям
        const categories = {};
        filteredTransactions.forEach(t => {
            categories[t.category] = (categories[t.category] || 0) + t.amount;
        });

        // Сортировка по убыванию суммы
        const sortedCategories = Object.entries(categories)
            .sort((a, b) => b[1] - a[1])
            .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

        // Обновление графика
        if (chart) chart.destroy();
        chart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: Object.keys(sortedCategories),
                datasets: [{
                    data: Object.values(sortedCategories),
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
                        '#9966FF', '#FF9F40', '#8AC24A', '#F06292'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            boxWidth: 12,
                            padding: 20,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: ${value} грн (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    // Логика для чекбокса "Все"
    document.querySelector('.category-checkboxes input[value="all"]').addEventListener('change', function() {
        const checkboxes = document.querySelectorAll('.category-checkboxes input[type="checkbox"]:not([value="all"])');
        checkboxes.forEach(cb => {
            cb.checked = this.checked;
        });
    });

    // Логика для остальных чекбоксов
    document.querySelectorAll('.category-checkboxes input[type="checkbox"]:not([value="all"])').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const allCheckbox = document.querySelector('.category-checkboxes input[value="all"]');
            if (!this.checked) {
                allCheckbox.checked = false;
            } else {
                const allChecked = Array.from(document.querySelectorAll('.category-checkboxes input[type="checkbox"]:not([value="all"])'))
                    .every(cb => cb.checked);
                if (allChecked) {
                    allCheckbox.checked = true;
                }
            }
        });
    });

    // Обработчик кнопки "Применить"
    document.getElementById('apply-filters').addEventListener('click', updateChart);

    // Установка текущей даты по умолчанию
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('end-date-chart').value = today;

    // Установка даты месяц назад по умолчанию
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    document.getElementById('start-date-chart').value = monthAgo.toISOString().split('T')[0];

    // Загрузка данных при старте
    fetchTransactions();
});