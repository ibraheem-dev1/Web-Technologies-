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

/**
 * SLICK SLIDER — CAROUSEL LOGIC
 * ==============================
 * Uses jQuery + Slick Slider (loaded via CDN).
 * Applied ONLY to #offers_slider (first .category_items section).
 */
$(document).ready(function () {

    var $slider = $('#offers_slider');

    // ---- 1. Initialize Slick ----
    $slider.slick({
        infinite: true,          // Infinite looping
        slidesToShow: 3,         // Desktop: 3 items
        slidesToScroll: 1,
        speed: 400,              // Faster slide transition
        autoplay: false,         // Disabled native autoplay for CUSTOM implementation
        arrows: false,           // We use external buttons instead
        dots: false,
        responsive: [
            {
                breakpoint: 1024,    // Tablet and below
                settings: {
                    slidesToShow: 2
                }
            },
            {
                breakpoint: 600,     // Mobile
                settings: {
                    slidesToShow: 1
                }
            }
        ]
    });

    // ---- 2. External Prev / Next buttons ----
    $('#slider_prev').on('click', function () {
        $slider.slick('slickPrev');
    });

    $('#slider_next').on('click', function () {
        $slider.slick('slickNext');
    });

    // ---- 3. Custom Autoplay & Pause on Hover ----
    var autoplayTimer;

    function startCustomAutoplay() {
        autoplayTimer = setInterval(function() {
            $slider.slick('slickNext');
        }, 5000); // Wait 5 seconds between slides
    }

    function stopCustomAutoplay() {
        clearInterval(autoplayTimer);
    }

    // Start auto-scroll initially
    startCustomAutoplay();

    // Pause on hover
    $slider.on('mouseenter', function() {
        stopCustomAutoplay();
    });

    // Resume auto-scroll when mouse leaves
    $slider.on('mouseleave', function() {
        startCustomAutoplay();
    });

    // ---- 4. Slide counter ("Showing X of Y") ----
    var totalSlides = $slider.slick('getSlick').slideCount;

    function updateCounter(slick, currentSlide) {
        // currentSlide is 0-indexed; display as 1-indexed
        var showing = (currentSlide || 0) + 1;
        $('#slide_counter').text('Showing ' + showing + ' of ' + totalSlides);
    }

    // Set initial counter text
    updateCounter(null, 0);

    // Update on every slide change
    $slider.on('afterChange', function (event, slick, currentSlide) {
        updateCounter(slick, currentSlide);
    });

});
