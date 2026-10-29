const API_KEY = 'КЛЮЧ';
const BASE_URL = 'https://edu.std-900.ist.mospolytech.ru/labs/api';

let dishes = [];
let selected = {
    soup: null,
    main: null,
    salad: null,
    drink: null,
    dessert: null
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
        if (!API_KEY || API_KEY === 'КЛЮЧ') throw new Error("Нет ключа");

        const response = await fetch(`${BASE_URL}/dishes`);
        if (!response.ok) throw new Error("Сервер не отвечает");
        
        dishes = await response.json();
        
    } catch (error) {
        console.warn('Сервер Мосполитеха недоступен. Загружаем демо-блюда с DummyJSON.');
        
        try {
            //демо данные
            const demoResponse = await fetch('https://dummyjson.com/recipes?limit=15');
            const demoData = await demoResponse.json();
            const categories = ['soup', 'main', 'salad', 'drink', 'dessert'];
            
            dishes = demoData.recipes.map((recipe, index) => {
                return {
                    id: 9000 + index, // Отдельные ID, чтобы не пересекаться с сервером
                    keyword: `demo-${index}`,
                    name: recipe.name,
                    price: Math.floor(Math.random() * 300) + 150,
                    category: categories[index % categories.length], // Раскидываем по категориям
                    count: `${recipe.servings * 100} г`,
                    image: recipe.image
                };
            });
            
            const mainContainer = document.querySelector('main');
            if (!document.getElementById('demo-warning')) {
                const warning = document.createElement('div');
                warning.id = 'demo-warning';
                warning.style.cssText = "background: #fff3e0; color: #d35400; padding: 10px 20px; text-align: center; font-weight: 600; font-size: 14px; border-radius: 8px; margin: 0 auto 20px; max-width: 800px;";
                warning.textContent = "⚠️ Сервер временно недоступен. Меню загружено с публичного демо-API.";
                mainContainer.prepend(warning);
            }

        } catch (demoErr) {
            alert('Не удалось загрузить меню (сервер и демо-API недоступны).');
            return;
        }
    }

    restoreSelectionFromCart();
    renderDishes();
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

function renderDishes() {
    const containers = {
        soup: document.getElementById('soup-container'),
        main: document.getElementById('main-container'),
        salad: document.getElementById('salad-container'),
        drink: document.getElementById('drink-container'),
        dessert: document.getElementById('dessert-container')
    };

    Object.values(containers).forEach(c => { if (c) c.innerHTML = ''; });

    const sortedDishes = [...dishes].sort((a, b) => a.name.localeCompare(b.name, 'ru'));

    sortedDishes.forEach(dish => {
        const container = containers[dish.category];
        if (!container) return;

        const isSelected = selected[dish.category]?.id === dish.id;

        const card = document.createElement('div');
        card.className = `dish ${isSelected ? 'selected' : ''}`;
        card.setAttribute('data-dish', dish.id);

        card.innerHTML = `
            <img src="${dish.image}" alt="${dish.name}" style="height: 200px; object-fit: cover;">
            <p class="price">${dish.price}₽</p>
            <p class="name">${dish.name}</p>
            <p class="weight">${dish.count}</p>
            <button type="button">${isSelected ? 'Удалить' : 'Добавить'}</button>
        `;

        card.querySelector('button').addEventListener('click', () => toggleDish(dish.id, dish.category));
        container.appendChild(card);
    });

    updatePanel();
}

function toggleDish(dishId, category) {
    const cart = getCart();

    if (cart[category] === dishId) {
        delete cart[category];
        selected[category] = null;
    } else {
        cart[category] = dishId;
        selected[category] = dishes.find(d => d.id === dishId);
    }

    saveCart(cart);
    renderDishes();
}

function updatePanel() {
    const panel = document.getElementById('checkout-panel');
    const totalSpan = document.getElementById('panel-total');
    const link = document.getElementById('checkout-link');
    
    let hasAny = false;
    let totalPrice = 0;

    for (const cat in selected) {
        if (selected[cat]) {
            hasAny = true;
            totalPrice += selected[cat].price;
        }
    }

    if (!hasAny) {
        panel.style.display = 'none';
        return;
    }

    panel.style.display = 'block';
    totalSpan.textContent = totalPrice;

    const error = validateLunch();
    if (error) {
        link.classList.add('disabled');
        link.removeAttribute('href');
        link.title = error;
    } else {
        link.classList.remove('disabled');
        link.setAttribute('href', 'order.html');
        link.removeAttribute('title');
    }
}

function validateLunch() {
    const hasSoup = !!selected.soup;
    const hasMain = !!selected.main;
    const hasSalad = !!selected.salad;
    const hasDrink = !!selected.drink;

    const anything = hasSoup || hasMain || hasSalad || hasDrink;
    if (!anything) return 'Ничего не выбрано';

    if (!hasSoup && !hasMain && !hasSalad) return 'Выберите главное блюдо';
    if (hasSalad && !hasSoup && !hasMain) return 'Выберите суп или главное блюдо';
    if (hasSoup && !hasMain && !hasSalad) return 'Выберите главное блюдо/салат/стартер';
    if (!hasDrink) return 'Выберите напиток';

    return null;
}

document.addEventListener('DOMContentLoaded', loadDishes);
