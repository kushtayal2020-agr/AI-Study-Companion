// Shared theme toggle logic
const applyTheme = (isLight) => {
    document.body.classList.toggle('light', isLight);
    document.querySelectorAll('.theme-toggle').forEach((btn) => {
        const icon = btn.querySelector('i');
        if (icon) icon.className = isLight ? 'fas fa-moon' : 'fas fa-sun';
        btn.setAttribute('aria-label', isLight ? 'Switch to dark mode' : 'Switch to light mode');
    });
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
};

const initializeTheme = () => {
    const saved = localStorage.getItem('theme');
    const useLight = saved === 'light';
    applyTheme(useLight);

    document.querySelectorAll('.theme-toggle').forEach((btn) => {
        btn.addEventListener('click', () => {
            const activeLight = document.body.classList.contains('light');
            applyTheme(!activeLight);
        });
    });
};

window.addEventListener('DOMContentLoaded', initializeTheme);
