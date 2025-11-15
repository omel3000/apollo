// project-colors.js - Wspólna paleta kolorów dla projektów w całej aplikacji

/**
 * Generuje spójny kolor dla projektu na podstawie ID
 * @param {number|null} projectId - ID projektu (null dla nieobecności)
 * @returns {string} Kolor w formacie hex
 */
function getProjectColor(projectId) {
  // Fioletowy dla nieobecności (urlop/L4/inne)
  if (!projectId) {
    return '#8b5cf6';
  }
  
  // Paleta kolorów dla projektów (ciepłe, czytelne kolory)
  const PROJECT_COLORS = [
    '#2e7d32', // Zielony
    '#1976d2', // Niebieski
    '#d32f2f', // Czerwony
    '#f57c00', // Pomarańczowy
    '#7b1fa2', // Fioletowy
    '#0097a7', // Cyjan
    '#c2185b', // Różowy
    '#5d4037', // Brązowy
    '#616161', // Szary
    '#00796b', // Morski
    '#e64a19', // Głęboka pomarańcza
    '#303f9f'  // Indygo
  ];
  
  return PROJECT_COLORS[projectId % PROJECT_COLORS.length];
}

/**
 * Zwraca całą paletę kolorów projektów
 * @returns {string[]} Tablica kolorów hex
 */
function getProjectColorPalette() {
  return [
    '#2e7d32',
    '#1976d2',
    '#d32f2f',
    '#f57c00',
    '#7b1fa2',
    '#0097a7',
    '#c2185b',
    '#5d4037',
    '#616161',
    '#00796b',
    '#e64a19',
    '#303f9f'
  ];
}

/**
 * Zwraca kolor dla nieobecności (urlop/L4/inne)
 * @returns {string} Kolor w formacie hex
 */
function getAbsenceColor() {
  return '#8b5cf6';
}
