const API_KEY = 'ТВОЙ_UUID_КЛЮЧ_ЗДЕСЬ';
const BASE_URL = 'https://edu.std-900.ist.mospolytech.ru/labs/api';

let dishes = [];
let selected = {
    soup: null,
    main: null,
    salad: null,
    drink: null,
    dessert: null
};

const categoryNames = {
    soup: 'Суп',
    main: 'Главное блюдо',
    salad: 'Салат/стартер',
    drink: 'Напиток',
    dessert: 'Десерт'
};

const emptyTexts = {
    soup: 'Не выбран',
    main: 'Не выбрано',
    salad: 'Не выбран',
    drink: 'Не выбран',
    dessert: 'Не выбран'
};

function getCart() {
    const cart = localStorage.getItem('cart');
    return cart ? JSON.parse(cart) : {};
}

function saveCart(cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
}

async function loadDishes() {
    try {
        const response = await fetch(`${BASE_URL}/dishes`);
        dishes = await response.json();
        restoreSelectionFromCart();
        renderComposition();
        renderSummary();
        setupForm();
    } catch (error) {
        console.error('Ошибка загрузки блюд:', error);
    }
}

function restoreSelectionFromCart() {
    const cart = getCart();
    for (const category in cart) {
        const dishId = cart[category];
        const foundDish = dishes.find(d => d.id === dishId);
        if (foundDish) {
            selected[category] = foundDish;
        }
    }
}

function renderComposition() {
    const container = document.getElementById('order-composition');
    const emptyMsg = document.getElementById('empty-cart-message');
    container.innerHTML = '';

    const hasAny = Object.values(selected).some(val => val !== null);

    if (!hasAny) {
        emptyMsg.style.display = 'block';
        return;
    }

    emptyMsg.style.display = 'none';

    ['soup', 'main', 'salad', 'drink', 'dessert'].forEach(cat => {
        const dish = selected[cat];
        if (!dish) return;

        const card = document.createElement('div');
        card.className = 'dish';
        card.setAttribute('data-dish', dish.id);

        card.innerHTML = `
            <img src="${dish.image}" alt="${dish.name}">
            <p class="price">${dish.price}₽</p>
            <p class="name">${dish.name}</p>
            <p class="weight">${dish.count}</p>
            <button type="button">Удалить</button>
        `;

        card.querySelector('button').addEventListener('click', () => removeDish(dish.id, cat));
        container.appendChild(card);
    });
}

function removeDish(dishId, category) {
    const cart = getCart();
    delete cart[category];
    saveCart(cart);
    selected[category] = null;
    
    renderComposition();
    renderSummary();
    checkFormValidity();
}

function renderSummary() {
    const summary = document.getElementById('order-summary');
    let html = '';
    let total = 0;
    let hasAny = false;

    ['soup', 'main', 'salad', 'drink', 'dessert'].forEach(cat => {
        const dish = selected[cat];
        html += `<div class="order-category">`;
        html += `<p class="order-category-title">${categoryNames[cat]}</p>`;

        if (dish) {
            hasAny = true;
            html += `<p class="order-dish">${dish.name} ${dish.price}₽</p>`;
            total += dish.price;
        } else {
            html += `<p class="order-dish empty">${emptyTexts[cat]}</p>`;
        }
        html += `</div>`;
    });

    if (hasAny) {
        html += `<div class="order-total">`;
        html += `<p class="order-category-title">Стоимость заказа</p>`;
        html += `<p class="order-total-price">${total}₽</p>`;
        html += `</div>`;
    } else {
        html = '<p class="order-empty">Ничего не выбрано</p>';
    }

    summary.innerHTML = html;
}

function setupForm() {
    const form = document.getElementById('checkout-form');
    const deliveryTime = document.getElementById('delivery-time');
    const radioFast = document.querySelector('input[name="delivery_type"][value="now"]');
    const radioTime = document.querySelector('input[name="delivery_type"][value="by_time"]');

    function syncDeliveryTime() {
        if (radioTime.checked) {
            deliveryTime.disabled = false;
        } else {
            deliveryTime.disabled = true;
            deliveryTime.value = '';
        }
    }

    radioFast.addEventListener('change', syncDeliveryTime);
    radioTime.addEventListener('change', syncDeliveryTime);
    syncDeliveryTime();

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const error = validateLunch();
        if (error) {
            alert(error);
            return;
        }

        const formData = new FormData(form);
        
        // Формируем объект для отправки
        const orderData = {
            full_name: formData.get('name'),
            email: formData.get('email'),
            subscribe: formData.get('subscribe') ? 1 : 0,
            phone: formData.get('phone'),
            delivery_address: formData.get('delivery_address'),
            delivery_type: formData.get('delivery_type'),
            comment: formData.get('comment') || "",
            soup_id: selected.soup ? selected.soup.id : null,
            main_course_id: selected.main ? selected.main.id : null,
            salad_id: selected.salad ? selected.salad.id : null,
            drink_id: selected.drink ? selected.drink.id : null,
            dessert_id: selected.dessert ? selected.dessert.id : null,
        };

        if (orderData.delivery_type === 'by_time') {
            orderData.delivery_time = formData.get('delivery_time');
        }

        try {
            const response = await fetch(`${BASE_URL}/orders?api_key=${API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(orderData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Ошибка сервера');
            }

            // Успех!
            localStorage.removeItem('cart');
            alert('Заказ успешно оформлен!');
            window.location.href = 'index.html';

        } catch (err) {
            alert('Ошибка при отправке заказа: ' + err.message);
        }
    });
}

function validateLunch() {
    const hasSoup = !!selected.soup;
    const hasMain = !!selected.main;
    const hasSalad = !!selected.salad;
    const hasDrink = !!selected.drink;

    const anything = hasSoup || hasMain || hasSalad || hasDrink;
    if (!anything) return 'Ничего не выбрано. Выберите блюда для заказа';

    if (!hasSoup && !hasMain && !hasSalad) return 'Выберите главное блюдо';
    if (hasSalad && !hasSoup && !hasMain) return 'Выберите суп или главное блюдо';
    if (hasSoup && !hasMain && !hasSalad) return 'Выберите главное блюдо/салат/стартер';
    if (!hasDrink) return 'Выберите напиток';

    return null;
}

document.addEventListener('DOMContentLoaded', loadDishes);