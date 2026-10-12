let dishes = [];

async function loadDishes() {
    const response = await fetch('https://edu.std-900.ist.mospolytech.ru/labs/api/dishes');
    const data = await response.json();
    dishes = data;
    renderDishes();
}

function renderDishes() {
    const containers = {
        soup: document.getElementById('soup-container'),
        main: document.getElementById('main-container'),
        salad: document.getElementById('salad-container'),
        drink: document.getElementById('drink-container'),
        dessert: document.getElementById('dessert-container')
    };

    Object.values(containers).forEach(c => {
        if (c) c.innerHTML = '';
    });

    const sortedDishes = [...dishes].sort((a, b) => a.name.localeCompare(b.name, 'ru'));

    sortedDishes.forEach(dish => {
        const container = containers[dish.category];
        if (!container) return;

        const card = document.createElement('div');
        card.className = 'dish';
        card.setAttribute('data-dish', dish.keyword);

        card.innerHTML = `
            <img src="${dish.image}" alt="${dish.name}">
            <p class="price">${dish.price}₽</p>
            <p class="name">${dish.name}</p>
            <p class="weight">${dish.count}</p>
            <button type="button">Добавить</button>
        `;

        card.querySelector('button').addEventListener('click', () => selectDish(dish.keyword));
        container.appendChild(card);
    });
}

const selected = {
    soup: null,
    main: null,
    salad: null,
    drink: null,
    dessert: null
};

const categoryNames = {
    soup: 'Суп',
    main: 'Главное блюдо',
    salad: 'Салат',
    drink: 'Напиток',
    dessert: 'Десерт'
};

const emptyTexts = {
    soup: 'Блюдо не выбрано',
    main: 'Блюдо не выбрано',
    salad: 'Блюдо не выбрано',
    drink: 'Напиток не выбран',
    dessert: 'Десерт не выбран'
};

function selectDish(keyword) {
    const dish = dishes.find(d => d.keyword === keyword);
    if (!dish) return;

    selected[dish.category] = dish;

    document.querySelectorAll('.dish').forEach(card => card.classList.remove('selected'));
    const card = document.querySelector(`.dish[data-dish="${keyword}"]`);
    if (card) card.classList.add('selected');

    document.getElementById('hidden-soup').value = selected.soup ? selected.soup.keyword : '';
    document.getElementById('hidden-main').value = selected.main ? selected.main.keyword : '';
    document.getElementById('hidden-salad').value = selected.salad ? selected.salad.keyword : '';
    document.getElementById('hidden-drink').value = selected.drink ? selected.drink.keyword : '';
    document.getElementById('hidden-dessert').value = selected.dessert ? selected.dessert.keyword : '';

    updateOrderSummary();
}

function updateOrderSummary() {
    const summary = document.getElementById('order-summary');
    const hasAny = selected.soup || selected.main || selected.salad || selected.drink || selected.dessert;

    if (!hasAny) {
        summary.innerHTML = '<p class="order-empty">Ничего не выбрано</p>';
        return;
    }

    let html = '';
    let total = 0;

    ['soup', 'main', 'salad', 'drink', 'dessert'].forEach(cat => {
        const dish = selected[cat];
        html += `<div class="order-category">`;
        html += `<p class="order-category-title">${categoryNames[cat]}</p>`;

        if (dish) {
            html += `<p class="order-dish">${dish.name} ${dish.price}₽</p>`;
            total += dish.price;
        } else {
            html += `<p class="order-dish empty">${emptyTexts[cat]}</p>`;
        }
        html += `</div>`;
    });

    if (total > 0) {
        html += `<div class="order-total">`;
        html += `<p class="order-category-title">Стоимость заказа</p>`;
        html += `<p class="order-total-price">${total}₽</p>`;
        html += `</div>`;
    }

    summary.innerHTML = html;
}

function validateLunch() {
    const hasSoup = !!selected.soup;
    const hasMain = !!selected.main;
    const hasSalad = !!selected.salad;
    const hasDrink = !!selected.drink;
    const hasDessert = !!selected.dessert;

    const anything = hasSoup || hasMain || hasSalad || hasDrink || hasDessert;

    if (!anything) {
        return 'Ничего не выбрано. Выберите блюда для заказа';
    }

    if (!hasSoup && !hasMain && !hasSalad) {
        return 'Выберите главное блюдо';
    }

    if (hasSalad && !hasSoup && !hasMain) {
        return 'Выберите суп или главное блюдо';
    }

    if (hasSoup && !hasMain && !hasSalad) {
        return 'Выберите главное блюдо/салат/стартер';
    }

    if (!hasDrink) {
        return 'Выберите напиток';
    }

    return null;
}

function showNotification(text) {
    const existing = document.querySelector('.notification-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'notification-overlay';

    const box = document.createElement('div');
    box.className = 'notification';

    const message = document.createElement('p');
    message.className = 'notification-text';
    message.textContent = text;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'notification-button';
    button.textContent = 'Окей 👌';
    button.addEventListener('click', () => overlay.remove());

    box.appendChild(message);
    box.appendChild(button);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('order-form');
    form.addEventListener('submit', (e) => {
        const error = validateLunch();
        if (error) {
            e.preventDefault();
            showNotification(error);
        }
    });

    const deliveryTime = document.getElementById('delivery-time');
    const radioFast = document.querySelector('input[name="delivery"][value="fast"]');
    const radioTime = document.querySelector('input[name="delivery"][value="time"]');

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

    loadDishes();
});
