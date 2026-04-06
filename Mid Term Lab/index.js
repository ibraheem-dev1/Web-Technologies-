/**
 * HAMBURGER MENU LOGIC
 * ====================
 * 
 * 1. We find the hamburger button (menu_toggle)
 * 2. We find the navigation links box (nav_bar)
 * 3. We tell the browser: "When someone clicks the button, 
 *    ADD or REMOVE the 'show_menu' class from the nav_bar."
 */

// Step 1: Select elements from the HTML
const menuToggle = document.getElementById('menu_toggle');
const navBar = document.querySelector('.nav_bar');

// Step 2: Add the "Click" listener
menuToggle.addEventListener('click', () => {
    
    // Step 3: Toggle the class
    // If 'show_menu' is there, it removes it.
    // If it's NOT there, it adds it.
    navBar.classList.toggle('show_menu');

    console.log('Menu button clicked!');
});
