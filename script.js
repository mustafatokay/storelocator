'use strict';

class Store {
  date = new Date();
  id = (Date.now() + '').slice(-10);

  constructor(coords, title, address) {
    this.coords = coords;
    this.title = title;
    this.address = address;
  }
}

class Greengrocery extends Store {
  type = 'greengrocery';
  constructor(coords, title, address, greengroceries) {
    super(coords, title, address);
    this.greengroceries = greengroceries;
  }
}

class Butcher extends Store {
  type = 'butcher';
  constructor(coords, title, address, meats) {
    super(coords, title, address);
    this.meats = meats;
  }
}

// **********APPLICATION ARCHITECTURE********** \\

const form = document.querySelector('.form');
const containerStores = document.querySelector('.stores');
const inputType = document.querySelector('.form__input--type');
const inputTitle = document.querySelector('.form__input--title');
const inputAddress = document.querySelector('.form__input--address');
const inputGreengroceries = document.querySelector(
  '.form__input--greengroceries'
);
const inputMeats = document.querySelector('.form__input--meats');

class App {
  #map;
  #mapZoom = 13;
  #mapEvent;
  #stores = [];

  constructor() {
    // To get users position
    this._getPosition();

    // To get data from the local storage
    this._getLocalStorage();

    // To attach event handlers
    form.addEventListener('submit', this._newStore.bind(this));
    inputType.addEventListener('change', this._toggleProductsField);
    containerStores.addEventListener('click', this._moveToPopup.bind(this));
    containerStores.addEventListener(
      'contextmenu',
      this._deleteStore.bind(this)
    );
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('We are unable to get your position !');
        }
      );
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;

    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Handling clicks on map
    this.#map.on('click', this._showForm.bind(this));

    this.#stores.forEach(str => {
      this._renderStoreMarker(str);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputTitle.focus();
  }

  _hideForm() {
    // Empty inputs
    inputTitle.value =
      inputAddress.value =
      inputGreengroceries.value =
      inputMeats.value =
        '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleProductsField() {
    inputGreengroceries
      .closest('.form__row')
      .classList.toggle('form__row--hidden');
    inputMeats.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newStore(e) {
    e.preventDefault();

    //Get data from form
    const type = inputType.value;
    const address = inputAddress.value;
    const title = inputTitle.value;
    const { lat, lng } = this.#mapEvent.latlng;

    let store;

    // Create store object according to its type
    if (type === 'greengrocery') {
      const greengroceries = inputGreengroceries.value;
      store = new Greengrocery([lat, lng], title, address, greengroceries);
    } else if (type === 'butcher') {
      const meats = inputMeats.value;
      store = new Butcher([lat, lng], title, address, meats);
    }

    if (this._isEmpty(title)) {
      return alert('Title can not be empty !');
    }

    if (this._isEmpty(address)) {
      return alert('Address can not be empty !');
    }

    // Check if the data is valid
    if (title.length > 20)
      return alert('Maximum 20 characters allowed for the title input!');

    // Add new object to store array
    this.#stores.push(store);
    // console.log(store);

    // Render store on map as marker
    this._renderStoreMarker(store);

    // Render store on the list
    this._renderStore(store);

    // Hide form & clear input fields
    this._hideForm();

    // Set local storage to all stores
    this._setLocalStorage();
  }
  // To render store marker on the map
  _renderStoreMarker(store) {
    L.marker(store.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${store.type}-popup`,
        })
      )
      .setPopupContent(
        `<h3>${store.title}</h3> <br>🏠${store.address}<br><br>${
          store.type === 'greengrocery'
            ? '🥦' + store.greengroceries
            : '🥩' + store.meats
        }`
      )
      .openPopup();
  }

  // To render store with type
  _renderStore(store) {
    let html = `
    <li class="store store--${store.type}" data-id="${store.id}">
      <h3 class="store__title">${store.title}</h3>
      <div class="store__details">
        <span class="store__icon">🏠</span>
        <span class="store__value">${store.address}</span>
        <span class="store__unit"></span>
      </div>
        `;

    if (store.type === 'greengrocery')
      html += `
        <div class="store__details">
          <span class="store__icon">🥦</span>
          <span class="store__value">${store.greengroceries}</span>
          <span class="store__unit"></span>
        </div>
      </li>`;

    if (store.type === 'butcher')
      html += `
        <div class="store__details">
          <span class="store__icon">🥩</span>
          <span class="store__value">${store.meats}</span>
          <span class="store__unit"></span>
        </div>
      </li>`;

    form.insertAdjacentHTML('afterend', html);
  }

  // To move clicked store on the left menu
  _moveToPopup(e) {
    if (!this.#map) return;

    const storeEl = e.target.closest('.store');

    if (!storeEl) return;

    console.log(storeEl);

    const store = this.#stores.find(str => str.id === storeEl.dataset.id);

    this.#map.setView(store.coords, this.#mapZoom, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  _deleteStore(param) {
    param.preventDefault();

    if (!this.#map) return;

    const storeElement = param.target.closest('.store');

    if (!storeElement) return;

    // console.log(storeElement.dataset.id);

    let id = storeElement.dataset.id;

    for (let i = 0; i < this.#stores.length; i++) {
      if (this.#stores[i].id == id) {
        // console.log(storage[i].id);
        this.#stores = this.#stores.filter(e => {
          return e.id != id;
        });
      }
    }

    // console.log(this.#stores);

    this._setLocalStorage();

    this._getLocalStorage();

    location.reload();
  }

  _setLocalStorage() {
    localStorage.setItem('stores', JSON.stringify(this.#stores));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('stores'));
    // console.log(data);

    if (!data) return;

    this.#stores = data;

    this.#stores.forEach(str => {
      this._renderStore(str);
    });
  }

  // To check if the value is null
  _isEmpty(x) {
    return x.length === 0;
  }

  // To reset all the data, can be used in console only
  reset() {
    localStorage.removeItem('stores');
    location.reload();
  }
}

const app = new App();
