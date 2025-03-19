document.addEventListener('DOMContentLoaded', function() {
    // Initialize new features
    initSavingsGoals();
    initCategories();
    // Elementos para exportar/eliminar datos
    const exportDataBtn = document.getElementById('export-data');
    const deleteDataBtn = document.getElementById('delete-data');

    // Elementos para presupuestos
    const budgetForm = document.getElementById('budget-form');

    let transactionChart = null;
    let categoryChart = null;
    let trendChart = null;
    let transactions = [];
    let budgets = {};

    // Inicializar Floating Action Button
    const fab = document.getElementById('fab');
    if (fab) {
        fab.addEventListener('click', function() {
            document.querySelectorAll('.modal').forEach(modal => {
                const bsModal = bootstrap.Modal.getInstance(modal);
                if (bsModal) {
                    bsModal.hide();
                }
            });
            scrollTo(0, 0);
            document.querySelector('input[name="amount"]').focus();
        });
    }

    // Cargar y mostrar transacciones
    function loadTransactions() {
        fetch('/get_transactions')
            .then(response => response.json())
            .then(data => {
                transactions = data.transactions;
                updateDashboard(transactions);
                updateChart(transactions);
                updateAdvice(transactions);
                loadBudgets();
                updateReports();
            })
            .catch(error => console.error('Error:', error));
    }

    // Actualizar dashboard con datos de transacciones
    function updateDashboard(transactions) {
        const tableBody = document.getElementById('transactions-table');
        const totalIncome = document.getElementById('total-income');
        const totalExpenses = document.getElementById('total-expenses');
        const totalBalance = document.getElementById('total-balance');

        let incomeSum = 0;
        let expensesSum = 0;

        // Limpiar tabla
        tableBody.innerHTML = '';

        // Actualizar tabla y calcular totales
        transactions.forEach(transaction => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${transaction.date}</td>
                <td>${transaction.type === 'income' ? 'Ingreso' : 'Gasto'}</td>
                <td>${getCategoryText(transaction.category)}</td>
                <td>${transaction.description}</td>
                <td class="${transaction.type === 'income' ? 'text-success' : 'text-danger'}">
                    $${transaction.amount.toFixed(2)}
                </td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="deleteTransaction('${transaction.date}', '${transaction.description}', ${transaction.amount})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            tableBody.appendChild(row);

            if (transaction.type === 'income') {
                incomeSum += transaction.amount;
            } else {
                expensesSum += transaction.amount;
            }
        });

        // Si no hay transacciones, mostrar mensaje
        if (transactions.length === 0) {
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = `
                <td colspan="6" class="text-center py-4">
                    <div class="empty-state">
                        <i class="bi bi-cash-coin" style="font-size: 2.5rem; color: #0097FB;"></i>
                        <p class="mt-2">No hay transacciones registradas.</p>
                        <p class="text-muted small">Agrega tu primera transacción usando el formulario.</p>
                    </div>
                </td>
            `;
            tableBody.appendChild(emptyRow);
        }

        // Actualizar totales
        totalIncome.textContent = `$${incomeSum.toFixed(2)}`;
        totalExpenses.textContent = `$${expensesSum.toFixed(2)}`;
        totalBalance.textContent = `$${(incomeSum - expensesSum).toFixed(2)}`;
    }

    // Actualizar gráfico
    function updateChart(transactions) {
        const ctx = document.getElementById('transactionChart').getContext('2d');

        // Preparar datos para el gráfico
        const dates = [...new Set(transactions.map(t => t.date))].sort();
        const incomeData = dates.map(date => 
            transactions
                .filter(t => t.date === date && t.type === 'income')
                .reduce((sum, t) => sum + t.amount, 0)
        );
        const expensesData = dates.map(date => 
            transactions
                .filter(t => t.date === date && t.type === 'expense')
                .reduce((sum, t) => sum + t.amount, 0)
        );
        
        // Calcular balance acumulado
        const balanceData = [];
        let runningBalance = 0;
        for (let i = 0; i < dates.length; i++) {
            runningBalance += (incomeData[i] - expensesData[i]);
            balanceData.push(runningBalance);
        }

        if (transactionChart) {
            transactionChart.destroy();
        }

        transactionChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: dates,
                datasets: [
                    {
                        label: 'Ingresos',
                        data: incomeData,
                        backgroundColor: 'rgba(46, 204, 113, 0.8)',
                        borderColor: 'rgba(46, 204, 113, 1)',
                        borderWidth: 1,
                        borderRadius: 4,
                        barPercentage: 0.6,
                        categoryPercentage: 0.7
                    },
                    {
                        label: 'Gastos',
                        data: expensesData,
                        backgroundColor: 'rgba(231, 76, 60, 0.8)',
                        borderColor: 'rgba(231, 76, 60, 1)',
                        borderWidth: 1,
                        borderRadius: 4,
                        barPercentage: 0.6,
                        categoryPercentage: 0.7
                    },
                    {
                        label: 'Balance',
                        data: balanceData,
                        type: 'line',
                        borderColor: 'rgba(52, 152, 219, 1)',
                        backgroundColor: 'rgba(52, 152, 219, 0.2)',
                        borderWidth: 3,
                        pointBackgroundColor: 'rgba(52, 152, 219, 1)',
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        fill: false,
                        tension: 0.3,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            font: {
                                size: 12
                            },
                            usePointStyle: true,
                            padding: 20
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleFont: {
                            size: 14
                        },
                        bodyFont: {
                            size: 13
                        },
                        padding: 12,
                        cornerRadius: 8,
                        caretSize: 6,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                let value = context.raw || 0;
                                return `${label}: $${value.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString('es-ES', {minimumFractionDigits: 0, maximumFractionDigits: 0});
                            },
                            font: {
                                size: 11
                            }
                        }
                    },
                    y1: {
                        position: 'right',
                        beginAtZero: false,
                        grid: {
                            drawOnChartArea: false
                        },
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString('es-ES', {minimumFractionDigits: 0, maximumFractionDigits: 0});
                            },
                            font: {
                                size: 11
                            }
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        },
                        ticks: {
                            font: {
                                size: 10
                            }
                        }
                    }
                },
                animation: {
                    duration: 1500,
                    easing: 'easeOutQuart'
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });
    }

    // Actualizar consejos del asistente virtual
    function updateAdvice(transactions) {
        const adviceContent = document.querySelector('.advice-content');

        // Calcular totales
        let totalIncome = 0;
        let totalExpenses = 0;

        transactions.forEach(transaction => {
            if (transaction.type === 'income') {
                totalIncome += transaction.amount;
            } else {
                totalExpenses += transaction.amount;
            }
        });

        // Preparar consejos personalizados
        let advice = '';

        if (transactions.length === 0) {
            advice = `
                <div class="advice-item">
                    <h6 class="neon-text">👋 ¡Bienvenido!</h6>
                    <p>Para comenzar, agrega tus primeras transacciones. Registra tus ingresos y gastos para tener una visión clara de tus finanzas.</p>
                </div>
            `;
        } else {
            // Consejo basado en el balance
            const savingsRate = totalIncome > 0 ? (totalIncome - totalExpenses) / totalIncome : 0;

            if (totalExpenses > totalIncome) {
                advice += `
                    <div class="advice-item">
                        <h6 class="neon-text">⚠️ Alerta de Gastos</h6>
                        <p>Tus gastos superan tus ingresos. Considera reducir gastos en categorías no esenciales.</p>
                    </div>
                `;
            } else if (savingsRate < 0.2) {
                advice += `
                    <div class="advice-item">
                        <h6 class="neon-text">💡 Consejo de Ahorro</h6>
                        <p>Estás ahorrando menos del 20% de tus ingresos. Intenta aumentar tu tasa de ahorro para alcanzar tus metas financieras.</p>
                    </div>
                `;
            } else {
                advice += `
                    <div class="advice-item">
                        <h6 class="neon-text">🎉 ¡Buen Trabajo!</h6>
                        <p>Estás ahorrando más del 20% de tus ingresos. Sigue así para alcanzar tus metas financieras.</p>
                    </div>
                `;
            }

            // Análisis de categorías de gastos
            const expensesByCategory = {};
            transactions.forEach(transaction => {
                if (transaction.type === 'expense') {
                    expensesByCategory[transaction.category] = (expensesByCategory[transaction.category] || 0) + transaction.amount;
                }
            });

            // Encontrar la categoría con más gastos
            let topCategory = '';
            let topAmount = 0;

            for (const category in expensesByCategory) {
                if (expensesByCategory[category] > topAmount) {
                    topAmount = expensesByCategory[category];
                    topCategory = category;
                }
            }

            if (topCategory) {
                let categoryText = getCategoryText(topCategory);
                advice += `
                    <div class="advice-item">
                        <h6 class="neon-text">📊 Análisis de Gastos</h6>
                        <p>Tu mayor categoría de gastos es <strong>${categoryText}</strong> ($${topAmount.toFixed(2)}). Revisa si hay oportunidades para optimizar estos gastos.</p>
                    </div>
                `;
            }

            // Añadir consejo sobre criptomonedas
            advice += `
                <div class="advice-item">
                    <h6 class="neon-text">💰 Inversiones Cripto</h6>
                    <p>Considera diversificar tus inversiones con criptomonedas. El mercado muestra tendencias positivas para Bitcoin y Ethereum este mes.</p>
                </div>
            `;
        }

        adviceContent.innerHTML = advice;
    }

    // Función para obtener el texto de la categoría
    function getCategoryText(category) {
        const categoryMap = {
            'salary': 'Salario',
            'food': 'Alimentación',
            'transport': 'Transporte',
            'utilities': 'Servicios',
            'entertainment': 'Entretenimiento',
            'health': 'Salud',
            'education': 'Educación',
            'savings': 'Ahorros',
            'investment': 'Inversiones',
            'other': 'Otros',
            'cripto': 'Criptomonedas'
        };
        return categoryMap[category] || category;
    }

    // Función global para eliminar una transacción
    window.deleteTransaction = function(date, description, amount) {
        if (confirm('¿Estás seguro de que deseas eliminar esta transacción?')) {
            fetch('/delete_transaction', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    date: date,
                    description: description,
                    amount: amount
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    loadTransactions();
                } else {
                    alert('Error al eliminar la transacción: ' + (data.message || 'Error desconocido'));
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Error de conexión al eliminar la transacción');
            });
        }
    }

    // Cargar y mostrar presupuestos
    function loadBudgets() {
        fetch('/get_budgets')
            .then(response => response.json())
            .then(data => {
                budgets = data.budgets;
                updateBudgetTable();
            })
            .catch(error => console.error('Error:', error));
    }

    // Actualizar tabla de presupuestos
    function updateBudgetTable() {
        const budgetsTable = document.getElementById('budgets-table');
        if (!budgetsTable) return;

        // Limpiar tabla existente
        budgetsTable.innerHTML = '';

        // Si no hay presupuestos, mostrar mensaje
        if (Object.keys(budgets).length === 0) {
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = `
                <td colspan="4" class="text-center py-4">
                    <div class="empty-state">
                        <i class="bi bi-wallet2" style="font-size: 2.5rem; color: #0097FB;"></i>
                        <p class="mt-2">No hay presupuestos definidos.</p>
                        <p class="text-muted small">Agrega tu primer presupuesto usando el formulario.</p>
                    </div>
                </td>
            `;
            budgetsTable.appendChild(emptyRow);
            return;
        }

        // Calcular gastos por categoría
        const expensesByCategory = {};

        transactions.forEach(transaction => {
            if (transaction.type === 'expense') {
                expensesByCategory[transaction.category] = (expensesByCategory[transaction.category] || 0) + transaction.amount;
            }
        });

        // Mostrar presupuestos
        for (const category in budgets) {
            const row = document.createElement('tr');
            const limit = budgets[category];
            const spent = expensesByCategory[category] || 0;
            const percentage = limit > 0 ? (spent / limit) * 100 : 0;

            let categoryText = getCategoryText(category);

            row.innerHTML = `
                <td>${categoryText}</td>
                <td>$${limit.toFixed(2)}</td>
                <td>
                    <div class="progress" style="height: 20px;">
                        <div class="progress-bar ${percentage > 100 ? 'bg-danger' : 'bg-success'}" 
                             role="progressbar" 
                             style="width: ${Math.min(percentage, 100)}%;" 
                             aria-valuenow="${percentage}" 
                             aria-valuemin="0" 
                             aria-valuemax="100">
                            $${spent.toFixed(2)} (${percentage.toFixed(0)}%)
                        </div>
                    </div>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-danger delete-budget" data-category="${category}">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;

            budgetsTable.appendChild(row);
        }

        // Configurar listener para botones de eliminar
        document.querySelectorAll('.delete-budget').forEach(button => {
            button.addEventListener('click', function() {
                const category = this.getAttribute('data-category');
                deleteBudget(category);
            });
        });
    }

    // Función para eliminar un presupuesto
    function deleteBudget(category) {
        if (!confirm('¿Estás seguro de que deseas eliminar este presupuesto?')) {
            return;
        }

        fetch('/delete_budget', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                category: category
            }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                loadBudgets();
            } else {
                alert('Error al eliminar el presupuesto');
            }
        })
        .catch(error => console.error('Error:', error));
    }

    // Función para guardar un presupuesto
    function saveBudget(category, limit) {
        fetch('/save_budget', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                category: category,
                limit: limit
            }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                document.getElementById('budget-limit').value = '';
                budgets = data.budgets; // Actualizar presupuestos con los datos devueltos
                loadBudgets(); // Asegurarnos de recargar los presupuestos
            } else {
                alert('Error al guardar el presupuesto');
            }
        })
        .catch(error => console.error('Error:', error));
    }

    // Función para exportar datos a CSV
    function exportToCSV() {
        if (transactions.length === 0) {
            alert('No hay transacciones para exportar');
            return;
        }

        // Cabecera del CSV
        let csv = 'Fecha,Tipo,Categoría,Descripción,Monto\n';

        // Agregar cada transacción
        transactions.forEach(transaction => {
            const date = new Date(transaction.date).toLocaleDateString();
            const type = transaction.type === 'income' ? 'Ingreso' : 'Gasto';

            let category = getCategoryText(transaction.category);

            // Escapar comillas en la descripción
            const description = transaction.description.replace(/"/g, '""');

            csv += `${date},${type},${category},"${description}",${transaction.amount}\n`;
        });

        // Crear enlace para descargar
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'transacciones.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Función para eliminar datos
    function deleteData(period) {
        if (!confirm(`¿Estás seguro de que deseas eliminar ${period === 'all' ? 'todos tus datos' : 'los datos del ' + (period === 'month' ? 'último mes' : 'último año')}? Esta acción no se puede deshacer.`)) {
            return;
        }

        fetch('/delete_data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                period: period
            }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                loadTransactions();
                alert('Datos eliminados correctamente');
            } else {
                alert('Error al eliminar los datos');
            }
        })
        .catch(error => console.error('Error:', error));
    }

    // Funciones para Reportes Financieros
    function updateReports() {
        const ctx1 = document.getElementById('categoryChart');
        const ctx2 = document.getElementById('trendChart');
        const cryptoInfoDiv = document.getElementById('crypto-info');

        if (!ctx1 || !ctx2) return;

        // Calcular gastos por categoría para el gráfico
        const expensesByCategory = {};
        transactions.forEach(transaction => {
            if (transaction.type === 'expense') {
                const categoryName = getCategoryText(transaction.category);
                expensesByCategory[categoryName] = (expensesByCategory[categoryName] || 0) + transaction.amount;
            }
        });

        // Si no hay datos, añadir datos de ejemplo para criptomonedas
        if (Object.keys(expensesByCategory).length === 0) {
            expensesByCategory['Alimentación'] = 1500;
            expensesByCategory['Transporte'] = 800;
            expensesByCategory['Servicios'] = 1200;
            expensesByCategory['Entretenimiento'] = 650;
            expensesByCategory['Criptomonedas'] = 2000;
            expensesByCategory['Inversiones'] = 1500;
        }

        // Asegurar que siempre haya categorías de criptomonedas e inversiones para mostrar
        if (!expensesByCategory['Criptomonedas']) {
            expensesByCategory['Criptomonedas'] = 1800;
        }
        if (!expensesByCategory['Inversiones']) {
            expensesByCategory['Inversiones'] = 1400;
        }

        // Gráfico de categorías
        if (categoryChart) {
            categoryChart.destroy();
        }
        
        categoryChart = new Chart(ctx1, {
            type: 'doughnut',
            data: {
                labels: Object.keys(expensesByCategory),
                datasets: [{
                    data: Object.values(expensesByCategory),
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.7)',
                        'rgba(54, 162, 235, 0.7)',
                        'rgba(255, 206, 86, 0.7)',
                        'rgba(75, 192, 192, 0.7)',
                        'rgba(153, 102, 255, 0.7)',
                        'rgba(255, 159, 64, 0.7)',
                        'rgba(199, 199, 199, 0.7)',
                        'rgba(83, 102, 255, 0.7)',
                        'rgba(40, 159, 64, 0.7)',
                        'rgba(210, 99, 132, 0.7)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)',
                        'rgba(255, 159, 64, 1)',
                        'rgba(199, 199, 199, 1)',
                        'rgba(83, 102, 255, 1)',
                        'rgba(40, 159, 64, 1)',
                        'rgba(210, 99, 132, 1)'
                    ],
                    borderWidth: 1,
                    cutout: '70%'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            font: {
                                size: 10
                            },
                            boxWidth: 15,
                            padding: 10
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: $${value.toFixed(2)} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });

        // Datos para el gráfico de tendencias
        const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio'];
        
        // Datos de ejemplo para tendencias de criptomonedas
        const bitcoinData = [38000, 42000, 39000, 43000, 47000, 51000];
        const ethereumData = [2800, 2600, 3100, 3300, 3700, 4200];
        const solanaData = [120, 140, 110, 160, 190, 220];

        // Gráfico de tendencias
        if (trendChart) {
            trendChart.destroy();
        }
        
        trendChart = new Chart(ctx2, {
            type: 'line',
            data: {
                labels: months,
                datasets: [
                    {
                        label: 'Bitcoin (USD)',
                        data: bitcoinData,
                        borderColor: 'rgba(247, 147, 26, 1)',
                        backgroundColor: 'rgba(247, 147, 26, 0.2)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: false,
                        pointRadius: 4,
                        pointBackgroundColor: 'rgba(247, 147, 26, 1)'
                    },
                    {
                        label: 'Ethereum (USD)',
                        data: ethereumData,
                        borderColor: 'rgba(120, 127, 231, 1)',
                        backgroundColor: 'rgba(120, 127, 231, 0.2)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: false,
                        pointRadius: 4,
                        pointBackgroundColor: 'rgba(120, 127, 231, 1)'
                    },
                    {
                        label: 'Solana (USD)',
                        data: solanaData,
                        borderColor: 'rgba(20, 241, 149, 1)',
                        backgroundColor: 'rgba(20, 241, 149, 0.2)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: false,
                        pointRadius: 4,
                        pointBackgroundColor: 'rgba(20, 241, 149, 1)'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            font: {
                                size: 12
                            },
                            boxWidth: 12,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: $${context.raw.toLocaleString()}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            callback: function(value) {
                                if (value >= 1000) {
                                    return '$' + value / 1000 + 'k';
                                }
                                return '$' + value;
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });

        // Actualizar información de criptomonedas
        if (cryptoInfoDiv) {
            updateCryptoInfo(cryptoInfoDiv);
        }
    }

    // Función para actualizar la información de criptomonedas
    function updateCryptoInfo(container) {
        const cryptoData = [
            {
                name: 'Bitcoin',
                symbol: 'BTC',
                price: 51237.42,
                change: 2.4,
                marketCap: '990B',
                description: 'La primera y más grande criptomoneda por capitalización de mercado.'
            },
            {
                name: 'Ethereum',
                symbol: 'ETH',
                price: 4123.75,
                change: 1.8,
                marketCap: '495B',
                description: 'Plataforma descentralizada que ejecuta contratos inteligentes.'
            },
            {
                name: 'Solana',
                symbol: 'SOL',
                price: 215.38,
                change: 3.5,
                marketCap: '74B',
                description: 'Blockchain de alto rendimiento para DApps y finanzas descentralizadas.'
            },
            {
                name: 'Cardano',
                symbol: 'ADA',
                price: 1.23,
                change: -0.7,
                marketCap: '44B',
                description: 'Plataforma blockchain de tercera generación con prueba de participación.'
            }
        ];

        const investmentStrategies = [
            'DCA (Promedio de Costo en Dólares): Invierte una cantidad fija regularmente.',
            'HODL: Mantén tus criptomonedas a largo plazo, independientemente de la volatilidad.',
            'Diversificación: Reparte tu inversión entre diferentes criptomonedas y activos.',
            'Staking: Gana rendimientos pasivos apostando tus criptomonedas.'
        ];

        let html = `
            <div class="row mb-4">
                <div class="col-12">
                    <div class="card cyberpunk-card">
                        <div class="card-body">
                            <h5 class="neon-text mb-3"><i class="bi bi-currency-bitcoin"></i> Principales Criptomonedas</h5>
                            <div class="table-responsive">
                                <table class="table table-sm">
                                    <thead>
                                        <tr>
                                            <th>Nombre</th>
                                            <th>Precio (USD)</th>
                                            <th>Cambio 24h</th>
                                            <th>Cap. de Mercado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
        `;

        cryptoData.forEach(crypto => {
            html += `
                <tr>
                    <td><strong>${crypto.name}</strong> <span class="text-muted">${crypto.symbol}</span></td>
                    <td>$${crypto.price.toLocaleString()}</td>
                    <td class="${crypto.change >= 0 ? 'text-success' : 'text-danger'}">${crypto.change >= 0 ? '+' : ''}${crypto.change}%</td>
                    <td>$${crypto.marketCap}</td>
                </tr>
            `;
        });

        html += `
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="row">
                <div class="col-md-7">
                    <div class="card cyberpunk-card">
                        <div class="card-body">
                            <h5 class="neon-text mb-3"><i class="bi bi-lightbulb"></i> Estrategias de inversión</h5>
                            <ul class="list-group list-group-flush cyber-list">
        `;

        investmentStrategies.forEach(strategy => {
            html += `
                <li class="list-group-item bg-transparent border-bottom border-dark">${strategy}</li>
            `;
        });

        html += `
                            </ul>
                        </div>
                    </div>
                </div>
                <div class="col-md-5">
                    <div class="card cyberpunk-card">
                        <div class="card-body">
                            <h5 class="neon-text mb-3"><i class="bi bi-bar-chart-fill"></i> Rendimiento anual</h5>
                            <div class="crypto-performance">
                                <div class="d-flex justify-content-between mb-2">
                                    <span>Bitcoin</span>
                                    <span class="text-success">+124.5%</span>
                                </div>
                                <div class="progress mb-3">
                                    <div class="progress-bar bg-success" style="width: 80%"></div>
                                </div>
                                <div class="d-flex justify-content-between mb-2">
                                    <span>Ethereum</span>
                                    <span class="text-success">+186.2%</span>
                                </div>
                                <div class="progress mb-3">
                                    <div class="progress-bar bg-success" style="width: 90%"></div>
                                </div>
                                <div class="d-flex justify-content-between mb-2">
                                    <span>Solana</span>
                                    <span class="text-success">+276.8%</span>
                                </div>
                                <div class="progress mb-3">
                                    <div class="progress-bar bg-success" style="width: 95%"></div>
                                </div>
                                <div class="d-flex justify-content-between mb-2">
                                    <span>Cardano</span>
                                    <span class="text-success">+94.3%</span>
                                </div>
                                <div class="progress">
                                    <div class="progress-bar bg-success" style="width: 70%"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    // Función para obtener datos de categorías
    function getCategoryTotals() {
        const expensesByCategory = {};
        transactions.forEach(transaction => {
            if (transaction.type === 'expense') {
                const categoryName = getCategoryText(transaction.category);
                expensesByCategory[categoryName] = (expensesByCategory[categoryName] || 0) + transaction.amount;
            }
        });
        return expensesByCategory;
    }

    // Función para obtener los últimos 6 meses
    function getLastSixMonths() {
        const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const currentDate = new Date();
        const result = [];
        
        for (let i = 5; i >= 0; i--) {
            const monthIndex = (currentDate.getMonth() - i + 12) % 12;
            result.push(months[monthIndex]);
        }
        
        return result;
    }

    // Función para obtener totales mensuales (ejemplo)
    function getMonthlyTotals() {
        return [1200, 1400, 1100, 1700, 1300, 1500];
    }

    // Funciones para Metas de Ahorro
    function initSavingsGoals() {
        const form = document.getElementById('savings-goal-form');
        if (form) {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                const name = document.getElementById('goal-name').value;
                const amount = parseFloat(document.getElementById('goal-amount').value);
                const date = document.getElementById('goal-date').value;
                
                if (!name || isNaN(amount) || amount <= 0 || !date) {
                    alert('Por favor, completa todos los campos correctamente');
                    return;
                }
                
                saveSavingsGoal(name, amount, date);
            });
        }
        loadSavingsGoals();
    }

    function saveSavingsGoal(name, amount, date) {
        fetch('/save_goal', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, amount, date }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                loadSavingsGoals();
                document.getElementById('savings-goal-form').reset();
            } else {
                alert('Error al guardar la meta: ' + (data.error || 'Error desconocido'));
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error de conexión al guardar la meta');
        });
    }

    function loadSavingsGoals() {
        fetch('/get_goals')
        .then(response => response.json())
        .then(data => {
            const goalsList = document.getElementById('savings-goals-list');
            if (goalsList) {
                if (!data.goals || data.goals.length === 0) {
                    // Si no hay metas, mostrar datos de ejemplo
                    goalsList.innerHTML = `
                        <div class="list-group-item cyber-item">
                            <h6 class="neon-text">Compra de Bitcoin</h6>
                            <p>Objetivo: $5,000.00</p>
                            <div class="progress mb-2">
                                <div class="progress-bar bg-info" style="width: 40%"></div>
                            </div>
                            <small>Fecha límite: 31/12/2025</small>
                        </div>
                        <div class="list-group-item cyber-item">
                            <h6 class="neon-text">Inversión en Ethereum</h6>
                            <p>Objetivo: $3,000.00</p>
                            <div class="progress mb-2">
                                <div class="progress-bar bg-info" style="width: 25%"></div>
                            </div>
                            <small>Fecha límite: 30/06/2025</small>
                        </div>
                    `;
                } else {
                    goalsList.innerHTML = data.goals.map(goal => {
                        const progress = (goal.current / goal.amount) * 100;
                        return `
                            <div class="list-group-item cyber-item">
                                <h6 class="neon-text">${goal.name}</h6>
                                <p>Objetivo: $${goal.amount.toFixed(2)}</p>
                                <div class="progress mb-2">
                                    <div class="progress-bar bg-info" style="width: ${progress}%"></div>
                                </div>
                                <small>Fecha límite: ${new Date(goal.date).toLocaleDateString()}</small>
                            </div>
                        `;
                    }).join('');
                }
            }
        })
        .catch(error => {
            console.error('Error cargando metas:', error);
            // Mostrar datos de ejemplo en caso de error
            if (document.getElementById('savings-goals-list')) {
                document.getElementById('savings-goals-list').innerHTML = `
                    <div class="list-group-item cyber-item">
                        <h6 class="neon-text">Compra de Bitcoin</h6>
                        <p>Objetivo: $5,000.00</p>
                        <div class="progress mb-2">
                            <div class="progress-bar bg-info" style="width: 40%"></div>
                        </div>
                        <small>Fecha límite: 31/12/2025</small>
                    </div>
                `;
            }
        });
    }

    // Funciones para Gestión de Categorías
    function initCategories() {
        const form = document.getElementById('category-form');
        if (form) {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                const name = document.getElementById('category-name').value;
                const type = document.getElementById('category-type').value;
                
                if (!name || !type) {
                    alert('Por favor, completa todos los campos');
                    return;
                }
                
                saveCategory(name, type);
            });
        }
        loadCategories();
    }

    function saveCategory(name, type) {
        fetch('/save_category', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, type }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                loadCategories();
                document.getElementById('category-form').reset();
                
                // Actualizar el select de categorías en el formulario de transacciones
                updateTransactionCategorySelect();
            } else {
                alert('Error al guardar la categoría: ' + (data.error || 'Error desconocido'));
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error de conexión al guardar la categoría');
        });
    }

    function loadCategories() {
        fetch('/get_categories')
        .then(response => response.json())
        .then(data => {
            const categoriesTable = document.getElementById('categories-table');
            if (categoriesTable) {
                if (!data.categories || data.categories.length === 0) {
                    categoriesTable.innerHTML = `
                        <tr>
                            <td colspan="3" class="text-center py-4">
                                <div class="empty-state">
                                    <i class="bi bi-tags" style="font-size: 2.5rem; color: #0097FB;"></i>
                                    <p class="mt-2">No hay categorías personalizadas.</p>
                                    <p class="text-muted small">Agrega tu primera categoría usando el formulario.</p>
                                </div>
                            </td>
                        </tr>
                    `;
                } else {
                    categoriesTable.innerHTML = data.categories.map(category => `
                        <tr>
                            <td>${category.name}</td>
                            <td>${category.type === 'income' ? 'Ingreso' : 'Gasto'}</td>
                            <td>
                                <button class="btn btn-sm btn-danger delete-category" onclick="deleteCategory('${category.name}')">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('');
                }
            }
            
            // Actualizar el select de categorías en el formulario de transacciones
            updateTransactionCategorySelect(data.categories);
        })
        .catch(error => console.error('Error cargando categorías:', error));
    }

    // Función para actualizar el desplegable de categorías en el formulario de transacciones
    function updateTransactionCategorySelect(categories) {
        const categorySelect = document.querySelector('select[name="category"]');
        if (!categorySelect || !categories) return;

        // Guardar el valor seleccionado actualmente para restaurarlo después
        const currentValue = categorySelect.value;
        
        // Limpiar opciones existentes
        categorySelect.innerHTML = '';

        // Filtrar y agregar categorías de ingreso
        const incomeCategories = categories.filter(c => c.type === 'income');
        if (incomeCategories.length > 0) {
            const incomeGroup = document.createElement('optgroup');
            incomeGroup.label = 'Ingresos';
            
            incomeCategories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.name.toLowerCase();
                option.textContent = category.name;
                incomeGroup.appendChild(option);
            });
            
            categorySelect.appendChild(incomeGroup);
        }

        // Filtrar y agregar categorías de gasto
        const expenseCategories = categories.filter(c => c.type === 'expense');
        if (expenseCategories.length > 0) {
            const expenseGroup = document.createElement('optgroup');
            expenseGroup.label = 'Gastos';
            
            expenseCategories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.name.toLowerCase();
                option.textContent = category.name;
                expenseGroup.appendChild(option);
            });
            
            categorySelect.appendChild(expenseGroup);
        }

        // Restaurar el valor seleccionado si existe
        if (currentValue) {
            categorySelect.value = currentValue;
        }
    }

    // Función global para eliminar una categoría
    window.deleteCategory = function(name) {
        if (!confirm('¿Estás seguro de que deseas eliminar esta categoría?')) {
            return;
        }
        fetch('/delete_category', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                loadCategories();
                // Actualizar el select de categorías en el formulario de transacciones
                updateTransactionCategorySelect();
            } else {
                alert('Error al eliminar la categoría');
            }
        })
        .catch(error => console.error('Error:', error));
    }

    // Cargar transacciones al iniciar
    loadTransactions();

    // Event Listeners
    if (exportDataBtn) {
        exportDataBtn.addEventListener('click', exportToCSV);
    }

    if (deleteDataBtn) {
        deleteDataBtn.addEventListener('click', function() {
            const period = document.getElementById('delete-period').value;
            deleteData(period);
        });
    }

    if (budgetForm) {
        budgetForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const category = document.getElementById('budget-category').value;
            const limit = parseFloat(document.getElementById('budget-limit').value);

            if (!category || isNaN(limit) || limit <= 0) {
                alert('Por favor, completa todos los campos correctamente');
                return;
            }

            saveBudget(category, limit);
        });
    }

    // Inicializar los reportes al abrir el modal
    const reportesModal = document.getElementById('reportesModal');
    if (reportesModal) {
        reportesModal.addEventListener('shown.bs.modal', function() {
            updateReports();
        });
    }
});