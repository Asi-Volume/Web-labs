const API_KEY = 'КЛЮЧ'; 
const BASE_URL = 'https://edu.std-900.ist.mospolytech.ru/labs/api';

let ordersData = [];
let dishesCache = [];
let orderToDelete = null;

function formatDate(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${d}.${m}.${y} ${h}:${min}`;
}

async function loadData() {
    const container = document.getElementById('orders-container');
    container.innerHTML = '<p>Загрузка...</p>';

    try {
        // Пытаемся получить данные с реального сервера Мосполитеха
        if (!API_KEY || API_KEY === 'ТВОЙ_UUID_КЛЮЧ_ЗДЕСЬ') throw new Error("Нет ключа");
        
        const dishesRes = await fetch(`${BASE_URL}/dishes`);
        if (!dishesRes.ok) throw new Error("Сервер не отвечает");
        dishesCache = await dishesRes.json();

        const ordersRes = await fetch(`${BASE_URL}/orders?api_key=${API_KEY}`);
        if (!ordersRes.ok) throw new Error("Сервер не отвечает");
        const data = await ordersRes.json();
        
        if (data.error) throw new Error(data.error);
        
        ordersData = data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        renderTable();

    } catch (err) {
        // --- ДЕМО-РЕЖИМ (Если сервер недоступен) ---
        console.warn('Сервер Мосполитеха недоступен. Используем демо-данные DummyJSON. Ошибка:', err.message);
        
        try {
            // Запрашиваем данные с бесплатного API
            const demoRes = await fetch('https://dummyjson.com/recipes');
            const demoData = await demoRes.json();
            
            dishesCache = [];
            ordersData = [];

            // Берем первые 3 рецепта и маскируем их под заказы
            demoData.recipes.slice(0, 3).forEach((recipe, index) => {
                const fakeDishId = index + 1;
                
                // Добавляем блюдо в кэш
                dishesCache.push({
                    id: fakeDishId,
                    name: recipe.name,
                    price: Math.floor(Math.random() * 300) + 150
                });
                
                // Создаем заказ
                ordersData.push({
                    id: 1000 + index,
                    created_at: new Date(Date.now() - index * 86400000).toISOString(), // Разные даты
                    full_name: "Демо Пользователь",
                    email: "demo@example.com",
                    phone: "+7 (999) 000-00-00",
                    delivery_address: "г. Москва, ул. Демонстрационная, 1",
                    delivery_type: "now",
                    delivery_time: null,
                    comment: "Это тестовый заказ, загруженный с публичного API.",
                    soup_id: null,
                    main_course_id: fakeDishId,
                    salad_id: null,
                    drink_id: null,
                    dessert_id: null
                });
            });
            
            renderTable();
            
            // Выводим предупреждение, что данные тестовые
            const warning = document.createElement('p');
            warning.style.cssText = "color: #d35400; font-size: 14px; margin-bottom: 10px; font-weight: bold;";
            warning.innerHTML = "⚠️ Сервер Мосполитеха временно недоступен. Отображаются демо-данные с публичного API.";
            container.prepend(warning);
            
        } catch (demoErr) {
            container.innerHTML = `<p style="color: red; padding: 20px;">Ошибка сети: не удалось загрузить ни реальные, ни демо-данные.</p>`;
        }
    }
}

function renderTable() {
    const container = document.getElementById('orders-container');
    const warning = container.querySelector('p');
    const warningHTML = warning ? warning.outerHTML : '';
    
    if (ordersData.length === 0) {
        container.innerHTML = warningHTML + '<p style="padding: 20px; font-weight: 400;">У вас пока нет заказов.</p>';
        return;
    }

    let html = warningHTML + `
        <table class="orders-table">
            <thead>
                <tr>
                    <th>№</th>
                    <th>Дата оформления</th>
                    <th>Состав заказа</th>
                    <th>Стоимость</th>
                    <th>Время доставки</th>
                    <th>Действия</th>
                </tr>
            </thead>
            <tbody>
    `;

    ordersData.forEach((order, index) => {
        let dishNames = [];
        let totalPrice = 0;
        
        const dishIds = [order.soup_id, order.main_course_id, order.salad_id, order.drink_id, order.dessert_id];
        dishIds.forEach(id => {
            if (id) {
                const dish = dishesCache.find(d => d.id === id);
                if (dish) {
                    dishNames.push(dish.name);
                    totalPrice += dish.price;
                }
            }
        });

        let deliveryTimeStr = order.delivery_type === 'now' 
            ? 'Как можно скорее<br><span style="font-size: 12px; color: #888;">(с 07:00 до 23:00)</span>' 
            : order.delivery_time || '';

        html += `
            <tr>
                <td>${index + 1}</td>
                <td>${formatDate(order.created_at)}</td>
                <td>${dishNames.join(', ')}</td>
                <td>${totalPrice}₽</td>
                <td>${deliveryTimeStr}</td>
                <td class="actions">
                    <span class="action-icon" onclick="openView(${order.id})" title="Подробнее">👁️</span>
                    <span class="action-icon" onclick="openEdit(${order.id})" title="Редактирование">✏️</span>
                    <span class="action-icon" onclick="openDelete(${order.id})" title="Удаление">🗑️</span>
                </td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
}

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}

function openView(orderId) {
    const order = ordersData.find(o => o.id === orderId);
    if (!order) return;

    const modal = document.getElementById('modal-view');
    const content = document.getElementById('view-content');

    let dishesHtml = '';
    const dishIds = [
        { id: order.soup_id, label: 'Суп' },
        { id: order.main_course_id, label: 'Основное блюдо' },
        { id: order.salad_id, label: 'Салат' },
        { id: order.drink_id, label: 'Напиток' },
        { id: order.dessert_id, label: 'Десерт' }
    ];

    let total = 0;
    dishIds.forEach(item => {
        if (item.id) {
            const dish = dishesCache.find(d => d.id === item.id);
            if (dish) {
                dishesHtml += `<div class="view-row"><span>${item.label}</span> <span>${dish.name} (${dish.price}₽)</span></div>`;
                total += dish.price;
            }
        }
    });

    content.innerHTML = `
        <div class="view-row"><span>Дата оформления</span> <span>${formatDate(order.created_at)}</span></div>
        <h4 style="margin: 15px 0 5px;">Доставка</h4>
        <div class="view-row"><span>Имя получателя</span> <span>${order.full_name}</span></div>
        <div class="view-row"><span>Адрес доставки</span> <span>${order.delivery_address}</span></div>
        <div class="view-row"><span>Время доставки</span> <span>${order.delivery_type === 'now' ? 'Как можно скорее' : order.delivery_time}</span></div>
        <div class="view-row"><span>Телефон</span> <span>${order.phone}</span></div>
        <div class="view-row"><span>Email</span> <span>${order.email}</span></div>
        <h4 style="margin: 15px 0 5px;">Комментарий</h4>
        <p style="font-weight: 400; font-size: 14px;">${order.comment || 'Нет комментария'}</p>
        <h4 style="margin: 15px 0 5px;">Состав заказа</h4>
        ${dishesHtml}
        <div class="view-row" style="margin-top: 15px; font-weight: 700;">
            <span>Стоимость:</span> <span>${total}₽</span>
        </div>
    `;

    modal.style.display = 'flex';
}

function openEdit(orderId) {
    const order = ordersData.find(o => o.id === orderId);
    if (!order) return;

    document.getElementById('edit-id').value = order.id;
    document.getElementById('edit-name').value = order.full_name;
    document.getElementById('edit-address').value = order.delivery_address;
    document.getElementById('edit-phone').value = order.phone;
    document.getElementById('edit-email').value = order.email;
    document.getElementById('edit-comment').value = order.comment || '';
    
    const radioNow = document.querySelector('input[name="edit-delivery_type"][value="now"]');
    const radioTime = document.querySelector('input[name="edit-delivery_type"][value="by_time"]');
    const timeInput = document.getElementById('edit-time');

    if (order.delivery_type === 'by_time') {
        radioTime.checked = true;
        timeInput.disabled = false;
        timeInput.value = order.delivery_time || '';
    } else {
        radioNow.checked = true;
        timeInput.disabled = true;
        timeInput.value = '';
    }

    document.querySelectorAll('input[name="edit-delivery_type"]').forEach(radio => {
        radio.onchange = () => {
            if (radioTime.checked) {
                timeInput.disabled = false;
            } else {
                timeInput.disabled = true;
                timeInput.value = '';
            }
        };
    });

    document.getElementById('modal-edit').style.display = 'flex';
}

async function saveEdit() {
    const id = Number(document.getElementById('edit-id').value);
    const type = document.querySelector('input[name="edit-delivery_type"]:checked').value;
    const time = document.getElementById('edit-time').value;

    if (type === 'by_time' && !time) {
        alert('Укажите время доставки');
        return;
    }

    const updatedData = {
        full_name: document.getElementById('edit-name').value,
        email: document.getElementById('edit-email').value,
        phone: document.getElementById('edit-phone').value,
        delivery_address: document.getElementById('edit-address').value,
        delivery_type: type,
        delivery_time: type === 'by_time' ? time : null,
        comment: document.getElementById('edit-comment').value
    };

    try {
        // Если это демо-заказ (id > 1000), кидаем ошибку, чтобы сработал catch
        if (id >= 1000) throw new Error("Локальный режим");

        const res = await fetch(`${BASE_URL}/orders/${id}?api_key=${API_KEY}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedData)
        });

        if (!res.ok) throw new Error('Ошибка сервера');
        alert('Заказ успешно изменён');
        
    } catch (err) {
        // Сохраняем изменения локально в памяти браузера
        const idx = ordersData.findIndex(o => o.id === id);
        if (idx !== -1) {
            ordersData[idx] = { ...ordersData[idx], ...updatedData };
        }
        alert('Заказ изменён (локальный режим)');
    }

    closeModal('modal-edit');
    renderTable();
}

function openDelete(orderId) {
    orderToDelete = orderId;
    document.getElementById('modal-delete').style.display = 'flex';
}

async function confirmDelete() {
    if (!orderToDelete) return;

    try {
        if (orderToDelete >= 1000) throw new Error("Локальный режим");

        const res = await fetch(`${BASE_URL}/orders/${orderToDelete}?api_key=${API_KEY}`, {
            method: 'DELETE'
        });

        if (!res.ok) throw new Error('Ошибка сервера');
        alert('Заказ успешно удалён');
        
    } catch (err) {
        alert('Заказ удалён (локальный режим)');
    }

    ordersData = ordersData.filter(o => o.id !== orderToDelete);
    orderToDelete = null;
    closeModal('modal-delete');
    renderTable();
}

document.addEventListener('DOMContentLoaded', loadData);
