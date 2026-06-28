// 1. Wait for the DOM to fully load
document.addEventListener('DOMContentLoaded', () => {
    
    // --- Smooth Scroll for "Get Started" Button ---
    const getStartedBtn = document.getElementById('get-started');
    const featuresSection = document.querySelector('.features-section');

    if (getStartedBtn) {
        getStartedBtn.addEventListener('click', () => {
            featuresSection.scrollIntoView({ behavior: 'smooth' });
            console.log("Scrolling to features...");
        });
    }

    // --- Dynamic Greeting Based on Time ---
    const heroTitle = document.querySelector('.typing');
    const hours = new Date().getHours();
    let greeting;

    if (hours < 12) greeting = "Good Morning, Student!";
    else if (hours < 18) greeting = "Good Afternoon, Scholar!";
    else greeting = "Happy Late-Night Studying!";

    // Update the text in your hero section
    if (heroTitle) {
        heroTitle.textContent = greeting;
    }
});