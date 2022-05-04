'use strict';
import * as L from 'leaflet';
// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const x = 3;
///////////////////////////////////////////////////////
class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  constructor(coordinates, distance, duration) {
    this.coordinates = coordinates;
    this.distance = distance;
    this.duration = duration;
  }
  setTitle() {
    const workoutDate = new Intl.DateTimeFormat(navigator.language, {
      month: 'long',
      day: 'numeric',
    }).format(this.date);
    this.title = `${this.constructor.name} on ${workoutDate}`;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coordinates, distance, duration, cadence) {
    super(coordinates, distance, duration);
    this.cadence = cadence;
    this.#calcPace();
    this.setTitle();
  }

  #calcPace() {
    this.pace = Math.round((this.duration / this.distance) * 100) / 100;
  }
}
class Cycling extends Workout {
  type = 'cycling';
  constructor(coordinates, distance, duration, elevation) {
    super(coordinates, distance, duration);
    this.elevation = elevation;
    this.#calcSpeed();
    this.setTitle();
  }

  #calcSpeed() {
    this.speed = Math.round((this.distance / this.duration) * 100) / 100;
  }
}

class App {
  #map;
  #mapZoom = 13;
  #mapEvent;
  #workouts = [];

  constructor() {
    this.getLocationAndLoadMap();

    inputType.addEventListener('change', this._toggleElevetionField);
    form.addEventListener('submit', this._addNewWorkout.bind(this));
    containerWorkouts.addEventListener(
      'click',
      this.moveToWorkoutMarker.bind(this)
    );
  }
  async getLocationAndLoadMap() {
    try {
      const location = await this._getLocation();
      this._loadMap(location);
    } catch (error) {
      alert(error.message);
    }
  }

  get map() {
    return this.#map;
  }
  _getLocation() {
    return new Promise(function (resolve, reject) {
      navigator.geolocation.getCurrentPosition(resolve, () =>
        reject(new Error('Geolocation is not supported'))
      );
    });
  }
  _loadMap(location) {
    const { latitude, longitude } = location.coords;

    this.#map = L.map('map').setView([latitude, longitude], this.#mapZoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> Roy Zluf',
    }).addTo(this.#map);

    this.#map.on('click', this._showFormAndSetView.bind(this));

    this._getLocalStorage();
  }

  _showFormAndSetView(mapEvent) {
    const currentZoom = this.#map.getZoom();
    const zoomTo = this.#mapZoom < currentZoom ? currentZoom : this.#mapZoom;

    form.classList.remove('hidden');
    inputDistance.focus();
    this.#mapEvent = mapEvent;
    const coordinates = this._getMapEventCoords();
    this.#map.setView(coordinates, zoomTo);
  }

  _getMapEventCoords() {
    const { lat, lng } = this.#mapEvent.latlng;
    return [lat, lng];
  }
  _toggleElevetionField(event) {
    const cadenceFormRow = inputCadence.closest('.form__row');
    const elevationFormRow = inputElevation.closest('.form__row');
    cadenceFormRow.classList.toggle('form__row--hidden');
    elevationFormRow.classList.toggle('form__row--hidden');
  }

  _addNewWorkout(event) {
    const validInputs = (...inputs) => {
      return inputs.every(input => Number.isFinite(input));
    };
    const positiveInputs = (...inputs) => {
      return inputs.every(input => input > 0);
    };

    event.preventDefault();

    // Get data from form
    let inputs;
    let workout;
    const workoutType = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const cadence = +inputCadence.value;
    const elevation = +inputElevation.value;
    const coordinates = this._getMapEventCoords();

    // Create workout object
    if (workoutType === 'running') {
      inputs = [distance, duration, cadence];
      if (!(validInputs(...inputs) && positiveInputs(...inputs))) {
        return alert('All fields must be positive!');
      }
      workout = new Running(coordinates, distance, duration, cadence);
    }

    if (workoutType === 'cycling') {
      inputs = [distance, duration, elevation];
      if (!(validInputs(...inputs) && positiveInputs(...inputs))) {
        return alert('All fields must be positive!');
      }
      workout = new Cycling(coordinates, distance, duration, elevation);
    }

    // Add workout to workouts array
    this.#workouts.push(workout);

    //Render workout on map as marker
    this._renderWorkoutMarker(workout);

    // Render workout on the workouts list
    this._renderWorkout(workout);

    // Hide form + Clear input fields
    this._hideForm();

    //Store workout in local storage
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    const popupOptions = L.popup({
      maxWidth: 250,
      minWidth: 100,
      autoClose: false,
      closeOnClick: false,
      className: `${workout.type}-popup`,
    }).setContent(
      `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.title}`
    );

    L.marker(workout.coordinates)
      .addTo(this.#map)
      .bindPopup(popupOptions)
      .openPopup();
  }

  _renderWorkout(workout) {
    const emoji = workout.type === 'running' ? '🏃' : '🚴‍♀️';
    let html = `<li class="workout workout--${workout.type}" data-id="${workout.id}">
    <h2 class="workout__title">${workout.title}</h2>
    <div class="workout__details">
      <span class="workout__icon">${emoji}</span>
      <span class="workout__value">${workout.distance}</span>
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${workout.duration}</span>
      <span class="workout__unit">min</span>
    </div>`;

    if (workout.type === 'running') {
      html += ` <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.pace}</span>
      <span class="workout__unit">min/km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">🦶🏼</span>
      <span class="workout__value">${workout.cadence}</span>
      <span class="workout__unit">spm</span>
    </div>
  </li>`;
    }

    if (workout.type === 'cycling') {
      html += ` <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.speed}</span>
      <span class="workout__unit">min/km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">🦶🏼</span>
      <span class="workout__value">${workout.elevation}</span>
      <span class="workout__unit">spm</span>
    </div>
  </li>`;
    }
    form.insertAdjacentHTML('afterend', html);
  }
  _hideForm() {
    inputType.value = 'running';
    inputDistance.value = '';
    inputDuration.value = '';
    inputElevation.value = '';
    inputCadence.value = '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => {
      form.style.display = 'grid';
    }, 1000);
  }

  moveToWorkoutMarker(event) {
    const clickedWorkout = event.target.closest('.workout');
    if (clickedWorkout == null) return;
    const workout = this.#workouts.find(
      workout => workout.id === clickedWorkout.dataset.id
    );

    // Move to clicked workout marker
    this.#map.setView(workout.coordinates, this.#mapZoom, {
      zoom: { animate: true },
      pan: { duration: 1 },
    });
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    // Get data from local storage
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (data == null) return;

    // Update workouts array & set prototypes of running/cycling
    this.#workouts = data;
    this.#workouts.forEach(workout => {
      Object.setPrototypeOf(
        workout,
        workout.type === 'running' ? Running.prototype : Cycling.prototype
      );

      // Render workouts markers and workouts list
      this._renderWorkoutMarker(workout);
      this._renderWorkout(workout);
    });
  }
  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
