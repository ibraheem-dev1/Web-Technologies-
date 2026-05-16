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

    if ($slider.length === 0) {
        return;
    }

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

/**
 * AJAX ADD TO CART
 * ===============
 */
function updateCartBadge(count) {
    const cartLink = document.querySelector('.action_bar a[href="/cart"]');
    if (!cartLink) return;

    let badge = cartLink.querySelector('.cart_badge');
    if (!count || count <= 0) {
        if (badge) badge.remove();
        return;
    }

    if (!badge) {
        badge = document.createElement('span');
        badge.className = 'cart_badge';
        cartLink.insertBefore(badge, cartLink.querySelector('.action_name'));
    }

    badge.textContent = String(count);
}

document.querySelectorAll('.add_to_cart_form').forEach((form) => {
    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const button = form.querySelector('.add_to_cart');
        const originalText = button ? button.textContent : '';
        if (button) {
            button.disabled = true;
            button.textContent = 'ADDING...';
        }

        try {
            const formData = new FormData(form);
            const body = new URLSearchParams(formData);
            const response = await fetch(form.action, {
                method: 'POST',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                },
                body
            });

            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                throw new Error('Unexpected server response. Please refresh and try again.');
            }

            const data = await response.json();

            if (!response.ok || !data.ok) {
                throw new Error(data.message || 'Unable to add item.');
            }

            updateCartBadge(data.cartCount || 0);
            if (button) {
                button.textContent = 'ADDED';
            }
        } catch (err) {
            window.alert(err.message || 'Unable to add item.');
        } finally {
            if (button) {
                setTimeout(() => {
                    button.textContent = originalText;
                    button.disabled = false;
                }, 700);
            }
        }
    });
});

document.querySelectorAll('.qty_control').forEach((control) => {
    const input = control.querySelector('.qty_input');
    if (!input) return;

    const min = parseInt(input.min, 10) || 1;
    const max = parseInt(input.max, 10) || Number.POSITIVE_INFINITY;

    control.querySelectorAll('.qty_btn').forEach((btn) => {
        const action = btn.dataset.action;
        if (!action) return;

        btn.addEventListener('click', () => {
            if (input.disabled || input.readOnly) return;
            let current = parseInt(input.value, 10) || min;
            if (action === 'increase') {
                current = Math.min(current + 1, max);
            }
            if (action === 'decrease') {
                current = Math.max(current - 1, min);
            }
            input.value = String(current);
        });
    });
});

document.querySelectorAll('.cart_qty_form').forEach((form) => {
    form.addEventListener('click', async (event) => {
        const button = event.target.closest('.qty_btn');
        if (!button) return;
        event.preventDefault();

        const delta = button.dataset.delta;
        if (!delta) return;

        button.disabled = true;
        const payload = new URLSearchParams();
        payload.set('productId', form.querySelector('input[name="productId"]').value);
        payload.set('delta', delta);

        try {
            const response = await fetch(form.action, {
                method: 'POST',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                },
                body: payload
            });
            const data = await response.json();

            if (!response.ok || !data.ok) {
                throw new Error(data.message || 'Unable to update cart.');
            }

            const qtyInput = form.querySelector('.qty_input');
            const linePrice = form.closest('.cart_item').querySelector('[data-line-total]');
            const unitPrice = parseFloat(form.dataset.price);
            if (qtyInput) {
                qtyInput.value = String(data.qty || 0);
            }
            if (linePrice && Number.isFinite(unitPrice)) {
                linePrice.textContent = `Rs. ${unitPrice * (data.qty || 0)}`;
            }

            const totalEl = document.querySelector('[data-cart-total]');
            if (totalEl && data.cartCount !== undefined) {
                let total = 0;
                document.querySelectorAll('[data-line-total]').forEach((node) => {
                    const amount = parseFloat(node.textContent.replace('Rs.', '').trim()) || 0;
                    total += amount;
                });
                totalEl.textContent = `Rs. ${total}`;
            }

            updateCartBadge(data.cartCount || 0);

            if (data.qty <= 0) {
                form.closest('.cart_item').remove();
                const itemsLeft = document.querySelectorAll('.cart_item').length;
                if (itemsLeft === 0) {
                    window.location.reload();
                }
            }
        } catch (err) {
            window.alert(err.message || 'Unable to update cart.');
        } finally {
            button.disabled = false;
        }
    });
});
