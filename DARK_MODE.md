# Dark Mode Implementation

## Overview
Il dark mode è stato implementato usando le CSS custom properties e la classe `dark` di Tailwind CSS.

## Features

### 1. Theme Variables (globals.css)
```css
:root {
  /* Light Mode */
  --bg-primary: #ffffff;
  --bg-secondary: #f9fafb;
  --text-primary: #111827;
  --text-secondary: #6b7280;
  --border-color: #e5e7eb;
}

:root.dark {
  /* Dark Mode */
  --bg-primary: #000000;
  --bg-secondary: #0a0a0a;
  --text-primary: #ffffff;
  --text-secondary: #9ca3af;
  --border-color: #1f2937;
}
```

### 2. Custom Hook (useDarkMode.ts)
Hook personalizzato che gestisce:
- State del dark mode
- Persistenza in localStorage
- Applicazione della classe `dark` al root element

```typescript
const { isDark, toggleDarkMode } = useDarkMode();
```

### 3. DarkModeToggle Component
Componente toggle button con icone Lucide:
- Sun icon per light mode
- Moon icon per dark mode
- Posizionato nell'AdminHeader

## Usage

### Come attivare il Dark Mode
1. Cliccare sul toggle button (luna/sole) nell'header della dashboard admin
2. La preferenza viene salvata in localStorage
3. Il tema persiste tra le sessioni del browser

### Come applicare dark mode ai componenti
Usare le classi Tailwind `dark:`:

```tsx
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
  Content
</div>
```

## Components Updated

### AdminHeader
- Sfondo: `bg-white dark:bg-gray-900`
- Testo: `text-gray-900 dark:text-white`
- Border: `border-gray-200 dark:border-gray-800`
- Include DarkModeToggle button

### AdminNav
- Sfondo: `bg-white dark:bg-gray-900`
- Link attivi: `text-primary dark:text-yellow-400`
- Link inattivi: `text-gray-700 dark:text-gray-300`
- Hover: `hover:text-gray-900 dark:hover:text-white`

### AdminLayout
- Background gradient: `from-primary/5 via-white to-secondary/5 dark:from-gray-900 dark:via-black dark:to-gray-900`

## Color Palette

### Light Mode
- Primary BG: White (#ffffff)
- Secondary BG: Light Gray (#f9fafb)
- Primary Text: Dark Gray (#111827)
- Secondary Text: Medium Gray (#6b7280)

### Dark Mode
- Primary BG: Black (#000000)
- Secondary BG: Near Black (#0a0a0a)
- Primary Text: White (#ffffff)
- Secondary Text: Light Gray (#9ca3af)

## Best Practices

1. **Sempre fornire variante dark**: Per ogni colore usato, specificare la variante dark
   ```tsx
   className="bg-white dark:bg-gray-900"
   ```

2. **Testare contrast ratio**: Assicurarsi che il testo sia leggibile in entrambe le modalità

3. **Usare variabili CSS**: Per colori custom, usare le CSS custom properties definite in globals.css

4. **Persistenza**: Il dark mode viene salvato automaticamente in localStorage

## Future Improvements

- [ ] Aggiungere supporto per system preference (`prefers-color-scheme`)
- [ ] Estendere il dark mode a tutti i componenti public
- [ ] Aggiungere transizioni smooth tra light e dark mode
- [ ] Creare utility class per colori custom nel dark mode
